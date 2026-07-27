import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEventLocations } from "@/lib/rides";
import { todayISO } from "@/lib/format";
import { PostRideForm } from "./post-ride-form";

export const metadata: Metadata = { title: "Offer a Ride" };

export default async function PostRidePage() {
  const locations = await getEventLocations();

  if (locations.length === 0) {
    return (
      <div className="space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No event locations yet. An admin needs to add one first.
        </div>
      </div>
    );
  }

  return <PostRideForm locations={locations} today={todayISO()} />;
}
