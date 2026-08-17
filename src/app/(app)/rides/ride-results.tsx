import Link from "next/link";
import { CarFront } from "lucide-react";
import { getRideFeed } from "@/lib/rides";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/app";
import { RideTimeline } from "./ride-timeline";
import type { RideDirection } from "@/lib/types";

export async function RideResults({
  direction,
  date,
  womenOnly,
}: {
  direction: RideDirection;
  date: string;
  womenOnly: boolean;
}) {
  const rides = await getRideFeed(direction, date, womenOnly);

  if (rides.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <CarFront className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No cars on this route yet. Be the first to offer a seat.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/rides/new">{COPY.offerRide}</Link>
        </Button>
      </div>
    );
  }

  return <RideTimeline rides={rides} />;
}
