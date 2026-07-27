"use client";

import { useActionState, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { COPY } from "@/config/app";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import type { EventLocation } from "@/lib/types";
import type { MapValue } from "@/components/map-picker";
import { createRideAction, type PostRideState } from "./actions";

const MapPicker = dynamic(() => import("@/components/map-picker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[240px] items-center justify-center rounded-xl border text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

const CHANDIGARH = { lat: 30.7333, lng: 76.7794 };

export function PostRideForm({
  locations,
  today,
}: {
  locations: EventLocation[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState<PostRideState, FormData>(
    createRideAction,
    {},
  );

  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [direction, setDirection] = useState<"to_event" | "from_event">(
    "to_event",
  );
  const [pickup, setPickup] = useState<MapValue | null>(null);
  const [seats, setSeats] = useState("3");
  const [includeReturn, setIncludeReturn] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [goingDate, setGoingDate] = useState(today);
  const [goingTime, setGoingTime] = useState("08:00");
  const [returnDate, setReturnDate] = useState(today);
  const [returnTime, setReturnTime] = useState("18:00");

  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === locationId) ?? locations[0],
    [locationId, locations],
  );
  const eventName = selectedLocation?.name ?? "the event";
  const defaultCenter =
    selectedLocation?.lat && selectedLocation?.lng
      ? { lat: Number(selectedLocation.lat), lng: Number(selectedLocation.lng) }
      : CHANDIGARH;

  return (
    <form action={formAction} className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Home
      </Link>

      <div>
        <h1 className="text-xl font-semibold">{COPY.offerRide}</h1>
        <p className="text-sm text-muted-foreground">
          Post your going trip — add the return in the same step.
        </p>
      </div>

      {/* Event location */}
      {locations.length > 1 ? (
        <div className="space-y-1.5">
          <Label>Event location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
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
      ) : (
        <input type="hidden" name="event_location_id" value={locationId} />
      )}
      {locations.length > 1 && (
        <input type="hidden" name="event_location_id" value={locationId} />
      )}

      {/* Direction */}
      <div className="space-y-1.5">
        <Label>Direction</Label>
        <div className="grid grid-cols-2 gap-2">
          <SegBtn
            active={direction === "to_event"}
            onClick={() => setDirection("to_event")}
          >
            To {eventName}
          </SegBtn>
          <SegBtn
            active={direction === "from_event"}
            onClick={() => setDirection("from_event")}
          >
            From {eventName}
          </SegBtn>
        </div>
        <input type="hidden" name="direction" value={direction} />
      </div>

      {/* Going date + time */}
      <div className="space-y-1.5">
        <Label>Date</Label>
        <DateField
          name="going_date"
          value={goingDate}
          today={today}
          onChange={setGoingDate}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Departure time</Label>
        <TimeField name="going_time" value={goingTime} onChange={setGoingTime} />
      </div>

      {/* Pickup */}
      <div className="space-y-1.5">
        <Label>Pickup point</Label>
        <MapPicker
          defaultCenter={defaultCenter}
          initial={pickup}
          onChange={setPickup}
        />
        {pickup && (
          <p className="text-sm">
            <span className="text-muted-foreground">Selected: </span>
            {pickup.label}
          </p>
        )}
        <input type="hidden" name="pickup_label" value={pickup?.label ?? ""} />
        <input type="hidden" name="pickup_lat" value={pickup?.lat ?? ""} />
        <input type="hidden" name="pickup_lng" value={pickup?.lng ?? ""} />
      </div>

      {/* Seats */}
      <div className="space-y-1.5">
        <Label>Seats available</Label>
        <Select value={seats} onValueChange={setSeats}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} {n === 1 ? "seat" : "seats"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="seats" value={seats} />
      </div>

      {/* Return */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Also posting my return?</p>
            <p className="text-sm text-muted-foreground">
              Same pickup point, opposite direction.
            </p>
          </div>
          <Switch checked={includeReturn} onCheckedChange={setIncludeReturn} />
        </div>
        <input
          type="hidden"
          name="include_return"
          value={String(includeReturn)}
        />

        {includeReturn && (
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Return date</Label>
              <DateField
                name="return_date"
                value={returnDate}
                today={today}
                onChange={setReturnDate}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Return time</Label>
              <TimeField
                name="return_time"
                value={returnTime}
                onChange={setReturnTime}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="return_seats">Return seats</Label>
              <Input
                id="return_seats"
                name="return_seats"
                type="number"
                min={1}
                max={6}
                defaultValue={seats}
              />
            </div>
          </div>
        )}
      </div>

      {/* Show phone */}
      <label className="flex items-center justify-between rounded-xl border p-4">
        <div>
          <p className="font-medium">Show my phone on the listing</p>
          <p className="text-sm text-muted-foreground">
            Otherwise it&apos;s shared only after you approve a rider.
          </p>
        </div>
        <Switch checked={showPhone} onCheckedChange={setShowPhone} />
      </label>
      <input type="hidden" name="show_phone" value={String(showPhone)} />

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || !pickup}
      >
        {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
        {includeReturn ? "Post going & return" : "Post ride"}
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
        "rounded-lg border py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/5 text-primary"
          : "hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
