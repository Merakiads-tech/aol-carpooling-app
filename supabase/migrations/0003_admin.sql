-- Book My Ride — Phase 7: admin dashboard RPCs (guarded by is_admin()).

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return jsonb_build_object(
    'rides_active', (select count(*) from public.rides where status = 'active'),
    'rides_total', (select count(*) from public.rides where status <> 'cancelled'),
    'requests_pending', (select count(*) from public.ride_requests where status = 'pending'),
    'seats_total', (select coalesce(sum(seats_total), 0) from public.rides where status <> 'cancelled'),
    'seats_filled', (select count(*) from public.ride_requests where status = 'approved'),
    'users', (select count(*) from public.profiles)
  );
end $$;

-- Requests pending longer than 24h — with the driver's phone so admins can call.
create or replace function public.admin_pending_requests()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return coalesce((
    select jsonb_agg(obj order by (obj->>'created_at'))
    from (
      select jsonb_build_object(
        'id', rq.id,
        'created_at', rq.created_at,
        'ride', jsonb_build_object(
          'depart_date', r.depart_date,
          'depart_time', to_char(r.depart_time, 'HH24:MI'),
          'direction', r.direction,
          'event', el.name
        ),
        'driver', jsonb_build_object('name', d.full_name, 'phone', d.phone),
        'rider', jsonb_build_object('name', ri.full_name)
      ) as obj
      from public.ride_requests rq
      join public.rides r on r.id = rq.ride_id
      join public.profiles d on d.id = r.driver_id
      join public.profiles ri on ri.id = rq.rider_id
      join public.event_locations el on el.id = r.event_location_id
      where rq.status = 'pending'
        and rq.created_at < now() - interval '24 hours'
    ) t
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_users()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id, 'name', full_name, 'email', email, 'phone', phone,
      'gender', gender, 'role', role, 'is_complete', is_complete,
      'created_at', created_at
    ) order by created_at desc)
    from public.profiles
  ), '[]'::jsonb);
end $$;

grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_pending_requests() to authenticated;
grant execute on function public.admin_users() to authenticated;
