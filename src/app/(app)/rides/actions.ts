"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestSeatAction(
  rideId: string,
  seats: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_seat", {
    p_ride_id: rideId,
    p_seats: seats,
  });
  if (error) return { error: error.message };
  revalidatePath("/rides");
  revalidatePath(`/rides/${rideId}`);
  revalidatePath("/my-rides");
  return {};
}
