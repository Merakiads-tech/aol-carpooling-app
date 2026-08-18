import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { getCachedEventLocations } from "@/lib/rides";
import { todayISO } from "@/lib/format";
import { RideListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/app";
import { FilterBar } from "./filter-bar";
import { RideResults } from "./ride-results";
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

  // Shell data (fast, cached) — keeps the filter bar responsive.
  const [profile, locations] = await Promise.all([
    getProfile(),
    getCachedEventLocations(),
  ]);
  const isFemale = profile?.gender === "female";
  const eventName = locations[0]?.name ?? "event";
  const womenOnly = womenParam && isFemale;

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

      <FilterBar
        eventName={eventName}
        isFemale={isFemale}
        direction={direction}
        date={date}
        today={today}
        womenOnly={womenOnly}
      />

      {/* Only the list streams/suspends — the filters above stay interactive. */}
      <Suspense
        key={`${direction}-${date}-${womenOnly}`}
        fallback={<RideListSkeleton count={3} />}
      >
        <RideResults direction={direction} date={date} womenOnly={womenOnly} />
      </Suspense>
    </div>
  );
}
