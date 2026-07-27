-- Book My Ride — riders choose how many seats; driver pending-request counter.

alter table public.ride_requests
  add column if not exists seats int not null default 1;
alter table public.ride_requests
  drop constraint if exists ride_requests_seats_check;
alter table public.ride_requests
  add constraint ride_requests_seats_check check (seats between 1 and 6);

-- "seats_filled" now means the SUM of approved seats, not the request count.
create or replace function public.approved_count(p_ride_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(sum(seats), 0)::int from public.ride_requests
  where ride_id = p_ride_id and status = 'approved';
$$;

-- Pending requests across all rides I'm driving (for the nav badge + banners).
create or replace function public.my_pending_request_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.ride_requests rq
  join public.rides r on r.id = rq.ride_id
  where r.driver_id = auth.uid() and rq.status = 'pending';
$$;
grant execute on function public.my_pending_request_count() to authenticated;

-- request_seat now takes a seat count.
drop function if exists public.request_seat(uuid);
create or replace function public.request_seat(p_ride_id uuid, p_seats int default 1)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides;
  v_available int;
begin
  if p_seats is null or p_seats < 1 then
    raise exception 'Please choose at least one seat.';
  end if;
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
  v_available := v_ride.seats_total - public.approved_count(v_ride.id);
  if p_seats > v_available then
    raise exception 'Only % seat(s) left on this ride.', greatest(v_available, 0);
  end if;
  if exists (
    select 1 from public.ride_requests
    where ride_id = p_ride_id and rider_id = v_uid and status in ('pending', 'approved')
  ) then
    raise exception 'You have already requested this ride.';
  end if;

  insert into public.ride_requests (ride_id, rider_id, seats)
  values (p_ride_id, v_uid, p_seats);
end $$;
grant execute on function public.request_seat(uuid, int) to authenticated;

-- Approval must respect the requested seat count.
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
    if public.approved_count(v_ride.id) + v_req.seats > v_ride.seats_total then
      raise exception 'Not enough seats left to approve this request.';
    end if;
    update public.ride_requests set status = 'approved' where id = p_request_id;
  else
    update public.ride_requests set status = 'declined' where id = p_request_id;
  end if;
end $$;

-- Add per-request seat counts to the "my offered" and "my requests" feeds.
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
            'seats', rq.seats,
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
        'seats', rq.seats,
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
