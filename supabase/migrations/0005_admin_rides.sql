-- Book My Ride — admin: full ride list (both legs of every pair), detailed.

create or replace function public.admin_all_rides()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  return coalesce((
    select jsonb_agg(obj order by (obj->>'depart_date') desc, (obj->>'depart_time'))
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
        'show_phone_public', r.show_phone_public,
        'paired_ride_id', r.paired_ride_id,
        'created_at', r.created_at,
        'event', el.name,
        'driver', jsonb_build_object(
          'name', d.full_name, 'phone', d.phone, 'gender', d.gender, 'role', d.role
        ),
        'requests', jsonb_build_object(
          'pending', (select count(*) from public.ride_requests q where q.ride_id = r.id and q.status = 'pending'),
          'approved', (select count(*) from public.ride_requests q where q.ride_id = r.id and q.status = 'approved'),
          'total', (select count(*) from public.ride_requests q where q.ride_id = r.id and q.status <> 'cancelled')
        )
      ) as obj
      from public.rides r
      join public.profiles d on d.id = r.driver_id
      join public.event_locations el on el.id = r.event_location_id
    ) t
  ), '[]'::jsonb);
end $$;

grant execute on function public.admin_all_rides() to authenticated;
