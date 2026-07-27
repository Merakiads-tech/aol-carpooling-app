"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RideStatus } from "@/lib/types";

async function run(name: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(name, args);
  revalidatePath("/my-rides");
  revalidatePath("/rides");
  revalidatePath("/");
  return error ? { error: error.message } : {};
}

export async function respondToRequestAction(
  requestId: string,
  approve: boolean,
) {
  return run("respond_to_request", {
    p_request_id: requestId,
    p_approve: approve,
  });
}

export async function cancelRequestAction(requestId: string) {
  return run("cancel_my_request", { p_request_id: requestId });
}

export async function setRideStatusAction(
  rideId: string,
  status: RideStatus,
) {
  return run("set_ride_status", { p_ride_id: rideId, p_status: status });
}
