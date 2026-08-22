import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMyRide } from "@/lib/rides";
import { getProfile } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { EditRideForm } from "./edit-ride-form";

export const metadata: Metadata = { title: "Edit Ride" };
export const dynamic = "force-dynamic";

export default async function EditRidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const today = todayISO();
  const [ride, profile] = await Promise.all([getMyRide(id), getProfile()]);

  // get_my_ride only returns rides the caller drives.
  if (!ride) notFound();

  // Same gates as update_my_ride: a departed ride is history, and once a seat
  // is booked the ride is locked.
  const past = ride.depart_date < today;
  if (past || ride.approved_seats > 0 || ride.status === "cancelled") {
    return (
      <div className="space-y-4">
        <Link
          href="/my-rides"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> My Rides
        </Link>
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {past
            ? "This ride has already departed, so it can no longer be edited."
            : ride.status === "cancelled"
              ? "This ride has been taken down by a Ride Admin and can no longer be edited."
              : "Seats are already booked on this ride, so it can't be edited. Delete it and post a new one if the plan changed."}
        </div>
      </div>
    );
  }

  return (
    <EditRideForm
      ride={ride}
      today={today}
      driverGender={profile?.gender ?? null}
    />
  );
}
