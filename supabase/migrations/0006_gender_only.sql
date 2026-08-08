-- Book My Ride — gender-restricted rides + "next ride day" home stat.
--
-- A driver may reserve a whole ride for their OWN gender. Such a ride is only
-- visible to riders of that gender. Enforced centrally in the feed RPCs.

alter table public.rides
  add column if not exists gender_only public.gender;

-- ── create_ride: add p_gender_only; the gender is always the driver's own ──
drop function if exists public.create_ride(uuid, public.ride_direction, date, time, text, numeric, numeric, int, boolean, boolean, date, time, int);

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
  p_return_seats int default null,
  p_gender_only boolean default false
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_going uuid;
  v_return uuid;
  v_g public.gender;
begin
  if not exists (select 1 from public.profiles where id = v_uid and is_complete) then
    raise exception 'Complete your profile before posting a ride.';
  end if;
  if p_seats is null or p_seats < 1 then
    raise exception 'Please offer at least one seat.';
  end if;

  select gender into v_g from public.profiles where id = v_uid;
  -- Only the driver's own gender can be reserved for.
  if p_gender_only and v_g is null then
    raise exception 'Set your gender before reserving gender-only seats.';
  end if;

  insert into public.rides (driver_id, event_location_id, direction, depart_date,
                            depart_time, pickup_label, pickup_lat, pickup_lng,
                            seats_total, show_phone_public, gender_only)
  values (v_uid, p_event_location_id, p_direction, p_going_date, p_going_time,
          p_pickup_label, p_pickup_lat, p_pickup_lng, p_seats, coalesce(p_show_phone, false),
          case when p_gender_only then v_g else null end)
  returning id into v_going;

  if p_include_return then
    insert into public.rides (driver_id, event_location_id, direction, depart_date,
                              depart_time, pickup_label, pickup_lat, pickup_lng,
                              seats_total, show_phone_public, paired_ride_id, gender_only)
    values (v_uid, p_event_location_id,
            (case when p_direction = 'to_event' then 'from_event' else 'to_event' end)::public.ride_direction,
            coalesce(p_return_date, p_going_date), p_return_time,
            p_pickup_label, p_pickup_lat, p_pickup_lng,
            coalesce(p_return_seats, p_seats), coalesce(p_show_phone, false), v_going,
            case when p_gender_only then v_g else null end)
    returning id into v_return;

    update public.rides set paired_ride_id = v_return where id = v_going;
  end if;

  return v_going;
end $$;
grant execute on function public.create_ride(uuid, public.ride_direction, date, time, text, numeric, numeric, int, boolean, boolean, date, time, int, boolean) to authenticated;

-- ── feed: expose gender_only + hide rides restricted to another gender ──
create or replace function public.get_ride_feed(
  p_direction public.ride_direction,
  p_date date,
  p_women_only boolean default false
)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cg public.gender := public.caller_gender();
  v_female boolean := (v_cg = 'female');
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
        'gender_only', r.gender_only,
        'event_location', jsonb_build_object('id', el.id, 'name', el.name),
        'driver', jsonb_build_object(
          'id', d.id, 'name', d.full_name, 'photo_url', d.photo_url, 'role', d.role,
          'gender', case when v_female then d.gender else null end
        ),
        'driver_phone', case
          when r.show_phone_public then d.phone
          when exists (select 1 from public.ride_requests rq where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status = 'approved') then d.phone
          else null end,
        'my_request_status', (
          select rq.status from public.ride_requests rq
          where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status <> 'cancelled'
          order by rq.created_at desc limit 1)
      ) as card
      from public.rides r
      join public.profiles d on d.id = r.driver_id
      join public.event_locations el on el.id = r.event_location_id
      where r.direction = p_direction
        and r.depart_date = p_date
        and r.status in ('active', 'full')
        and r.driver_id <> v_uid
        and (r.gender_only is null or r.gender_only = v_cg)
        and (not v_women or d.gender = 'female')
    ) t
  ), '[]'::jsonb);
end $$;

