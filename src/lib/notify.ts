import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendMail,
  emailLayout,
  detailsTable,
  ctaButton,
  contactLine,
  esc,
} from "@/lib/mail";
import { directionLabel, formatDate, formatTime } from "@/lib/format";
import type { RideDirection } from "@/lib/types";

type RideRow = {
  driver_id: string;
  event_location_id: string;
  direction: RideDirection;
  depart_date: string;
  depart_time: string;
  pickup_label: string;
};
type Profile = {
  email?: string | null;
  full_name: string | null;
  phone: string | null;
};

type Service = ReturnType<typeof createServiceClient>;

async function profile(s: Service, id: string): Promise<Profile | null> {
  const { data } = await s
    .from("profiles")
    .select("email, full_name, phone")
    .eq("id", id)
    .single();
  return (data as Profile) ?? null;
}

async function rideContext(s: Service, rideId: string) {
  const { data } = await s
    .from("rides")
    .select(
      "driver_id, event_location_id, direction, depart_date, depart_time, pickup_label",
    )
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

  const toEvent = ride.direction === "to_event";
  return {
    ride,
    eventName,
    route: directionLabel(ride.direction, eventName),
    from: toEvent ? ride.pickup_label : eventName,
    to: toEvent ? eventName : ride.pickup_label,
    dateStr: formatDate(ride.depart_date),
    timeStr: formatTime(ride.depart_time.slice(0, 5)),
  };
}

/** The trip rows shared by every notification (From / To / Date / Time). */
function tripRows(ctx: NonNullable<Awaited<ReturnType<typeof rideContext>>>) {
  return [
    ["From", esc(ctx.from)],
    ["To", esc(ctx.to)],
    ["Date", esc(ctx.dateStr)],
    ["Time", esc(ctx.timeStr)],
  ] as Array<[string, string]>;
}

/** Email the driver that a rider asked for a seat. */
export async function notifyNewRequest(rideId: string, riderId: string) {
  const s = createServiceClient();
  const ctx = await rideContext(s, rideId);
  if (!ctx) return;

  const [driver, rider, reqRow] = await Promise.all([
    profile(s, ctx.ride.driver_id),
    profile(s, riderId),
    s
      .from("ride_requests")
      .select("seats")
      .eq("ride_id", rideId)
      .eq("rider_id", riderId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const seats = (reqRow.data as { seats: number } | null)?.seats ?? 1;
  const riderName = rider?.full_name ?? "Someone";

  const table = detailsTable([
    ...tripRows(ctx),
    ["Seats requested", String(seats)],
    ["Driver (you)", contactLine(driver?.full_name ?? null, driver?.phone ?? null)],
    ["Rider", contactLine(rider?.full_name ?? null, rider?.phone ?? null)],
  ]);

  await sendMail({
    to: driver?.email,
    subject: `New seat request — ${ctx.route}`,
    html: emailLayout(
      "You have a new ride request",
      `<b>${esc(riderName)}</b> asked for ${seats} ${seats === 1 ? "seat" : "seats"} on your ride.
       ${table}
       Open <b>My Rides &rarr; Offered</b> to approve or decline.`,
      ctaButton("Review the request", "/my-rides?tab=offered"),
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

  if (approved) {
    const table = detailsTable([
      ...tripRows(ctx),
      ["Pickup point", esc(ctx.ride.pickup_label)],
      ["Driver", contactLine(driver?.full_name ?? null, driver?.phone ?? null)],
      ["Rider (you)", contactLine(rider?.full_name ?? null, rider?.phone ?? null)],
    ]);
    await sendMail({
      to: rider?.email,
      subject: `Approved — your seat ${ctx.route}`,
      html: emailLayout(
        "Your seat is confirmed 🎉",
        `<b>${esc(driverName)}</b> approved your seat. Here are the details — call the driver to fix the exact pickup.
         ${table}`,
        ctaButton("Open your ride", "/my-rides?tab=requested"),
      ),
    });
  } else {
    const table = detailsTable(tripRows(ctx));
    await sendMail({
      to: rider?.email,
      subject: `Update on your ride request ${ctx.route}`,
      html: emailLayout(
        "Your request wasn't approved this time",
        `<b>${esc(driverName)}</b> couldn't fit you on this ride.
         ${table}
         No worries — there may be other cars on your route.`,
        ctaButton("Find another ride", "/rides"),
      ),
    });
  }
}
