-- OneRide — Phase 8: admin dashboard rework.
-- Stats are now "what's happening right now" (today & later), the pending
-- queue is time-based (not a 24h clock), the overview gets per-day chart data,
-- and admin_all_rides() carries the requester list for expandable table rows.

-- ── Realtime, upcoming-focused stats ──
-- "Today" is IST (Asia/Kolkata) so admin numbers match what the app shows,
-- rather than the database's UTC current_date (a day behind before 05:30 IST).
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return jsonb_build_object(
    -- rides happening today, and today-or-later (not cancelled, not in the past)
    'rides_today', (
      select count(*) from public.rides
      where status <> 'cancelled' and depart_date = v_today),
    'rides_upcoming', (
      select count(*) from public.rides
      where status <> 'cancelled' and depart_date >= v_today),
    'rides_total', (
      select count(*) from public.rides where status <> 'cancelled'),
    -- seat capacity across upcoming rides (offered vs. actually filled)
    'seats_offered', (
      select coalesce(sum(seats_total), 0) from public.rides
      where status <> 'cancelled' and depart_date >= v_today),
    'seats_filled', (
      select coalesce(sum(public.approved_count(r.id)), 0) from public.rides r
      where r.status <> 'cancelled' and r.depart_date >= v_today),
    -- request pipeline for upcoming rides (drives the pipeline chart)
    'req_pending', (
      select count(*) from public.ride_requests q
      join public.rides r on r.id = q.ride_id
      where q.status = 'pending' and r.status <> 'cancelled' and r.depart_date >= v_today),
    'req_approved', (
      select count(*) from public.ride_requests q
      join public.rides r on r.id = q.ride_id
      where q.status = 'approved' and r.status <> 'cancelled' and r.depart_date >= v_today),
    'req_declined', (
      select count(*) from public.ride_requests q
      join public.rides r on r.id = q.ride_id
      where q.status = 'declined' and r.status <> 'cancelled' and r.depart_date >= v_today),
    -- people
    'users', (select count(*) from public.profiles),
    'users_incomplete', (select count(*) from public.profiles where not is_complete)
  );
end $$;

-- ── Rides per day for the next 14 days (incl. today), split by direction ──
create or replace function public.admin_rides_by_day()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return coalesce((
    select jsonb_agg(obj order by (obj->>'date'))
    from (
      select jsonb_build_object(
        'date', d::date,
        'going', (
          select count(*) from public.rides r
          where r.depart_date = d::date and r.status <> 'cancelled' and r.direction = 'to_event'),
        'returning', (
          select count(*) from public.rides r
          where r.depart_date = d::date and r.status <> 'cancelled' and r.direction = 'from_event'),
        'pending', (
          select count(*) from public.ride_requests q
          join public.rides r on r.id = q.ride_id
          where r.depart_date = d::date and q.status = 'pending' and r.status <> 'cancelled')
      ) as obj
      from generate_series(v_today, v_today + interval '13 days', interval '1 day') d
    ) t
  ), '[]'::jsonb);
end $$;

-- ── The action queue: pending requests on today-or-later rides, soonest first ──
create or replace function public.admin_pending_now()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return coalesce((
    select jsonb_agg(obj order by (obj->>'depart_date'), (obj->>'depart_time'), (obj->>'created_at'))
    from (
      select jsonb_build_object(
        'id', rq.id,
        'created_at', rq.created_at,
        'depart_date', r.depart_date,
        'depart_time', to_char(r.depart_time, 'HH24:MI'),
        'direction', r.direction,
        'event', el.name,
        'seats', rq.seats,
        'driver', jsonb_build_object('name', d.full_name, 'phone', d.phone),
        'rider', jsonb_build_object('name', ri.full_name, 'phone', ri.phone)
      ) as obj
      from public.ride_requests rq
      join public.rides r on r.id = rq.ride_id
      join public.profiles d on d.id = r.driver_id
      join public.profiles ri on ri.id = rq.rider_id
      join public.event_locations el on el.id = r.event_location_id
      where rq.status = 'pending'
        and r.status <> 'cancelled'
        and r.depart_date >= v_today
    ) t
  ), '[]'::jsonb);
end $$;

-- ── All rides for the admin table — now includes the requester list ──
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
          'total', (select count(*) from public.ride_requests q where q.ride_id = r.id and q.status <> 'cancelled')),
        'riders', coalesce((
          select jsonb_agg(jsonb_build_object(
            'name', p.full_name, 'phone', p.phone, 'status', q.status, 'seats', q.seats
          ) order by
            case q.status when 'pending' then 0 when 'approved' then 1 when 'declined' then 2 else 3 end,
            q.created_at)
          from public.ride_requests q
          join public.profiles p on p.id = q.rider_id
          where q.ride_id = r.id and q.status <> 'cancelled'
        ), '[]'::jsonb)
      ) as obj
      from public.rides r
      join public.profiles d on d.id = r.driver_id
      join public.event_locations el on el.id = r.event_location_id
    ) t
  ), '[]'::jsonb);
end $$;

grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_rides_by_day() to authenticated;
grant execute on function public.admin_pending_now() to authenticated;
grant execute on function public.admin_all_rides() to authenticated;
