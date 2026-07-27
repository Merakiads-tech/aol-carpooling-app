import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CarFront } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { getEventLocations, getRideFeed } from "@/lib/rides";
import { todayISO } from "@/lib/format";
import { RideCard } from "@/components/ride-card";
import { RequestSeatButton } from "@/components/request-seat-button";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/app";
import { FilterBar } from "./filter-bar";
import type { RideCard as Ride, RideDirection } from "@/lib/types";

export const metadata: Metadata = { title: COPY.findRide };

function rideAction(ride: Ride) {
  if (ride.my_request_status === "pending")
    return <StatusPill tone="info">Requested · waiting for approval</StatusPill>;
  if (ride.my_request_status === "approved")
    return <StatusPill tone="success">Approved · call the driver</StatusPill>;
  if (ride.my_request_status === "declined")
    return <StatusPill tone="muted">Not approved</StatusPill>;
  if (ride.is_full) return <StatusPill tone="muted">Ride full</StatusPill>;
  return (
    <RequestSeatButton
      rideId={ride.id}
      seatsLeft={ride.seats_total - ride.seats_filled}
    />
  );
}

export default async function RidesPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; date?: string; women?: string }>;
}) {
  const sp = await searchParams;
  const direction: RideDirection =
    sp.direction === "from_event" ? "from_event" : "to_event";
  const date = sp.date ?? todayISO();
  const womenOnly = sp.women === "1";

  const [profile, locations] = await Promise.all([
    getProfile(),
    getEventLocations(),
  ]);
  const isFemale = profile?.gender === "female";
  const eventName = locations[0]?.name ?? "event";

  const rides = await getRideFeed(direction, date, womenOnly && isFemale);

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
        today={todayISO()}
        womenOnly={womenOnly}
      />

      {rides.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <CarFront className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No cars on this route yet. Be the first to offer a seat.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/rides/new">{COPY.offerRide}</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rides.map((ride) => (
            <li key={ride.id}>
              <RideCard ride={ride} action={rideAction(ride)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
