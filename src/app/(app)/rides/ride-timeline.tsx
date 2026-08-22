"use client";

import { useState } from "react";
import { ChevronDown, MapPin, Phone } from "lucide-react";
import { GenderBadge, GenderOnlyPill, RoleBadge } from "@/components/badges";
import { RequestSeatButton } from "@/components/request-seat-button";
import { StatusPill } from "@/components/status-pill";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RideCard as Ride } from "@/lib/types";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function action(ride: Ride) {
  if (ride.my_request_status === "pending")
    return <StatusPill tone="info">Requested · waiting for approval</StatusPill>;
  if (ride.my_request_status === "approved")
    return <StatusPill tone="success">Approved · call the driver</StatusPill>;
  if (ride.my_request_status === "declined")
    return <StatusPill tone="muted">Not approved</StatusPill>;
  if (ride.is_full) return <StatusPill tone="muted">Fully booked</StatusPill>;
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

export function RideTimeline({ rides }: { rides: Ride[] }) {
  const [openId, setOpenId] = useState<string | null>(rides[0]?.id ?? null);

  return (
    <div className="relative">
      {/* rail line */}
      <div className="absolute bottom-8 left-[59px] top-4 w-px bg-border" />
      <div className="space-y-1">
        {rides.map((ride) => (
          <Row
            key={ride.id}
            ride={ride}
            open={openId === ride.id}
            onToggle={() => setOpenId(openId === ride.id ? null : ride.id)}
          />
        ))}
      </div>
      <p className="mt-4 pl-[76px] text-xs text-muted-foreground">
        That&apos;s everyone driving on this day.
      </p>
    </div>
  );
}

function Row({
  ride,
  open,
  onToggle,
}: {
  ride: Ride;
  open: boolean;
  onToggle: () => void;
}) {
  const left = Math.max(ride.seats_total - ride.seats_filled, 0);
  const [hm, period] = formatTime(ride.depart_time).split(" ");

  return (
    <div className="flex gap-0">
      <div className="w-12 shrink-0 pt-3.5 text-right">
        <p className="font-display text-base leading-none">{hm}</p>
        <p className="text-[10px] font-bold text-muted-foreground">{period}</p>
      </div>

      <div className="relative w-6 shrink-0">
        <span
          className={cn(
            "absolute left-1/2 top-4 size-3 -translate-x-1/2 rounded-full ring-4 ring-background",
            ride.is_full ? "bg-foreground/25" : "bg-[var(--gold)]",
          )}
        />
      </div>

      <div className="min-w-0 flex-1 pb-3">
        <button
          onClick={onToggle}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
            open
              ? "border-border bg-card shadow-sm"
              : "border-transparent hover:bg-secondary/70",
          )}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            {initials(ride.driver.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="font-display text-base">
                {ride.driver.name ?? "Driver"}
              </span>
              <GenderBadge gender={ride.driver.gender} />
              <RoleBadge role={ride.driver.role} />
              <GenderOnlyPill gender={ride.gender_only} />
            </span>
            <span className="text-xs text-muted-foreground">
              {ride.is_full
                ? "Fully booked"
                : `${left} of ${ride.seats_total} seats open`}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            {Array.from({ length: ride.seats_total }).map((_, k) => (
              <span
                key={k}
                className={cn(
                  "size-2 rounded-full",
                  // a ride the driver marked full counts every seat as taken,
                  // even the ones with no approved request behind them
                  ride.is_full || k < ride.seats_filled
                    ? "bg-foreground/20"
                    : "bg-[var(--success)]",
                )}
              />
            ))}
            <ChevronDown
              className={cn(
                "ml-0.5 size-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </span>
        </button>

        {open && (
          <div className="mt-2 overflow-hidden rounded-2xl border bg-card">
            <div className="flex items-start gap-2 px-4 py-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--gold-ink)]" />
              <div className="min-w-0 flex-1">
                <span className="text-muted-foreground">Picks you up at</span>{" "}
                <span className="font-medium break-words">
                  {ride.pickup_label}
                </span>
              </div>
            </div>
            {ride.driver_phone && (
              <a
                href={`tel:${ride.driver_phone}`}
                className="flex items-center gap-2 border-t px-4 py-3 text-sm font-medium text-[var(--success)]"
              >
                <Phone className="size-4" /> {ride.driver_phone}
              </a>
            )}
            <div className="border-t p-4">{action(ride)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
