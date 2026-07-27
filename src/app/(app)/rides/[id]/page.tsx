import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getRideDetail } from "@/lib/rides";
import { RideCard } from "@/components/ride-card";
import { RequestSeatButton } from "@/components/request-seat-button";
import { StatusPill } from "@/components/status-pill";
import { Button } from "@/components/ui/button";

export default async function RideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ride = await getRideDetail(id);
  if (!ride) notFound();

  function action() {
    if (ride!.is_mine)
      return (
        <Button asChild variant="outline" className="w-full">
          <Link href="/my-rides">Manage in My Rides</Link>
        </Button>
      );
    if (ride!.my_request_status === "pending")
      return <StatusPill tone="info">Requested · waiting for approval</StatusPill>;
    if (ride!.my_request_status === "approved")
      return <StatusPill tone="success">Approved · call the driver</StatusPill>;
    if (ride!.my_request_status === "declined")
      return <StatusPill tone="muted">Not approved</StatusPill>;
    if (ride!.is_full) return <StatusPill tone="muted">Ride full</StatusPill>;
    return (
      <RequestSeatButton
        rideId={ride!.id}
        seatsLeft={ride!.seats_total - ride!.seats_filled}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/rides"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All rides
      </Link>
      <RideCard ride={ride} action={action()} />
    </div>
  );
}
