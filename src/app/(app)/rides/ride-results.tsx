import Link from "next/link";
import { CarFront } from "lucide-react";
import { getRideFeed } from "@/lib/rides";
import { RideCard } from "@/components/ride-card";
import { RequestSeatButton } from "@/components/request-seat-button";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/app";
import type { RideCard as Ride, RideDirection } from "@/lib/types";

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
      direction={ride.direction}
      date={ride.depart_date}
      eventName={ride.event_location.name}
    />
  );
}

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
      <div className="rounded-xl border border-dashed p-10 text-center">
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

  return (
    <ul className="space-y-3">
      {rides.map((ride) => (
        <li key={ride.id}>
          <RideCard ride={ride} action={rideAction(ride)} />
        </li>
      ))}
    </ul>
  );
}
