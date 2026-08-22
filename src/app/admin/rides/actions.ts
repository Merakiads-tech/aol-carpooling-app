"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function run(name: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  revalidatePath("/admin/rides");
  revalidatePath("/admin");
  revalidatePath("/rides");
  revalidatePath("/my-rides");
  revalidatePath("/");
  return error ? { error: error.message } : {};
}

/**
 * Hide a ride from the rider-facing feed (status `cancelled`) or put it back.
 * The driver still sees it in My Rides, flagged as taken down.
 */
export async function adminSetRideHiddenAction(rideId: string, hidden: boolean) {
  return run("admin_set_ride_status", {
    p_ride_id: rideId,
    p_status: hidden ? "cancelled" : "active",
  });
}

/** Hard-delete a ride. Its seat requests cascade away with it. */
export async function adminDeleteRideAction(rideId: string) {
  return run("admin_delete_ride", { p_ride_id: rideId });
}
