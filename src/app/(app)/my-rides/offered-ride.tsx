"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BellRing,
  Check,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Users,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GenderBadge, RoleBadge } from "@/components/badges";
import { directionLabel, formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OfferedRide } from "@/lib/types";
import { respondToRequestAction, setRideStatusAction } from "./actions";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function OfferedRideCard({ ride }: { ride: OfferedRide }) {
  const [pending, start] = useTransition();
  const pendingReqs = ride.requests.filter((r) => r.status === "pending");
  const approvedReqs = ride.requests.filter((r) => r.status === "approved");
  const declinedReqs = ride.requests.filter((r) => r.status === "declined");
  const isFull = ride.status === "full";
  const toEvent = ride.direction === "to_event";

  function toggleFull() {
    start(async () => {
      const res = await setRideStatusAction(ride.id, isFull ? "active" : "full");
      if (res.error) toast.error(res.error);
      else toast.success(isFull ? "Ride reopened." : "Marked as full.");
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 text-sm font-medium",
          toEvent
            ? "bg-primary/10 text-primary"
            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        )}
      >
        <span className="inline-flex items-center gap-1.5">
          <ArrowUpRight className={cn("size-4", !toEvent && "rotate-180")} />
          {directionLabel(ride.direction, ride.event_location.name)}
        </span>
        <Button
          size="sm"
          variant={isFull ? "secondary" : "outline"}
          onClick={toggleFull}
          disabled={pending}
          className="h-7"
        >
          {isFull ? "Reopen" : "Mark Full"}
        </Button>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" />
            {formatDate(ride.depart_date)} · {formatTime(ride.depart_time)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {ride.pickup_label}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {ride.seats_filled}/{ride.seats_total} seats
          </span>
        </div>

        {/* Prominent "new requests" call-out */}
        {pendingReqs.length > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            <BellRing className="size-4" />
            {pendingReqs.length} new{" "}
            {pendingReqs.length === 1 ? "request" : "requests"} — respond below
          </div>
        )}

        {ride.requests.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No requests yet. Share the app with fellow travellers.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {[...pendingReqs, ...approvedReqs, ...declinedReqs].map((req) => (
              <li
                key={req.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3",
                  req.status === "pending" &&
                    "border-amber-300/60 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-500/5",
                )}
              >
                <Avatar className="size-9">
                  <AvatarImage src={req.rider.photo_url ?? undefined} alt="" />
                  <AvatarFallback>{initials(req.rider.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium">
                      {req.rider.name ?? "Rider"}
                    </span>
                    <GenderBadge gender={req.rider.gender} />
                    <RoleBadge role={req.rider.role} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    wants {req.seats} {req.seats === 1 ? "seat" : "seats"}
                  </span>
                  {req.status === "approved" && req.rider_phone && (
                    <a
                      href={`tel:${req.rider_phone}`}
                      className="ml-2 inline-flex items-center gap-1 text-sm text-[var(--success)]"
                    >
                      <Phone className="size-3.5" /> {req.rider_phone}
                    </a>
                  )}
                </div>

                {req.status === "pending" && <RequestActions requestId={req.id} />}
                {req.status === "approved" && (
                  <span className="rounded-full bg-[var(--success)]/10 px-2 py-1 text-xs font-medium text-[var(--success)]">
                    Approved
                  </span>
                )}
                {req.status === "declined" && (
                  <span className="text-xs text-muted-foreground">Declined</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RequestActions({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();

  function respond(approve: boolean) {
    start(async () => {
      const res = await respondToRequestAction(requestId, approve);
      if (res.error) toast.error(res.error);
      else toast.success(approve ? "Approved — numbers shared." : "Declined.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {pending ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <>
          <button
            aria-label="Approve"
            onClick={() => respond(true)}
            className="flex size-9 items-center justify-center rounded-lg bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90"
          >
            <Check className="size-4.5" />
          </button>
          <button
            aria-label="Decline"
            onClick={() => respond(false)}
            className="flex size-9 items-center justify-center rounded-lg border hover:bg-accent"
          >
            <X className="size-4.5" />
          </button>
        </>
      )}
    </div>
  );
}
