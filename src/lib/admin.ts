import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EventLocation, RideDirection, RideStatus } from "@/lib/types";

/**
 * Whether the signed-in user is an admin. The single source of truth is the
 * public.app_admins table, checked via the is_admin() RPC (which matches the
 * caller's own JWT email). cache() dedupes it within a request (the header and
 * the /admin gate both ask). Add/remove admins by editing app_admins only.
 */
export const isCurrentUserAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_admin");
  return data === true;
});

/** Redirect to login if signed out, 404 if signed in but not an admin. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) notFound();
  return user;
}

export type AdminStats = {
  rides_today: number;
  rides_upcoming: number;
  rides_total: number;
  seats_offered: number;
  seats_filled: number;
  req_pending: number;
  req_approved: number;
  req_declined: number;
  users: number;
  users_incomplete: number;
};

/** One day of upcoming ride volume — powers the overview bar chart. */
export type RideDay = {
  date: string;
  going: number;
  returning: number;
  pending: number;
};

/** A pending seat request on a today-or-later ride (the action queue). */
export type PendingNow = {
  id: string;
  created_at: string;
  depart_date: string;
  depart_time: string;
  direction: RideDirection;
  event: string;
  seats: number;
  driver: { name: string | null; phone: string | null };
  rider: { name: string | null; phone: string | null };
};

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  role: string;
  is_complete: boolean;
  created_at: string;
};

export async function getAdminStats(): Promise<AdminStats | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stats");
  return (data as AdminStats) ?? null;
}

export async function getRidesByDay(): Promise<RideDay[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_rides_by_day");
  return (data as RideDay[]) ?? [];
}

export async function getPendingNow(): Promise<PendingNow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_pending_now");
  return (data as PendingNow[]) ?? [];
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_users");
  return (data as AdminUser[]) ?? [];
}

export type AdminRide = {
  id: string;
  direction: RideDirection;
  depart_date: string;
  depart_time: string;
  pickup_label: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  seats_total: number;
  seats_filled: number;
  status: RideStatus;
  show_phone_public: boolean;
  paired_ride_id: string | null;
  created_at: string;
  gender_only: string | null;
  event: string;
  driver: {
    name: string | null;
    phone: string | null;
    gender: string | null;
    role: string;
  };
  requests: { pending: number; approved: number; total: number };
  riders: {
    name: string | null;
    phone: string | null;
    status: "pending" | "approved" | "declined";
    seats: number;
  }[];
};

export async function getAllRides(): Promise<AdminRide[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_all_rides");
  return (data as AdminRide[]) ?? [];
}

export async function getAllLocations(): Promise<EventLocation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_locations")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as EventLocation[]) ?? [];
}
