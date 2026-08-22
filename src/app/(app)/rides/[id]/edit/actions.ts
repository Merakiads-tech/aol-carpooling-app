"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EditRideState = { error?: string };

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function updateRideAction(
  _prev: EditRideState,
  formData: FormData,
): Promise<EditRideState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rideId = String(formData.get("ride_id") || "");
  const pickupLabel = String(formData.get("pickup_label") || "").trim();
  const departDate = String(formData.get("depart_date") || "");
  const departTime = String(formData.get("depart_time") || "");
  const seats = Number(formData.get("seats") || 0);

  if (!rideId) return { error: "Missing ride." };
  if (!pickupLabel) return { error: "Please set your pickup point on the map." };
  if (!departDate || !departTime)
    return { error: "Please pick a date and departure time." };
  if (!(seats >= 1)) return { error: "Please offer at least one seat." };

  // update_my_ride re-checks ownership and that no seat is booked yet.
  const { error } = await supabase.rpc("update_my_ride", {
    p_ride_id: rideId,
    p_direction: String(formData.get("direction") || "to_event"),
    p_depart_date: departDate,
    p_depart_time: departTime,
    p_pickup_label: pickupLabel,
    p_pickup_lat: numOrNull(formData.get("pickup_lat")),
    p_pickup_lng: numOrNull(formData.get("pickup_lng")),
    p_seats: seats,
    p_show_phone: formData.get("show_phone") === "true",
    p_gender_only: formData.get("gender_only") === "true",
  });

  if (error) return { error: error.message };

  revalidatePath("/my-rides");
  revalidatePath("/rides");
  revalidatePath("/");
  redirect("/my-rides");
}
