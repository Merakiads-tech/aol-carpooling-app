import { Clock, Link2, MapPin, Phone, Users } from "lucide-react";
import { getAllRides } from "@/lib/admin";
import { RouteLabel } from "@/components/route-label";
import { GenderBadge, RoleBadge } from "@/components/badges";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Gender, RideStatus, UserRole } from "@/lib/types";

const STATUS_STYLE: Record<RideStatus, string> = {
  active: "bg-[var(--success)]/10 text-[var(--success)]",
  full: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function AdminRidesPage() {
  const rides = await getAllRides();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-muted-foreground">
        {rides.length} {rides.length === 1 ? "ride" : "rides"} (all legs)
      </h2>

      {rides.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No rides posted yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rides.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <RouteLabel direction={r.direction} eventName={r.event} />
                <div className="flex items-center gap-1.5">
                  {r.paired_ride_id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Link2 className="size-3" /> Paired
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLE[r.status],
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />
                  {formatDate(r.depart_date)} · {formatTime(r.depart_time)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {r.pickup_label}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {r.seats_filled}/{r.seats_total} filled
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3">
                <span className="font-medium">{r.driver.name ?? "—"}</span>
                <GenderBadge gender={r.driver.gender as Gender | null} />
                <RoleBadge role={r.driver.role as UserRole} />
                {r.driver.phone && (
                  <a
                    href={`tel:${r.driver.phone}`}
                    className="inline-flex items-center gap-1 text-sm text-primary"
                  >
                    <Phone className="size-3.5" /> {r.driver.phone}
                  </a>
                )}
                {r.show_phone_public && (
                  <span className="text-xs text-muted-foreground">
                    · phone public
                  </span>
                )}
              </div>

              <div className="mt-2 flex gap-2 text-xs">
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  {r.requests.pending} pending
                </span>
                <span className="rounded-full bg-[var(--success)]/10 px-2 py-0.5 font-medium text-[var(--success)]">
                  {r.requests.approved} approved
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                  {r.requests.total} total
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
