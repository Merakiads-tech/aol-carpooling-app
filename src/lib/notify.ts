import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  sendMail,
  emailLayout,
  detailsTable,
  ctaButton,
  contactLine,
  esc,
  APP_URL,
} from "@/lib/mail";
import { sendWhatsApp, formatPhone } from "@/lib/whatsapp";
import { APP_CONFIG } from "@/config/app";
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

/** WhatsApp trip block: "📍 A → B" / "📅 date · time". */
function waTrip(ctx: NonNullable<Awaited<ReturnType<typeof rideContext>>>) {
  return `📍 ${ctx.from} → ${ctx.to}\n📅 ${ctx.dateStr} · ${ctx.timeStr}`;
}

/** "Name (+91 98155…)" for WhatsApp, or just the name. */
function waContact(p: Profile | null, fallback = "—"): string {
  const name = p?.full_name ?? fallback;
  const phone = formatPhone(p?.phone);
  return phone ? `${name} (${phone})` : name;
}

const waFooter = `\n\n_${APP_CONFIG.name} — rides are always free_`;

/** WhatsApp the driver a confirmation that their ride (and return leg) is live. */
export async function notifyRidePosted(rideId: string) {
  const s = createServiceClient();
  const ctx = await rideContext(s, rideId);
  if (!ctx) return;

  const [driver, legs] = await Promise.all([
    profile(s, ctx.ride.driver_id),
    s.from("rides").select("seats_total, paired_ride_id").eq("id", rideId).single(),
  ]);
  const leg = legs.data as { seats_total: number; paired_ride_id: string | null } | null;
  const seats = leg?.seats_total ?? 1;
  const ret = leg?.paired_ride_id ? await rideContext(s, leg.paired_ride_id) : null;

  await sendWhatsApp({
    to: driver?.phone,
    text:
      `🚗 *Your ride is live!*\n\n` +
      `You're offering *${seats} ${seats === 1 ? "seat" : "seats"}* ${ctx.route}.\n\n` +
      waTrip(ctx) +
      (ret ? `\n\n↩️ *Return:*\n${waTrip(ret)}` : "") +
      `\n\nWe'll message you here when someone requests a seat.\n` +
      `👉 *Manage your ride:*\n${APP_URL}/my-rides?tab=offered` +
      waFooter,
  });
}

/** Notify the driver (email + WhatsApp) that a rider asked for a seat. */
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

  const seatsLabel = `${seats} ${seats === 1 ? "seat" : "seats"}`;
  const wa = sendWhatsApp({
    to: driver?.phone,
    text:
      `🚗 *New seat request*\n\n` +
      `*${waContact(rider, riderName)}* wants *${seatsLabel}* on your ride ${ctx.route}.\n\n` +
      `${waTrip(ctx)}\n\n` +
      `👉 *Approve or decline now:*\n${APP_URL}/my-rides?tab=offered` +
      waFooter,
  });

  const mail = sendMail({
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
  await Promise.all([mail, wa]);
}

/** Notify the rider (email + WhatsApp) that the driver approved or declined. */
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
    const wa = sendWhatsApp({
      to: rider?.phone,
      text:
        `✅ *Seat confirmed!*\n\n` +
        `Ride Host *${waContact(driver, "Your Ride Host")}* approved your seat ${ctx.route}.\n\n` +
        `${waTrip(ctx)}\n📌 Pickup: ${ctx.ride.pickup_label}\n\n` +
        `👉 *Call your Ride Host to fix the exact pickup spot.*\n${APP_URL}/my-rides?tab=requested` +
        waFooter,
    });
    const mail = sendMail({
      to: rider?.email,
      subject: `Approved — your seat ${ctx.route}`,
      html: emailLayout(
        "Your seat is confirmed 🎉",
        `<b>${esc(driverName)}</b> approved your seat. Here are the details — call the driver to fix the exact pickup.
         ${table}`,
        ctaButton("Open your ride", "/my-rides?tab=requested"),
      ),
    });
    await Promise.all([mail, wa]);
  } else {
    const table = detailsTable(tripRows(ctx));
    const wa = sendWhatsApp({
      to: rider?.phone,
      text:
        `ℹ️ *Request not approved*\n\n` +
        `Ride Host *${waContact(driver, "The Ride Host")}* couldn't fit you on this ride.\n\n` +
        `${waTrip(ctx)}\n\n` +
        `👉 *Other cars may be on your route — find one:*\n${APP_URL}/rides` +
        waFooter,
    });
    const mail = sendMail({
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
    await Promise.all([mail, wa]);
  }
}
