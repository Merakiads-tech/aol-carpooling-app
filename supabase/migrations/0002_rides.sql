-- Book My Ride — Phase 2–5 schema: event locations, rides, requests, and the
-- SECURITY DEFINER RPCs that centralise gender/phone masking.

-- ---------- Enums ----------
do $$ begin
  create type public.ride_direction as enum ('to_event', 'from_event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ride_status as enum ('active', 'full', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'approved', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------- Tighten profiles visibility ----------
-- Cross-user profile data (name/photo/role and conditionally gender/phone) is
-- exposed ONLY through the masking RPCs below, never via a raw table read.
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

create or replace function public.caller_gender()
returns public.gender language sql stable security definer set search_path = public as $$
  select gender from public.profiles where id = auth.uid();
$$;

-- ---------- event_locations ----------
create table if not exists public.event_locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  address    text,
  lat        numeric,
  lng        numeric,
  maps_url   text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.event_locations enable row level security;

drop policy if exists "locations_select" on public.event_locations;
create policy "locations_select"
  on public.event_locations for select
  to authenticated
  using (is_active or public.is_admin());

drop policy if exists "locations_admin_write" on public.event_locations;
create policy "locations_admin_write"
  on public.event_locations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed the first event location (admin can edit coords/link precisely later).
insert into public.event_locations (name, address, lat, lng, maps_url)
select 'Hariwan Ashram', 'Tricity (Chandigarh region)', 30.7333, 76.7794,
       'https://www.google.com/maps/search/?api=1&query=Hariwan+Ashram'
where not exists (select 1 from public.event_locations);

-- ---------- rides ----------
create table if not exists public.rides (
  id                uuid primary key default gen_random_uuid(),
  driver_id         uuid not null references public.profiles (id) on delete cascade,
  event_location_id uuid not null references public.event_locations (id),
  direction         public.ride_direction not null,
  depart_date       date not null,
  depart_time       time not null,
  pickup_label      text not null,
  pickup_lat        numeric,
  pickup_lng        numeric,
  seats_total       int not null check (seats_total between 1 and 8),
  show_phone_public boolean not null default false,
  status            public.ride_status not null default 'active',
  paired_ride_id    uuid references public.rides (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists rides_feed_idx
  on public.rides (direction, depart_date, status);
create index if not exists rides_driver_idx on public.rides (driver_id);

drop trigger if exists trg_rides_updated_at on public.rides;
create trigger trg_rides_updated_at
  before update on public.rides
  for each row execute function public.set_updated_at();

alter table public.rides enable row level security;

-- Rides carry no PII, so authenticated users may read them; driver/phone/gender
-- are joined in only via the masking RPCs.
drop policy if exists "rides_select" on public.rides;
create policy "rides_select"
  on public.rides for select to authenticated using (true);

drop policy if exists "rides_insert_own" on public.rides;
create policy "rides_insert_own"
  on public.rides for insert to authenticated
  with check (auth.uid() = driver_id);

drop policy if exists "rides_update_own" on public.rides;
create policy "rides_update_own"
  on public.rides for update to authenticated
  using (auth.uid() = driver_id or public.is_admin())
  with check (auth.uid() = driver_id or public.is_admin());

-- ---------- ride_requests ----------
create table if not exists public.ride_requests (
  id         uuid primary key default gen_random_uuid(),
  ride_id    uuid not null references public.rides (id) on delete cascade,
  rider_id   uuid not null references public.profiles (id) on delete cascade,
  status     public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_ride_idx on public.ride_requests (ride_id);
create index if not exists requests_rider_idx on public.ride_requests (rider_id);
-- one active request per rider per ride
create unique index if not exists requests_active_uniq
  on public.ride_requests (ride_id, rider_id)
  where status in ('pending', 'approved');

drop trigger if exists trg_requests_updated_at on public.ride_requests;
create trigger trg_requests_updated_at
  before update on public.ride_requests
  for each row execute function public.set_updated_at();

alter table public.ride_requests enable row level security;

drop policy if exists "requests_select" on public.ride_requests;
create policy "requests_select"
  on public.ride_requests for select to authenticated
  using (
    rider_id = auth.uid()
    or exists (select 1 from public.rides r where r.id = ride_id and r.driver_id = auth.uid())
    or public.is_admin()
  );

-- Writes go through the SECURITY DEFINER functions below (they validate capacity
-- and ownership), so no direct insert/update policies are granted.

-- ========================================================================
-- Masking helpers used by the read RPCs
-- ========================================================================
create or replace function public.approved_count(p_ride_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.ride_requests
  where ride_id = p_ride_id and status = 'approved';
$$;

-- ========================================================================
-- Read RPCs (SECURITY DEFINER — apply gender/phone rules for the caller)
-- ========================================================================

-- Ride feed for the Browse screen.
create or replace function public.get_ride_feed(
  p_direction public.ride_direction,
  p_date date,
  p_women_only boolean default false
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_female boolean := (public.caller_gender() = 'female');
  v_women boolean := (p_women_only and v_female);
begin
  return coalesce((
    select jsonb_agg(card order by (card->>'depart_time'))
    from (
      select jsonb_build_object(
        'id', r.id,
        'direction', r.direction,
        'depart_date', r.depart_date,
        'depart_time', to_char(r.depart_time, 'HH24:MI'),
        'pickup_label', r.pickup_label,
        'pickup_lat', r.pickup_lat,
        'pickup_lng', r.pickup_lng,
        'seats_total', r.seats_total,
        'seats_filled', public.approved_count(r.id),
        'status', r.status,
        'is_full', (r.status = 'full' or public.approved_count(r.id) >= r.seats_total),
        'show_phone_public', r.show_phone_public,
        'event_location', jsonb_build_object('id', el.id, 'name', el.name),
        'driver', jsonb_build_object(
          'id', d.id,
          'name', d.full_name,
          'photo_url', d.photo_url,
          'role', d.role,
          'gender', case when v_female then d.gender else null end
        ),
        'driver_phone', case
          when r.show_phone_public then d.phone
          when exists (
            select 1 from public.ride_requests rq
            where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status = 'approved'
          ) then d.phone
          else null end,
        'my_request_status', (
          select rq.status from public.ride_requests rq
          where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status <> 'cancelled'
          order by rq.created_at desc limit 1
        )
      ) as card
      from public.rides r
      join public.profiles d on d.id = r.driver_id
      join public.event_locations el on el.id = r.event_location_id
      where r.direction = p_direction
        and r.depart_date = p_date
        and r.status in ('active', 'full')
        and r.driver_id <> v_uid
        and (not v_women or d.gender = 'female')
    ) t
  ), '[]'::jsonb);
end $$;

-- Single ride for the detail screen.
create or replace function public.get_ride_detail(p_ride_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_female boolean := (public.caller_gender() = 'female');
begin
  return (
    select jsonb_build_object(
      'id', r.id,
      'direction', r.direction,
      'depart_date', r.depart_date,
      'depart_time', to_char(r.depart_time, 'HH24:MI'),
      'pickup_label', r.pickup_label,
      'pickup_lat', r.pickup_lat,
      'pickup_lng', r.pickup_lng,
      'seats_total', r.seats_total,
      'seats_filled', public.approved_count(r.id),
      'status', r.status,
      'is_full', (r.status = 'full' or public.approved_count(r.id) >= r.seats_total),
      'is_mine', (r.driver_id = v_uid),
      'show_phone_public', r.show_phone_public,
      'event_location', jsonb_build_object('id', el.id, 'name', el.name, 'maps_url', el.maps_url),
      'driver', jsonb_build_object(
        'id', d.id, 'name', d.full_name, 'photo_url', d.photo_url, 'role', d.role,
        'gender', case when v_female then d.gender else null end
      ),
      'driver_phone', case
        when r.show_phone_public then d.phone
        when exists (
          select 1 from public.ride_requests rq
          where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status = 'approved'
        ) then d.phone
        else null end,
      'my_request_status', (
        select rq.status from public.ride_requests rq
        where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status <> 'cancelled'
        order by rq.created_at desc limit 1
      )
    )
    from public.rides r
    join public.profiles d on d.id = r.driver_id
    join public.event_locations el on el.id = r.event_location_id
    where r.id = p_ride_id
  );
end $$;

-- Rides I'm offering, with their requests (driver sees requester gender always;
-- requester phone only after approval).
create or replace function public.get_my_offered_rides()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  return coalesce((
    select jsonb_agg(obj order by (obj->>'depart_date'), (obj->>'depart_time'))
    from (
      select jsonb_build_object(
        'id', r.id,
        'direction', r.direction,
        'depart_date', r.depart_date,
        'depart_time', to_char(r.depart_time, 'HH24:MI'),
        'pickup_label', r.pickup_label,
        'seats_total', r.seats_total,
        'seats_filled', public.approved_count(r.id),
        'status', r.status,
        'show_phone_public', r.show_phone_public,
        'event_location', jsonb_build_object('id', el.id, 'name', el.name),
        'requests', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', rq.id,
            'status', rq.status,
            'created_at', rq.created_at,
            'rider', jsonb_build_object(
              'id', ri.id, 'name', ri.full_name, 'photo_url', ri.photo_url,
              'role', ri.role, 'gender', ri.gender
            ),
            'rider_phone', case when rq.status = 'approved' then ri.phone else null end
          ) order by rq.created_at)
          from public.ride_requests rq
          join public.profiles ri on ri.id = rq.rider_id
          where rq.ride_id = r.id and rq.status <> 'cancelled'
        ), '[]'::jsonb)
      ) as obj
      from public.rides r
      join public.event_locations el on el.id = r.event_location_id
      where r.driver_id = v_uid and r.status <> 'cancelled'
    ) t
  ), '[]'::jsonb);
end $$;

-- Rides I've requested (driver phone only after approval; gender per female rule).
create or replace function public.get_my_requests()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_female boolean := (public.caller_gender() = 'female');
begin
  return coalesce((
    select jsonb_agg(obj order by (obj->>'depart_date'), (obj->>'depart_time'))
    from (
      select jsonb_build_object(
        'request_id', rq.id,
        'status', rq.status,
        'depart_date', r.depart_date,
        'depart_time', to_char(r.depart_time, 'HH24:MI'),
        'direction', r.direction,
        'pickup_label', r.pickup_label,
        'seats_total', r.seats_total,
        'seats_filled', public.approved_count(r.id),
        'event_location', jsonb_build_object('id', el.id, 'name', el.name),
        'driver', jsonb_build_object(
          'id', d.id, 'name', d.full_name, 'photo_url', d.photo_url, 'role', d.role,
          'gender', case when v_female then d.gender else null end
        ),
        'driver_phone', case when rq.status = 'approved' then d.phone else null end
      ) as obj
      from public.ride_requests rq
      join public.rides r on r.id = rq.ride_id
      join public.profiles d on d.id = r.driver_id
      join public.event_locations el on el.id = r.event_location_id
      where rq.rider_id = v_uid and rq.status <> 'cancelled'
    ) t
  ), '[]'::jsonb);
end $$;

-- ========================================================================
-- Mutation RPCs (SECURITY DEFINER — validate ownership + capacity)
-- ========================================================================

create or replace function public.create_ride(
  p_event_location_id uuid,
  p_direction public.ride_direction,
  p_going_date date,
  p_going_time time,
  p_pickup_label text,
  p_pickup_lat numeric,
  p_pickup_lng numeric,
  p_seats int,
  p_show_phone boolean,
  p_include_return boolean,
  p_return_date date default null,
  p_return_time time default null,
  p_return_seats int default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_going uuid;
  v_return uuid;
begin
  if not exists (select 1 from public.profiles where id = v_uid and is_complete) then
    raise exception 'Complete your profile before posting a ride.';
  end if;
  if p_seats is null or p_seats < 1 then
    raise exception 'Please offer at least one seat.';
  end if;

  insert into public.rides (driver_id, event_location_id, direction, depart_date,
                            depart_time, pickup_label, pickup_lat, pickup_lng,
                            seats_total, show_phone_public)
  values (v_uid, p_event_location_id, p_direction, p_going_date, p_going_time,
          p_pickup_label, p_pickup_lat, p_pickup_lng, p_seats, coalesce(p_show_phone, false))
  returning id into v_going;

  if p_include_return then
    insert into public.rides (driver_id, event_location_id, direction, depart_date,
                              depart_time, pickup_label, pickup_lat, pickup_lng,
                              seats_total, show_phone_public, paired_ride_id)
    values (v_uid, p_event_location_id,
            (case when p_direction = 'to_event' then 'from_event' else 'to_event' end)::public.ride_direction,
            coalesce(p_return_date, p_going_date), p_return_time,
            p_pickup_label, p_pickup_lat, p_pickup_lng,
            coalesce(p_return_seats, p_seats), coalesce(p_show_phone, false), v_going)
    returning id into v_return;

    update public.rides set paired_ride_id = v_return where id = v_going;
  end if;

  return v_going;
end $$;

create or replace function public.request_seat(p_ride_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides;
begin
  if not exists (select 1 from public.profiles where id = v_uid and is_complete) then
    raise exception 'Complete your profile before requesting a ride.';
  end if;
  select * into v_ride from public.rides where id = p_ride_id;
  if v_ride.id is null or v_ride.status <> 'active' then
    raise exception 'This ride is not open for requests.';
  end if;
  if v_ride.driver_id = v_uid then
    raise exception 'You cannot request your own ride.';
  end if;
  if public.approved_count(v_ride.id) >= v_ride.seats_total then
    raise exception 'This ride is already full.';
  end if;
  if exists (
    select 1 from public.ride_requests
    where ride_id = p_ride_id and rider_id = v_uid and status in ('pending', 'approved')
  ) then
    raise exception 'You have already requested this ride.';
  end if;

  insert into public.ride_requests (ride_id, rider_id) values (p_ride_id, v_uid);
end $$;

create or replace function public.respond_to_request(p_request_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_req public.ride_requests;
  v_ride public.rides;
begin
  select * into v_req from public.ride_requests where id = p_request_id;
  if v_req.id is null then raise exception 'Request not found.'; end if;
  select * into v_ride from public.rides where id = v_req.ride_id;
  if v_ride.driver_id <> v_uid then raise exception 'This is not your ride.'; end if;
  if v_req.status <> 'pending' then raise exception 'This request was already handled.'; end if;

  if p_approve then
    if public.approved_count(v_ride.id) >= v_ride.seats_total then
      raise exception 'No seats left to approve.';
    end if;
    update public.ride_requests set status = 'approved' where id = p_request_id;
  else
    update public.ride_requests set status = 'declined' where id = p_request_id;
  end if;
end $$;

create or replace function public.cancel_my_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  update public.ride_requests
  set status = 'cancelled'
  where id = p_request_id and rider_id = v_uid and status in ('pending', 'approved');
  if not found then raise exception 'Request not found.'; end if;
end $$;

create or replace function public.set_ride_status(p_ride_id uuid, p_status public.ride_status)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  update public.rides set status = p_status
  where id = p_ride_id and driver_id = v_uid;
  if not found then raise exception 'This is not your ride.'; end if;
end $$;

-- ---------- Grants ----------
grant execute on function public.get_ride_feed(public.ride_direction, date, boolean) to authenticated;
grant execute on function public.get_ride_detail(uuid) to authenticated;
grant execute on function public.get_my_offered_rides() to authenticated;
grant execute on function public.get_my_requests() to authenticated;
grant execute on function public.create_ride(uuid, public.ride_direction, date, time, text, numeric, numeric, int, boolean, boolean, date, time, int) to authenticated;
grant execute on function public.request_seat(uuid) to authenticated;
grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
grant execute on function public.cancel_my_request(uuid) to authenticated;
grant execute on function public.set_ride_status(uuid, public.ride_status) to authenticated;