-- ── detail: same visibility rule (so a hidden ride 404s by URL too) ──
create or replace function public.get_ride_detail(p_ride_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cg public.gender := public.caller_gender();
  v_female boolean := (v_cg = 'female');
begin
  return (
    select jsonb_build_object(
      'id', r.id, 'direction', r.direction, 'depart_date', r.depart_date,
      'depart_time', to_char(r.depart_time, 'HH24:MI'),
      'pickup_label', r.pickup_label, 'pickup_lat', r.pickup_lat, 'pickup_lng', r.pickup_lng,
      'seats_total', r.seats_total, 'seats_filled', public.approved_count(r.id),
      'status', r.status,
      'is_full', (r.status = 'full' or public.approved_count(r.id) >= r.seats_total),
      'is_mine', (r.driver_id = v_uid),
      'show_phone_public', r.show_phone_public, 'gender_only', r.gender_only,
      'event_location', jsonb_build_object('id', el.id, 'name', el.name, 'maps_url', el.maps_url),
      'driver', jsonb_build_object('id', d.id, 'name', d.full_name, 'photo_url', d.photo_url, 'role', d.role,
        'gender', case when v_female then d.gender else null end),
      'driver_phone', case
        when r.show_phone_public then d.phone
        when exists (select 1 from public.ride_requests rq where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status = 'approved') then d.phone
        else null end,
      'my_request_status', (select rq.status from public.ride_requests rq
        where rq.ride_id = r.id and rq.rider_id = v_uid and rq.status <> 'cancelled'
        order by rq.created_at desc limit 1)
    )
    from public.rides r
    join public.profiles d on d.id = r.driver_id
    join public.event_locations el on el.id = r.event_location_id
    where r.id = p_ride_id
      and (r.driver_id = v_uid or r.gender_only is null or r.gender_only = v_cg)
  );
end $$;

-- ── my offered / my requests / admin: expose gender_only for the pill ──
create or replace function public.get_my_offered_rides()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  return coalesce((
    select jsonb_agg(obj order by (obj->>'depart_date'), (obj->>'depart_time'))
    from (
      select jsonb_build_object(
        'id', r.id, 'direction', r.direction, 'depart_date', r.depart_date,
        'depart_time', to_char(r.depart_time, 'HH24:MI'), 'pickup_label', r.pickup_label,
        'seats_total', r.seats_total, 'seats_filled', public.approved_count(r.id),
        'status', r.status, 'show_phone_public', r.show_phone_public, 'gender_only', r.gender_only,
        'event_location', jsonb_build_object('id', el.id, 'name', el.name),
        'requests', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', rq.id, 'status', rq.status, 'seats', rq.seats, 'created_at', rq.created_at,
            'rider', jsonb_build_object('id', ri.id, 'name', ri.full_name, 'photo_url', ri.photo_url, 'role', ri.role, 'gender', ri.gender),
            'rider_phone', case when rq.status = 'approved' then ri.phone else null end
          ) order by rq.created_at)
          from public.ride_requests rq join public.profiles ri on ri.id = rq.rider_id
          where rq.ride_id = r.id and rq.status <> 'cancelled'
        ), '[]'::jsonb)
      ) as obj
      from public.rides r join public.event_locations el on el.id = r.event_location_id
      where r.driver_id = v_uid and r.status <> 'cancelled'
    ) t
  ), '[]'::jsonb);
end $$;

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
        'request_id', rq.id, 'status', rq.status, 'seats', rq.seats,
        'depart_date', r.depart_date, 'depart_time', to_char(r.depart_time, 'HH24:MI'),
        'direction', r.direction, 'pickup_label', r.pickup_label,
        'seats_total', r.seats_total, 'seats_filled', public.approved_count(r.id), 'gender_only', r.gender_only,
        'event_location', jsonb_build_object('id', el.id, 'name', el.name),
        'driver', jsonb_build_object('id', d.id, 'name', d.full_name, 'photo_url', d.photo_url, 'role', d.role,
          'gender', case when v_female then d.gender else null end),
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

create or replace function public.admin_all_rides()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return coalesce((
    select jsonb_agg(obj order by (obj->>'depart_date') desc, (obj->>'depart_time'))
    from (
      select jsonb_build_object(
        'id', r.id, 'direction', r.direction, 'depart_date', r.depart_date,
        'depart_time', to_char(r.depart_time, 'HH24:MI'), 'pickup_label', r.pickup_label,
        'pickup_lat', r.pickup_lat, 'pickup_lng', r.pickup_lng,
        'seats_total', r.seats_total, 'seats_filled', public.approved_count(r.id),
        'status', r.status, 'show_phone_public', r.show_phone_public,
        'paired_ride_id', r.paired_ride_id, 'created_at', r.created_at, 'gender_only', r.gender_only,
        'event', el.name,
        'driver', jsonb_build_object('name', d.full_name, 'phone', d.phone, 'gender', d.gender, 'role', d.role),
        'requests', jsonb_build_object(
          'pending', (select count(*) from public.ride_requests q where q.ride_id = r.id and q.status = 'pending'),
          'approved', (select count(*) from public.ride_requests q where q.ride_id = r.id and q.status = 'approved'),
          'total', (select count(*) from public.ride_requests q where q.ride_id = r.id and q.status <> 'cancelled'))
      ) as obj
      from public.rides r
      join public.profiles d on d.id = r.driver_id
      join public.event_locations el on el.id = r.event_location_id
    ) t
  ), '[]'::jsonb);
end $$;

-- ── Home stat: the soonest upcoming day with rides + how many ──
create or replace function public.next_ride_day()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cg public.gender := public.caller_gender();
  v_date date;
begin
  select min(depart_date) into v_date
  from public.rides
  where depart_date >= current_date and status = 'active' and driver_id <> v_uid
    and (gender_only is null or gender_only = v_cg);
  if v_date is null then return null; end if;
  return jsonb_build_object(
    'date', v_date,
    'count', (select count(*) from public.rides
              where depart_date = v_date and status = 'active' and driver_id <> v_uid
                and (gender_only is null or gender_only = v_cg))
  );
end $$;
grant execute on function public.next_ride_day() to authenticated;
