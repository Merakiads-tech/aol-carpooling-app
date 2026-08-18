"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyResponse } from "@/lib/notify";
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
  const res = await run("respond_to_request", {
    p_request_id: requestId,
    p_approve: approve,
  });
  // Email the rider (approved / declined) after the response is sent.
  if (!res.error) after(() => notifyResponse(requestId, approve));
  return res;
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
