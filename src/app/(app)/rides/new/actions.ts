"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PostRideState = { error?: string };

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function createRideAction(
  _prev: PostRideState,
  formData: FormData,
): Promise<PostRideState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const direction = String(formData.get("direction") || "to_event");
  const includeReturn = formData.get("include_return") === "true";

  const pickupLabel = String(formData.get("pickup_label") || "").trim();
  const goingDate = String(formData.get("going_date") || "");
  const goingTime = String(formData.get("going_time") || "");
  const seats = Number(formData.get("seats") || 0);

  if (!pickupLabel) return { error: "Please set your pickup point on the map." };
  if (!goingDate || !goingTime)
    return { error: "Please pick a date and departure time." };
  if (!(seats >= 1)) return { error: "Please offer at least one seat." };

  const returnTime = String(formData.get("return_time") || "");
  if (includeReturn && !returnTime)
    return { error: "Please add your return departure time." };

  const { error } = await supabase.rpc("create_ride", {
    p_event_location_id: String(formData.get("event_location_id")),
    p_direction: direction,
    p_going_date: goingDate,
    p_going_time: goingTime,
    p_pickup_label: pickupLabel,
    p_pickup_lat: numOrNull(formData.get("pickup_lat")),
    p_pickup_lng: numOrNull(formData.get("pickup_lng")),
    p_seats: seats,
    p_show_phone: formData.get("show_phone") === "true",
    p_include_return: includeReturn,
    p_return_date: includeReturn
      ? String(formData.get("return_date") || goingDate)
      : null,
    p_return_time: includeReturn ? returnTime : null,
    p_return_seats: includeReturn
      ? Number(formData.get("return_seats") || seats)
      : null,
  });

  if (error) return { error: error.message };

  redirect("/my-rides");
}
