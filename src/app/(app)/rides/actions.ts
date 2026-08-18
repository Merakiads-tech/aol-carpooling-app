"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyNewRequest } from "@/lib/notify";

export async function requestSeatAction(
  rideId: string,
  seats: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.rpc("request_seat", {
    p_ride_id: rideId,
    p_seats: seats,
  });
  if (error) return { error: error.message };
  revalidatePath("/rides");
  revalidatePath(`/rides/${rideId}`);
  revalidatePath("/my-rides");
  // Email the driver after the response is sent (non-blocking).
  if (user) after(() => notifyNewRequest(rideId, user.id));
  return {};
}
