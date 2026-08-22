-- OneRide — admin dashboard: community-impact numbers and driver response time.
--
-- Impact is derived, not measured: every approved seat is one car that didn't
-- make the trip, so the saving is (seats x one-way distance). Distance comes
-- from the straight-line pickup -> event distance where the pickup was mapped;
-- rides posted without coordinates fall back to the median mapped distance.
-- The assumptions travel with the numbers so the UI can show them.

-- ------------------------------------------------------------------
-- Great-circle distance in km. Null if either point is unknown.
-- ------------------------------------------------------------------
create or replace function public.haversine_km(
  p_lat1 numeric, p_lng1 numeric, p_lat2 numeric, p_lng2 numeric
)
returns numeric language sql immutable set search_path = public as $$
  select case
    when p_lat1 is null or p_lng1 is null or p_lat2 is null or p_lng2 is null
      then null
    else 6371 * 2 * asin(sqrt(
      power(sin(radians(p_lat2 - p_lat1) / 2), 2) +
      cos(radians(p_lat1)) * cos(radians(p_lat2)) *
      power(sin(radians(p_lng2 - p_lng1) / 2), 2)
    ))
  end;
$$;

-- ------------------------------------------------------------------
-- Community impact, all-time, across every ride that wasn't hidden.
-- ------------------------------------------------------------------
create or replace function public.admin_impact()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  -- Assumptions, surfaced in the UI so the numbers can be read honestly.
  v_kmpl numeric := 15;    -- typical small-car mileage, km per litre
  v_co2  numeric := 2.31;  -- kg CO2 per litre of petrol burnt
  v_median_km numeric;
  v_seat_km   numeric := 0;
  v_seats  int := 0;
  v_people int := 0;
  v_trips  int := 0;
  v_mapped int := 0;
  v_rides  int := 0;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;

  select count(*) filter (
           where public.haversine_km(r.pickup_lat, r.pickup_lng, el.lat, el.lng) is not null),
         count(*)
    into v_mapped, v_rides
  from public.rides r
  join public.event_locations el on el.id = r.event_location_id
  where r.status <> 'cancelled';

  select percentile_cont(0.5) within group (
           order by public.haversine_km(r.pickup_lat, r.pickup_lng, el.lat, el.lng))
    into v_median_km
  from public.rides r
  join public.event_locations el on el.id = r.event_location_id
  where r.status <> 'cancelled'
    and public.haversine_km(r.pickup_lat, r.pickup_lng, el.lat, el.lng) is not null;

  select coalesce(sum(q.seats), 0),
         count(distinct q.rider_id),
         count(distinct r.id),
         coalesce(sum(q.seats * coalesce(
           public.haversine_km(r.pickup_lat, r.pickup_lng, el.lat, el.lng),
           v_median_km, 0)), 0)
    into v_seats, v_people, v_trips, v_seat_km
  from public.ride_requests q
  join public.rides r on r.id = q.ride_id
  join public.event_locations el on el.id = r.event_location_id
  where q.status = 'approved' and r.status <> 'cancelled';

  return jsonb_build_object(
    'seats_shared', v_seats,                              -- riders carried
    'people', v_people,                                   -- distinct riders
    'trips', v_trips,                                     -- rides that carried someone
    'car_km_saved', round(v_seat_km),
    'fuel_saved_l', round(v_seat_km / v_kmpl, 1),
    'co2_saved_kg', round(v_seat_km / v_kmpl * v_co2, 1),
    'median_trip_km', round(coalesce(v_median_km, 0), 1),
    'rides_mapped', v_mapped,
    'rides_total', v_rides,
    'km_per_litre', v_kmpl,
    'co2_per_litre', v_co2
  );
end $$;

-- ------------------------------------------------------------------
-- How long drivers take to answer a seat request, over the 50 most
-- recent decisions. Median leads because a couple of week-long replies
-- drag the average far from typical.
-- ------------------------------------------------------------------
create or replace function public.admin_response_time()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_n int; v_median numeric; v_avg numeric;
  v_hour int; v_day int;
begin
  if not public.is_admin() then raise exception 'Not authorized.'; end if;

  with recent as (
    select extract(epoch from (q.updated_at - q.created_at)) / 60 as mins
    from public.ride_requests q
    where q.status in ('approved', 'declined')
      and q.updated_at > q.created_at
    order by q.updated_at desc
    limit 50
  )
  select count(*),
         percentile_cont(0.5) within group (order by mins),
         avg(mins),
         count(*) filter (where mins <= 60),
         count(*) filter (where mins <= 1440)
    into v_n, v_median, v_avg, v_hour, v_day
  from recent;

  return jsonb_build_object(
    'sample', v_n,
    'median_minutes', round(coalesce(v_median, 0)),
    'avg_minutes', round(coalesce(v_avg, 0)),
    'within_hour', v_hour,
    'within_day', v_day
  );
end $$;

-- ---------- Grants ----------
grant execute on function public.haversine_km(numeric, numeric, numeric, numeric) to authenticated;
grant execute on function public.admin_impact() to authenticated;
grant execute on function public.admin_response_time() to authenticated;
