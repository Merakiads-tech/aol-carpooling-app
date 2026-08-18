"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimeField } from "@/components/time-field";
import { PlacesInput, type PlaceValue } from "@/components/places-input";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventLocation, Gender } from "@/lib/types";
import { createRideAction, type PostRideState } from "./actions";

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

export function PostRideForm({
  locations,
  today,
  driverGender,
}: {
  locations: EventLocation[];
  today: string;
  driverGender: Gender | null;
}) {
  const [state, formAction, pending] = useActionState<PostRideState, FormData>(
    createRideAction,
    {},
  );

  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [direction, setDirection] = useState<"to_event" | "from_event">(
    "to_event",
  );
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("08:00");
  const [seats, setSeats] = useState(2);
  const [pickup, setPickup] = useState<PlaceValue>({
    label: "",
    lat: null,
    lng: null,
  });
  const [includeReturn, setIncludeReturn] = useState(false);
  const [returnTime, setReturnTime] = useState("18:00");
  const [showPhone, setShowPhone] = useState(false);
  const [genderOnly, setGenderOnly] = useState(false);

  const eventName = useMemo(
    () => locations.find((l) => l.id === locationId)?.name ?? "the event",
    [locationId, locations],
  );
  const toEvent = direction === "to_event";
  const canReturn = toEvent; // return only offered for the outbound leg

  return (
    <form action={formAction} className="space-y-7 pb-4">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <h1 className="mt-2 text-[26px] leading-tight">Offer a Seat</h1>
        <p className="text-muted-foreground">Share your car, split the drive.</p>
      </div>

      {locations.length > 1 && (
        <div>
          <Kicker>Event</Kicker>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="h-13 w-full rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <input type="hidden" name="event_location_id" value={locationId} />

      {/* Route */}
      <div>
        <Kicker>Route</Kicker>
        <div className="flex rounded-2xl border bg-card p-1">
          <SegBtn active={toEvent} onClick={() => setDirection("to_event")}>
            Going to {eventName}
          </SegBtn>
          <SegBtn
            active={!toEvent}
            onClick={() => {
              setDirection("from_event");
              setIncludeReturn(false);
            }}
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
        <input type="hidden" name="going_date" value={date} />
      </div>

      {/* Time */}
      <div>
        <Kicker>Departure time</Kicker>
        <TimeField name="going_time" value={time} onChange={setTime} />
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

      {/* Return (only for the outbound leg) */}
      {canReturn && (
        <div className="rounded-2xl border p-4">
          <label className="flex items-center justify-between">
            <span>
              <span className="block font-semibold">
                I&apos;m also driving back
              </span>
              <span className="text-sm text-muted-foreground">
                Post the return in the same step — same pickup point.
              </span>
            </span>
            <Switch checked={includeReturn} onCheckedChange={setIncludeReturn} />
          </label>
          {includeReturn && (
            <div className="mt-4 space-y-1.5">
              <Label>Return departure time</Label>
              <TimeField
                name="return_time"
                value={returnTime}
                onChange={setReturnTime}
              />
            </div>
          )}
        </div>
      )}
      <input
        type="hidden"
        name="include_return"
        value={String(canReturn && includeReturn)}
      />
      <input type="hidden" name="return_date" value={date} />
      <input type="hidden" name="return_seats" value={seats} />

      {/* Quick options */}
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-2xl border px-4 py-3.5">
          <span className="text-sm">
            <span className="block font-medium">Show my phone on the listing</span>
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

      <Button
        type="submit"
        size="lg"
        className="h-13 w-full rounded-2xl text-base font-semibold"
        disabled={pending || !pickup.label.trim()}
      >
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {canReturn && includeReturn ? "Offer both rides" : "Offer Seat"}
      </Button>
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
