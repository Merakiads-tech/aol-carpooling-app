-- OneRide — ride management: driver edit + hard delete, admin hide + hard delete.
--
--   * Drivers may edit a ride only while no seat is booked (approved_count = 0)
--     and may hard-delete their own ride; both are blocked once the ride is in
--     the past, so history can't be rewritten or erased.
--   * Admins may hide a ride (status = 'cancelled', so it drops out of the feed)
--     or hard-delete it outright.
--   * get_my_offered_rides now returns hidden rides too, so a driver can see
--     that their ride was taken down instead of it silently vanishing.

-- ------------------------------------------------------------------
-- Driver: read one of my rides for the edit form
-- ------------------------------------------------------------------
create or replace function public.get_my_ride(p_ride_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
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
      'show_phone_public', r.show_phone_public,
      'gender_only', r.gender_only,
      'status', r.status,
      'event_location', jsonb_build_object('id', el.id, 'name', el.name),
      'approved_seats', public.approved_count(r.id),
      'pending_requests', (
        select count(*) from public.ride_requests q
        where q.ride_id = r.id and q.status = 'pending')
    )
    from public.rides r
    join public.event_locations el on el.id = r.event_location_id
    where r.id = p_ride_id and r.driver_id = v_uid
  );
end $$;

-- ------------------------------------------------------------------
-- Driver: edit a ride (only while nobody has a booked seat)
-- ------------------------------------------------------------------
create or replace function public.update_my_ride(
  p_ride_id uuid,
  p_direction public.ride_direction,
  p_depart_date date,
  p_depart_time time,
  p_pickup_label text,
  p_pickup_lat numeric,
  p_pickup_lng numeric,
  p_seats int,
  p_show_phone boolean,
  p_gender_only boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ride public.rides;
  v_g public.gender;
  -- IST, not the database's UTC current_date (a day behind before 05:30 IST)
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select * into v_ride from public.rides where id = p_ride_id;
  if v_ride.id is null or v_ride.driver_id <> v_uid then
    raise exception 'This is not your ride.';
  end if;
  if v_ride.status = 'cancelled' then
    raise exception 'This ride has been taken down and can no longer be edited.';
  end if;
  if v_ride.depart_date < v_today then
    raise exception 'This ride has already departed and can no longer be edited.';
  end if;
  if p_depart_date < v_today then
    raise exception 'Please pick today or a later date.';
  end if;
  if public.approved_count(p_ride_id) > 0 then
    raise exception 'Seats are already booked on this ride — cancel those riders before editing.';
  end if;
  if p_seats is null or p_seats < 1 then
    raise exception 'Please offer at least one seat.';
  end if;

  -- gender_only always mirrors the driver's own gender, same rule as create_ride
  select gender into v_g from public.profiles where id = v_uid;
  if p_gender_only and v_g is null then
    raise exception 'Add your gender to your profile to reserve seats by gender.';
  end if;

  update public.rides set
    direction    = p_direction,
    depart_date  = p_depart_date,
    depart_time  = p_depart_time,
    pickup_label = p_pickup_label,
    pickup_lat   = p_pickup_lat,
    pickup_lng   = p_pickup_lng,
    seats_total  = p_seats,
    show_phone_public = coalesce(p_show_phone, false),
    gender_only  = case when p_gender_only then v_g else null end
  where id = p_ride_id;
end $$;

-- ------------------------------------------------------------------
-- Driver: hard-delete my own ride (ride_requests cascade; the paired
-- leg's paired_ride_id is set null by the FK). Past rides stay on the
-- record — only an admin can remove those.
-- ------------------------------------------------------------------
create or replace function public.delete_my_ride(p_ride_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_date date;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  select depart_date into v_date
  from public.rides where id = p_ride_id and driver_id = v_uid;
  if v_date is null then raise exception 'This is not your ride.'; end if;
  if v_date < v_today then
    raise exception 'This ride has already departed and can no longer be deleted.';
  end if;

  delete from public.rides where id = p_ride_id and driver_id = v_uid;
end $$;

-- ------------------------------------------------------------------
-- Admin: hide / restore any ride
-- ------------------------------------------------------------------
create or replace function public.admin_set_ride_status(
  p_ride_id uuid,
  p_status public.ride_status
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  update public.rides set status = p_status where id = p_ride_id;
  if not found then raise exception 'Ride not found.'; end if;
end $$;

-- ------------------------------------------------------------------
-- Admin: hard-delete any ride
-- ------------------------------------------------------------------
create or replace function public.admin_delete_ride(p_ride_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;
  delete from public.rides where id = p_ride_id;
  if not found then raise exception 'Ride not found.'; end if;
end $$;

-- ------------------------------------------------------------------
-- Drivers keep seeing rides an admin hid (shown as "taken down"), and the
-- feed carries the booked/pending counts the manage UI needs.
-- ------------------------------------------------------------------
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
      where r.driver_id = v_uid
    ) t
  ), '[]'::jsonb);
end $$;

-- ---------- Grants ----------
grant execute on function public.get_my_ride(uuid) to authenticated;
grant execute on function public.update_my_ride(uuid, public.ride_direction, date, time, text, numeric, numeric, int, boolean, boolean) to authenticated;
grant execute on function public.delete_my_ride(uuid) to authenticated;
grant execute on function public.admin_set_ride_status(uuid, public.ride_status) to authenticated;
grant execute on function public.admin_delete_ride(uuid) to authenticated;
