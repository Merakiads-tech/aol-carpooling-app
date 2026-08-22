import { Clock, MapPin, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GenderBadge, GenderOnlyPill, RoleBadge } from "@/components/badges";
import { RouteLabel } from "@/components/route-label";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RideCard as Ride } from "@/lib/types";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function RideCard({
  ride,
  action,
}: {
  ride: Ride;
  action?: React.ReactNode;
}) {
  const seatsLeft = Math.max(ride.seats_total - ride.seats_filled, 0);
  const toEvent = ride.direction === "to_event";

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Direction ribbon */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 text-sm font-medium",
          toEvent
            ? "bg-[var(--gold-soft)] text-[var(--gold-ink)]"
            : "bg-secondary text-secondary-foreground",
        )}
      >
        <RouteLabel
          direction={ride.direction}
          eventName={ride.event_location.name}
        />
        <SeatDots
          total={ride.seats_total}
          filled={ride.seats_filled}
          isFull={ride.is_full}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-11">
            <AvatarImage src={ride.driver.photo_url ?? undefined} alt="" />
            <AvatarFallback>{initials(ride.driver.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">
                {ride.driver.name ?? "Driver"}
              </span>
              <GenderBadge gender={ride.driver.gender} />
              <RoleBadge role={ride.driver.role} />
              <GenderOnlyPill gender={ride.gender_only} />
            </div>
            <p className="text-sm text-muted-foreground">
              {ride.is_full
                ? "Fully booked"
                : `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} left`}
            </p>
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="font-medium">
              {formatDate(ride.depart_date)} · {formatTime(ride.depart_time)}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="min-w-0 break-words">{ride.pickup_label}</span>
          </div>
        </dl>

        {ride.driver_phone && (
          <a
            href={`tel:${ride.driver_phone}`}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--success)]/10 px-3 py-2 text-sm font-medium text-[var(--success)]"
          >
            <Phone className="size-4" aria-hidden />
            {ride.driver_phone}
          </a>
        )}

        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  );
}

function SeatDots({
  total,
  filled,
  isFull,
}: {
  total: number;
  filled: number;
  isFull: boolean;
}) {
  // A ride marked full has every seat taken, whatever the approved count says.
  const taken = isFull ? total : filled;
  return (
    <span
      className="flex items-center gap-1"
      aria-label={`${taken} of ${total} seats filled`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full",
            i < taken ? "bg-current opacity-90" : "bg-current opacity-25",
          )}
        />
      ))}
    </span>
  );
}
