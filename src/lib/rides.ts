import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  EventLocation,
  MyRequest,
  OfferedRide,
  RideCard,
  RideDirection,
} from "@/lib/types";

export async function getEventLocations(): Promise<EventLocation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_locations")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  return (data as EventLocation[]) ?? [];
}

/**
 * Active event locations, cached for an hour. They change rarely, so this
 * avoids a Supabase round-trip on every Find / Offer page load.
 */
export const getCachedEventLocations = unstable_cache(
  async (): Promise<EventLocation[]> => {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("event_locations")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    return (data as EventLocation[]) ?? [];
  },
  ["active-event-locations"],
  { revalidate: 3600, tags: ["event-locations"] },
);

export async function getRideFeed(
  direction: RideDirection,
  date: string,
  womenOnly: boolean,
): Promise<RideCard[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_ride_feed", {
    p_direction: direction,
    p_date: date,
    p_women_only: womenOnly,
  });
  return (data as RideCard[]) ?? [];
}

/**
 * All upcoming rides (both directions) from `from` onward, in one call, so the
 * Find tab can filter by date / direction entirely client-side (instant) and
 * show per-date counts. Same masking as {@link getRideFeed}.
 */
export async function getUpcomingRideFeed(from: string): Promise<RideCard[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_ride_feed_upcoming", {
    p_from: from,
  });
  return (data as RideCard[]) ?? [];
}

export async function getRideDetail(id: string): Promise<RideCard | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_ride_detail", { p_ride_id: id });
  return (data as RideCard) ?? null;
}

export async function getMyOfferedRides(): Promise<OfferedRide[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_offered_rides");
  return (data as OfferedRide[]) ?? [];
}

export async function getMyRequests(): Promise<MyRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_requests");
  return (data as MyRequest[]) ?? [];
}

export async function getMyPendingRequestCount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_pending_request_count");
  return (data as number) ?? 0;
}

export type NextRideDay = { date: string; count: number };

export async function getNextRideDay(): Promise<NextRideDay | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("next_ride_day");
  return (data as NextRideDay) ?? null;
}
