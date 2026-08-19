-- OneRide — Find tab: preload all upcoming rides in one call so switching
-- date / direction is instant client-side (and date chips can show counts).
-- Same masking rules as get_ride_feed (gender_only visibility, driver gender
-- only for female callers, phone revealed on approval / public).

create or replace function public.get_ride_feed_upcoming(p_from date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cg public.gender := public.caller_gender();
  v_female boolean := (v_cg = 'female');
begin
  return coalesce((
    select jsonb_agg(card order by (card->>'depart_date'), (card->>'depart_time'))
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
      where r.depart_date >= p_from
        and r.status in ('active', 'full')
        and r.driver_id <> v_uid
        and (r.gender_only is null or r.gender_only = v_cg)
    ) t
  ), '[]'::jsonb);
end $$;

grant execute on function public.get_ride_feed_upcoming(date) to authenticated;
