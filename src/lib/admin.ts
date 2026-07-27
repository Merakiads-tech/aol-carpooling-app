import "server-only";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { EventLocation } from "@/lib/types";

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  return !!email && adminEmails().includes(email.toLowerCase());
}

/** Redirect to login if signed out, 404 if signed in but not an admin. */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) notFound();
  return user;
}

export type AdminStats = {
  rides_active: number;
  rides_total: number;
  requests_pending: number;
  seats_total: number;
  seats_filled: number;
  users: number;
};

export type PendingRequest = {
  id: string;
  created_at: string;
  ride: { depart_date: string; depart_time: string; direction: string; event: string };
  driver: { name: string | null; phone: string | null };
  rider: { name: string | null };
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

export async function getPendingRequests(): Promise<PendingRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_pending_requests");
  return (data as PendingRequest[]) ?? [];
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_users");
  return (data as AdminUser[]) ?? [];
}

export async function getAllLocations(): Promise<EventLocation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_locations")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as EventLocation[]) ?? [];
}
