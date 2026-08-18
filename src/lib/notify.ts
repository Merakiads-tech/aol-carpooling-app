import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendMail, emailLayout } from "@/lib/mail";
import { directionLabel, formatDate, formatTime } from "@/lib/format";
import type { RideDirection } from "@/lib/types";

type RideRow = {
  driver_id: string;
  event_location_id: string;
  direction: RideDirection;
  depart_date: string;
  depart_time: string;
};
type Profile = { email?: string | null; full_name: string | null };

type Service = ReturnType<typeof createServiceClient>;

async function profile(s: Service, id: string): Promise<Profile | null> {
  const { data } = await s
    .from("profiles")
    .select("email, full_name")
    .eq("id", id)
    .single();
  return (data as Profile) ?? null;
}

async function rideContext(s: Service, rideId: string) {
  const { data } = await s
    .from("rides")
    .select("driver_id, event_location_id, direction, depart_date, depart_time")
    .eq("id", rideId)
    .single();
  const ride = (data as RideRow) ?? null;
  if (!ride) return null;
  const { data: evData } = await s
    .from("event_locations")
    .select("name")
    .eq("id", ride.event_location_id)
    .single();
  const eventName = (evData as { name: string } | null)?.name ?? "the event";
  const when = `${formatDate(ride.depart_date)} at ${formatTime(ride.depart_time.slice(0, 5))}`;
  const route = directionLabel(ride.direction, eventName);
  return { ride, route, when };
}

/** Email the driver that a rider asked for a seat. */
export async function notifyNewRequest(rideId: string, riderId: string) {
  const s = createServiceClient();
  const ctx = await rideContext(s, rideId);
  if (!ctx) return;
  const [driver, rider] = await Promise.all([
    profile(s, ctx.ride.driver_id),
    profile(s, riderId),
  ]);
  const riderName = rider?.full_name ?? "Someone";
  await sendMail({
    to: driver?.email,
    subject: `New seat request — your ride ${ctx.route}`,
    html: emailLayout(
      "You have a new ride request",
      `<b>${riderName}</b> asked for a seat on your ride <b>${ctx.route}</b>, ${ctx.when}.
       <br><br>Open <b>My Rides → Offered</b> to approve or decline.`,
    ),
  });
}

/** Email the rider that the driver approved or declined their request. */
export async function notifyResponse(requestId: string, approved: boolean) {
  const s = createServiceClient();
  const { data } = await s
    .from("ride_requests")
    .select("ride_id, rider_id")
    .eq("id", requestId)
    .single();
  const req = (data as { ride_id: string; rider_id: string }) ?? null;
  if (!req) return;
  const ctx = await rideContext(s, req.ride_id);
  if (!ctx) return;
  const [rider, driver] = await Promise.all([
    profile(s, req.rider_id),
    profile(s, ctx.ride.driver_id),
  ]);
  const driverName = driver?.full_name ?? "The driver";
  await sendMail({
    to: rider?.email,
    subject: approved
      ? `Approved — your seat ${ctx.route}`
      : `Update on your ride request ${ctx.route}`,
    html: approved
      ? emailLayout(
          "Your seat is confirmed",
          `<b>${driverName}</b> approved your seat ${ctx.route}, ${ctx.when}.
           <br><br>Open <b>My Rides → Requested</b> to see their number and coordinate pickup.`,
        )
      : emailLayout(
          "Your request wasn't approved this time",
          `<b>${driverName}</b> couldn't fit you on the ride ${ctx.route}, ${ctx.when}.
           <br><br>No worries — there may be other cars on your route. Try <b>Find a ride</b>.`,
        ),
  });
}
