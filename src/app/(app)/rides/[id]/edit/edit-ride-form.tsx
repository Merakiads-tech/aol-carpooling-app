"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimeField } from "@/components/time-field";
import { PlacesInput, type PlaceValue } from "@/components/places-input";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EditableRide, Gender, RideDirection } from "@/lib/types";
import { updateRideAction, type EditRideState } from "./actions";

function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  );
}

/**
 * Edits one leg of an already-posted ride. Only reachable while no seat is
 * booked; the paired return leg (if any) is edited separately.
 */
export function EditRideForm({
  ride,
  today,
  driverGender,
}: {
  ride: EditableRide;
  today: string;
  driverGender: Gender | null;
}) {
  const [state, formAction, pending] = useActionState<EditRideState, FormData>(
    updateRideAction,
    {},
  );

  const [direction, setDirection] = useState<RideDirection>(ride.direction);
  const [date, setDate] = useState(ride.depart_date);
  const [time, setTime] = useState(ride.depart_time);
  const [seats, setSeats] = useState(ride.seats_total);
  const [pickup, setPickup] = useState<PlaceValue>({
    label: ride.pickup_label,
    lat: ride.pickup_lat,
    lng: ride.pickup_lng,
  });
  const [showPhone, setShowPhone] = useState(ride.show_phone_public);
  const [genderOnly, setGenderOnly] = useState(ride.gender_only != null);

  const eventName = ride.event_location.name;
  const toEvent = direction === "to_event";

  return (
    <form action={formAction} className="space-y-7 pb-4">
      <input type="hidden" name="ride_id" value={ride.id} />

      <div>
        <Link
          href="/my-rides"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> My Rides
        </Link>
        <h1 className="mt-2 text-[26px] leading-tight">Edit Ride</h1>
        <p className="text-muted-foreground">
          {eventName} · no seats booked yet, so everything is still editable.
        </p>
      </div>

      {ride.pending_requests > 0 && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/5 dark:text-amber-300">
          {ride.pending_requests}{" "}
          {ride.pending_requests === 1 ? "person has" : "people have"} asked for
          a seat. They&apos;ll see the updated details — let them know if the
          time or pickup changes.
        </p>
      )}

      {/* Route */}
      <div>
        <Kicker>Route</Kicker>
        <div className="flex rounded-2xl border bg-card p-1">
          <SegBtn active={toEvent} onClick={() => setDirection("to_event")}>
            Going to {eventName}
          </SegBtn>
          <SegBtn
            active={!toEvent}
            onClick={() => setDirection("from_event")}
          >
            Return from {eventName}
          </SegBtn>
        </div>
        <input type="hidden" name="direction" value={direction} />
      </div>

      {/* Date */}
      <div>
        <Kicker>Date</Kicker>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-13 w-full items-center justify-between rounded-2xl border bg-card px-4 text-left text-base"
            >
              {formatLongDate(date)}
              <CalendarDays className="size-5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parseISO(date)}
              onSelect={(d) => d && setDate(toISO(d))}
              disabled={{ before: parseISO(today) }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
        <input type="hidden" name="depart_date" value={date} />
      </div>

      {/* Time */}
      <div>
        <Kicker>Departure time</Kicker>
        <TimeField name="depart_time" value={time} onChange={setTime} />
      </div>

      {/* Seats counter */}
      <div>
        <Kicker>Seats to offer</Kicker>
        <div className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4">
          <button
            type="button"
            aria-label="Fewer seats"
            onClick={() => setSeats((s) => Math.max(1, s - 1))}
            disabled={seats <= 1}
            className="flex size-11 items-center justify-center rounded-full border text-foreground disabled:opacity-40"
          >
            <Minus className="size-5" />
          </button>
          <div className="text-center">
            <span className="font-display text-4xl leading-none">{seats}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {seats === 1 ? "seat" : "seats"}
            </span>
          </div>
          <button
            type="button"
            aria-label="More seats"
            onClick={() => setSeats((s) => Math.min(6, s + 1))}
            disabled={seats >= 6}
            className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Plus className="size-5" />
          </button>
        </div>
        <input type="hidden" name="seats" value={seats} />
      </div>

      {/* Pickup */}
      <div>
        <Kicker>Pickup location</Kicker>
        <PlacesInput value={pickup} onChange={setPickup} />
        <input type="hidden" name="pickup_label" value={pickup.label} />
        <input type="hidden" name="pickup_lat" value={pickup.lat ?? ""} />
        <input type="hidden" name="pickup_lng" value={pickup.lng ?? ""} />
      </div>

      {/* Quick options */}
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-2xl border px-4 py-3.5">
          <span className="text-sm">
            <span className="block font-medium">
              Show my phone on the listing
            </span>
            <span className="text-muted-foreground">
              Otherwise shared only after you approve.
            </span>
          </span>
          <Switch checked={showPhone} onCheckedChange={setShowPhone} />
        </label>
        <input type="hidden" name="show_phone" value={String(showPhone)} />

        {(driverGender === "male" || driverGender === "female") && (
          <>
            <label className="flex items-center justify-between rounded-2xl border px-4 py-3.5">
              <span className="text-sm">
                <span className="block font-medium">
                  {driverGender === "female"
                    ? "Reserve all seats for women"
                    : "Reserve all seats for men"}
                </span>
                <span className="text-muted-foreground">
                  Only {driverGender === "female" ? "women" : "men"} will see
                  this ride.
                </span>
              </span>
              <Switch checked={genderOnly} onCheckedChange={setGenderOnly} />
            </label>
            <input type="hidden" name="gender_only" value={String(genderOnly)} />
          </>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-13 flex-1 rounded-2xl text-base"
        >
          <Link href="/my-rides">Cancel</Link>
        </Button>
        <Button
          type="submit"
          size="lg"
          className="h-13 flex-1 rounded-2xl text-base font-semibold"
          disabled={pending || !pickup.label.trim()}
        >
          {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Save changes
        </Button>
      </div>
    </form>
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
        "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
