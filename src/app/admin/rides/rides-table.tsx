"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { AdminRide } from "@/lib/admin";
import { formatDate, formatTime, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adminDeleteRideAction, adminSetRideHiddenAction } from "./actions";

type Scope = "all" | "today" | "upcoming";

const STATUS_STYLE: Record<AdminRide["status"], string> = {
  active: "bg-[var(--success)]/10 text-[var(--success)]",
  full: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  cancelled: "bg-muted text-muted-foreground",
};

/** "cancelled" is how a ride is hidden from the rider-facing feed. */
const STATUS_LABEL: Record<AdminRide["status"], string> = {
  active: "active",
  full: "full",
  cancelled: "hidden",
};

const RIDER_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  approved: "bg-[var(--success)]/10 text-[var(--success)]",
  declined: "bg-muted text-muted-foreground line-through",
};

export function RidesTable({ rides }: { rides: AdminRide[] }) {
  const today = todayISO();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("upcoming");
  const [day, setDay] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rides.filter((r) => {
      if (q) {
        const hay = `${r.driver.name ?? ""} ${r.event} ${r.pickup_label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (day) return r.depart_date === day;
      if (scope === "today") return r.depart_date === today;
      if (scope === "upcoming") return r.depart_date >= today;
      return true;
    });
  }, [rides, query, scope, day, today]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search driver, pickup, event…"
            className="h-10 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus:border-foreground/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            {(["all", "today", "upcoming"] as Scope[]).map((sc) => (
              <button
                key={sc}
                onClick={() => {
                  setScope(sc);
                  setDay("");
                }}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                  !day && scope === sc
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {sc}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={cn(
              "h-9 rounded-lg border bg-card px-2 text-xs outline-none focus:border-foreground/30",
              day && "border-foreground/30 text-foreground",
            )}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rides.length} rides
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <Th>When</Th>
              <Th>Route</Th>
              <Th>Driver</Th>
              <Th className="text-center">Seats</Th>
              <Th className="text-center">Requests</Th>
              <Th>Status</Th>
              <Th className="w-8" />
            </tr>
          </thead>
          {filtered.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  No rides match.
                </td>
              </tr>
            </tbody>
          ) : (
              filtered.map((r) => {
                const open = expanded.has(r.id);
                return (
                  <tbody key={r.id} className="border-b last:border-0">
                    <tr
                      className={cn(
                        "cursor-pointer align-middle hover:bg-muted/30",
                        open && "bg-muted/30",
                      )}
                      onClick={() => toggle(r.id)}
                    >
                      <Td>
                        <div className="font-medium">{formatDate(r.depart_date)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTime(r.depart_time)}
                        </div>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1.5">
                          {r.direction === "to_event" ? (
                            <ArrowRight className="size-3.5 text-muted-foreground" />
                          ) : (
                            <RotateCcw className="size-3.5 text-muted-foreground" />
                          )}
                          <span className="truncate">
                            {r.direction === "to_event" ? "To" : "From"} {r.event}
                          </span>
                        </span>
                      </Td>
                      <Td>
                        <div className="font-medium">{r.driver.name ?? "—"}</div>
                        {r.driver.phone && (
                          <a
                            href={`tel:${r.driver.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-primary"
                          >
                            <Phone className="size-3" /> {r.driver.phone}
                          </a>
                        )}
                      </Td>
                      <Td className="text-center tabular-nums">
                        {r.seats_filled}/{r.seats_total}
                      </Td>
                      <Td className="text-center">
                        <span className="inline-flex items-center gap-1">
                          {r.requests.pending > 0 && (
                            <Pill className={RIDER_STYLE.pending}>
                              {r.requests.pending}p
                            </Pill>
                          )}
                          {r.requests.approved > 0 && (
                            <Pill className={RIDER_STYLE.approved}>
                              {r.requests.approved}a
                            </Pill>
                          )}
                          {r.requests.total === 0 && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </span>
                      </Td>
                      <Td>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLE[r.status],
                          )}
                        >
                          {STATUS_LABEL[r.status]}
                        </span>
                      </Td>
                      <Td>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </Td>
                    </tr>

                    {open && (
                      <tr className="bg-muted/20">
                        <td colSpan={7} className="space-y-3 px-4 py-3">
                          <p className="flex items-start gap-1.5 text-sm">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Pickup:
                            </span>
                            <span className="font-medium">
                              {r.pickup_label}
                            </span>
                          </p>

                          <RideActions ride={r} />

                          <p className="text-xs font-medium text-muted-foreground">
                            {r.riders.length === 0
                              ? "No requests yet"
                              : `${r.riders.length} requester${r.riders.length === 1 ? "" : "s"}`}
                          </p>
                          <ul className="space-y-1.5">
                            {r.riders.map((rider, i) => (
                              <li
                                key={i}
                                className="flex flex-wrap items-center gap-2 text-sm"
                              >
                                <Pill className={RIDER_STYLE[rider.status]}>
                                  {rider.status}
                                </Pill>
                                <span className="font-medium">
                                  {rider.name ?? "—"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {rider.seats} {rider.seats === 1 ? "seat" : "seats"}
                                </span>
                                {rider.phone && (
                                  <a
                                    href={`tel:${rider.phone}`}
                                    className="inline-flex items-center gap-1 text-xs text-primary"
                                  >
                                    <Phone className="size-3" /> {rider.phone}
                                  </a>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })
          )}
        </table>
      </div>
    </div>
  );
}

/**
 * Hide / restore and hard-delete, shown inside the expanded row. Hiding sets
 * the ride to `cancelled` so it drops out of the rider feed; deleting removes
 * the ride and its requests for good.
 */
function RideActions({ ride }: { ride: AdminRide }) {
  const [pending, start] = useTransition();
  const hidden = ride.status === "cancelled";

  function setHidden(next: boolean) {
    start(async () => {
      const res = await adminSetRideHiddenAction(ride.id, next);
      if (res.error) toast.error(res.error);
      else toast.success(next ? "Ride hidden from riders." : "Ride restored.");
    });
  }

  function remove() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const res = await adminDeleteRideAction(ride.id);
        if (res.error) toast.error(res.error);
        else toast.success("Ride deleted.");
        resolve();
      });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setHidden(!hidden)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : hidden ? (
          <Eye className="size-3.5" />
        ) : (
          <EyeOff className="size-3.5" />
        )}
        {hidden ? "Restore ride" : "Hide ride"}
      </button>

      <ConfirmDialog
        destructive
        trigger={
          <button
            type="button"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            Delete ride
          </button>
        }
        title="Delete this ride?"
        description={
          <>
            <p>
              {formatDate(ride.depart_date)} ·{" "}
              {formatTime(ride.depart_time)} ·{" "}
              {ride.driver.name ?? "Unknown driver"}
            </p>
            <p>
              This permanently removes the ride and all {ride.requests.total}{" "}
              seat {ride.requests.total === 1 ? "request" : "requests"} on it.
              It can&apos;t be undone.
            </p>
            {ride.requests.approved > 0 && (
              <p className="font-medium text-destructive">
                {ride.requests.approved} rider
                {ride.requests.approved === 1 ? " has" : "s have"} a confirmed
                seat. Hiding the ride may be the safer option.
              </p>
            )}
          </>
        }
        confirmLabel="Delete ride"
        onConfirm={remove}
      />

      <span className="text-xs text-muted-foreground">
        {hidden
          ? "Hidden — riders can't see or request this ride."
          : "Hiding keeps the record but removes it from the rider feed."}
      </span>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-3 py-2.5 font-medium", className)}>{children}</th>
  );
}

function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5", className)}>{children}</td>;
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-1.5 py-0.5 text-xs font-medium capitalize",
        className,
      )}
    >
      {children}
    </span>
  );
}
