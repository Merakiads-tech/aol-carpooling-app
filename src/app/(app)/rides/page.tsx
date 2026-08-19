import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { getCachedEventLocations, getUpcomingRideFeed } from "@/lib/rides";
import { todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/app";
import { FindClient } from "./find-client";
import type { RideDirection } from "@/lib/types";

export const metadata: Metadata = { title: COPY.findRide };

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; date?: string; women?: string }>;
}) {
  const sp = await searchParams;
  const direction: RideDirection =
    sp.direction === "from_event" ? "from_event" : "to_event";
  const today = todayISO();
  const date = sp.date ?? today;
  const womenParam = sp.women === "1";

  // One fetch: all upcoming rides (both directions). The client filters by
  // date / direction instantly — no round-trip per switch.
  const [profile, locations, rides] = await Promise.all([
    getProfile(),
    getCachedEventLocations(),
    getUpcomingRideFeed(today),
  ]);
  const isFemale = profile?.gender === "female";
  const eventName = locations[0]?.name ?? "event";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link href="/rides/new">{COPY.offerRide}</Link>
        </Button>
      </div>

      <h1 className="text-xl font-semibold">{COPY.findRide}</h1>

      <FindClient
        rides={rides}
        today={today}
        initialDirection={direction}
        initialDate={date}
        initialWomenOnly={womenParam && isFemale}
        isFemale={isFemale}
        eventName={eventName}
      />
    </div>
  );
}
