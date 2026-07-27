import "server-only";
import { createClient } from "@/lib/supabase/server";
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
