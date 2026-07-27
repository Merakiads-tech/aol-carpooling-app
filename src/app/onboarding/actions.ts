"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Gender, UserRole } from "@/lib/types";

export type SaveState = { error?: string };

const GENDERS: Gender[] = ["male", "female", "other"];
const ROLES: UserRole[] = ["teacher", "volunteer", "none"];

export async function saveProfile(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const gender = String(formData.get("gender") ?? "") as Gender;
  const role = (String(formData.get("role") ?? "none") || "none") as UserRole;
  const photo_url = String(formData.get("photo_url") ?? "").trim();

  if (!full_name) return { error: "Please enter your name." };
  if (!/^[+]?[\d\s-]{7,16}$/.test(phone))
    return { error: "Please enter a valid phone number." };
  if (!GENDERS.includes(gender)) return { error: "Please select your gender." };
  if (!photo_url) return { error: "Please add a photo." };
  if (!ROLES.includes(role)) return { error: "Please select a valid role." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone, gender, role, photo_url })
    .eq("id", user.id);

  if (error) return { error: "Could not save your profile. Please try again." };

  redirect("/");
}
