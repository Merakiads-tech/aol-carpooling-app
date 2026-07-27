"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

export type LocationState = { error?: string; ok?: boolean };

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function saveLocationAction(
  _prev: LocationState,
  formData: FormData,
): Promise<LocationState> {
  await requireAdmin();
  const supabase = await createClient();

  const id = (formData.get("id") as string) || null;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const payload = {
    name,
    address: str(formData.get("address")),
    lat: numOrNull(formData.get("lat")),
    lng: numOrNull(formData.get("lng")),
    maps_url: str(formData.get("maps_url")),
  };

  const { error } = id
    ? await supabase.from("event_locations").update(payload).eq("id", id)
    : await supabase.from("event_locations").insert(payload);

  if (error) return { error: error.message };
  revalidatePath("/admin/locations");
  revalidatePath("/rides");
  revalidatePath("/rides/new");
  return { ok: true };
}

export async function toggleLocationAction(id: string, isActive: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_locations")
    .update({ is_active: isActive })
    .eq("id", id);
  revalidatePath("/admin/locations");
  revalidatePath("/rides");
  revalidatePath("/rides/new");
  return error ? { error: error.message } : {};
}
