"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CarFront } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DateChips } from "@/components/date-chips";
import { COPY } from "@/config/app";
import { cn } from "@/lib/utils";
import { RideTimeline } from "./ride-timeline";
import type { RideCard, RideDirection } from "@/lib/types";

/**
 * Loads every upcoming ride once (both directions) and does all date/direction
 * filtering on the client, so switching is instant. Date chips show how many
 * rides each day has for the selected direction.
 */
export function FindClient({
  rides,
  today,
  initialDirection,
  initialDate,
  initialWomenOnly,
  isFemale,
  eventName,
}: {
  rides: RideCard[];
  today: string;
  initialDirection: RideDirection;
  initialDate: string;
  initialWomenOnly: boolean;
  isFemale: boolean;
  eventName: string;
}) {
  const [direction, setDirection] = useState<RideDirection>(initialDirection);
  const [date, setDate] = useState(initialDate);
  const [womenOnly, setWomenOnly] = useState(initialWomenOnly && isFemale);

  // Keep the URL shareable / back-friendly without a server round-trip.
  const syncUrl = (d: RideDirection, dt: string, w: boolean) => {
    const sp = new URLSearchParams();
    sp.set("direction", d);
    sp.set("date", dt);
    if (w) sp.set("women", "1");
    window.history.replaceState(null, "", `/rides?${sp.toString()}`);
  };
  const pickDirection = (d: RideDirection) => {
    setDirection(d);
    syncUrl(d, date, womenOnly);
  };
  const pickDate = (dt: string) => {
    setDate(dt);
    syncUrl(direction, dt, womenOnly);
  };
  const pickWomen = (w: boolean) => {
    setWomenOnly(w);
    syncUrl(direction, date, w);
  };

  // Rides for the current direction (+ women filter) — drives counts and list.
  const forDirection = useMemo(
    () =>
      rides.filter(
        (r) =>
          r.direction === direction &&
          (!womenOnly || r.driver.gender === "female"),
      ),
    [rides, direction, womenOnly],
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of forDirection) m[r.depart_date] = (m[r.depart_date] ?? 0) + 1;
    return m;
  }, [forDirection]);

  // Chronological, but at the same departure time a car with seats left beats
  // one that's already full — a full ride is no use to someone browsing.
  const dayRides = useMemo(
    () =>
      forDirection
        .filter((r) => r.depart_date === date)
        .sort(
          (a, b) =>
            a.depart_time.localeCompare(b.depart_time) ||
            Number(a.is_full) - Number(b.is_full),
        ),
    [forDirection, date],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <SegBtn
            active={direction === "to_event"}
            onClick={() => pickDirection("to_event")}
          >
            Going to {eventName}
          </SegBtn>
          <SegBtn
            active={direction === "from_event"}
            onClick={() => pickDirection("from_event")}
          >
            Return from {eventName}
          </SegBtn>
        </div>

        <div className="space-y-1.5">
          <Label>Date</Label>
          <DateChips
            value={date}
            today={today}
            counts={counts}
            onChange={pickDate}
          />
        </div>

        {isFemale && (
          <label className="flex items-center justify-between rounded-lg border bg-[var(--female)]/5 px-3 py-2.5">
            <span className="text-sm font-medium">Women drivers only</span>
            <Switch checked={womenOnly} onCheckedChange={pickWomen} />
          </label>
        )}
      </div>

      {dayRides.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <CarFront className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No cars on this route yet. Be the first to offer a seat.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/rides/new">{COPY.offerRide}</Link>
          </Button>
        </div>
      ) : (
        <RideTimeline key={`${direction}-${date}`} rides={dayRides} />
      )}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2 py-2.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/5 text-primary" : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
