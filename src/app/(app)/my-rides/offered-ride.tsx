"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  EyeOff,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Phone,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GenderBadge, RoleBadge } from "@/components/badges";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RouteLabel } from "@/components/route-label";
import { TimeChip } from "@/components/time-chip";
import { cn } from "@/lib/utils";
import type { OfferedRide } from "@/lib/types";
import {
  deleteMyRideAction,
  respondToRequestAction,
  setRideStatusAction,
} from "./actions";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function OfferedRideCard({
  ride,
  today,
}: {
  ride: OfferedRide;
  today: string;
}) {
  const [pending, start] = useTransition();
  const pendingReqs = ride.requests.filter((r) => r.status === "pending");
  const approvedReqs = ride.requests.filter((r) => r.status === "approved");
  const declinedCount = ride.requests.filter(
    (r) => r.status === "declined",
  ).length;

  const booked = ride.seats_filled;
  const left = Math.max(ride.seats_total - booked, 0);
  const closed = ride.status === "full";
  const hidden = ride.status === "cancelled";
  const full = closed || left === 0;
  // A departed ride is history: it can't be edited or deleted any more (only
  // an admin can remove it). Mirrors update_my_ride() / delete_my_ride().
  const past = ride.depart_date < today;
  // Editing is only safe while nobody holds a seat — mirrors update_my_ride().
  const canEdit = !hidden && !past && booked === 0;
  const canDelete = !past;

  function setFull(next: boolean) {
    start(async () => {
      const res = await setRideStatusAction(ride.id, next ? "full" : "active");
      if (res.error) toast.error(res.error);
      else toast.success(next ? "Marked as full." : "Ride reopened.");
    });
  }

  function remove() {
    return new Promise<void>((resolve) => {
      start(async () => {
        const res = await deleteMyRideAction(ride.id);
        if (res.error) toast.error(res.error);
        else toast.success("Ride deleted.");
        resolve();
      });
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        pendingReqs.length > 0 && "border-amber-300 dark:border-amber-500/40",
        hidden && "opacity-70",
      )}
    >
      {hidden && (
        <p className="flex items-center gap-1.5 bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
          <EyeOff className="size-3.5" />
          Taken down by a Ride Admin — riders can no longer see this ride.
        </p>
      )}

      {/* ── Identity: time + where ── */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <TimeChip time={ride.depart_time} direction={ride.direction} />
        <div className="min-w-0 flex-1">
          <RouteLabel
            direction={ride.direction}
            eventName={ride.event_location.name}
            className="text-base"
          />
          <div className="mt-0.5 flex items-start gap-1 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 break-words">{ride.pickup_label}</span>
          </div>
        </div>
        {ride.gender_only && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              ride.gender_only === "female"
                ? "bg-[var(--female)] text-[var(--female-foreground)]"
                : "bg-primary text-primary-foreground",
            )}
          >
            <Lock className="size-3" />
            {ride.gender_only === "female" ? "Women" : "Men"}
          </span>
        )}
      </div>

      {/* ── Seat status: the driver's headline number ── */}
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
        <div className="flex items-baseline gap-1">
          <span
            className={cn(
              "text-2xl font-bold tabular-nums leading-none",
              full ? "text-amber-600 dark:text-amber-400" : "text-[var(--success)]",
            )}
          >
            {full ? 0 : left}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {full ? "seats left" : left === 1 ? "seat left" : "seats left"}
          </span>
        </div>
        <SeatMeter
          booked={full ? ride.seats_total : booked}
          total={ride.seats_total}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {booked}/{ride.seats_total} booked
        </span>
      </div>

      <div className="space-y-4 p-4">
        {/* ── Action zone: requests to respond to ── */}
        {pendingReqs.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              <span className="flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingReqs.length}
              </span>
              Needs your response
            </h3>
            <ul className="space-y-2">
              {pendingReqs.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center gap-3 rounded-xl border border-amber-300/60 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/5"
                >
                  <RiderIdentity req={req} />
                  <RequestActions requestId={req.id} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Confirmed riders ── */}
        {approvedReqs.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <UserRoundCheck className="size-3.5 text-[var(--success)]" />
              Riding with you · {approvedReqs.length}
            </h3>
            <ul className="space-y-2">
              {approvedReqs.map((req) => (
                <li
                  key={req.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                >
                  <RiderIdentity req={req} />
                  {req.rider_phone && (
                    <a
                      href={`tel:${req.rider_phone}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--success)] px-3 py-2 text-sm font-medium text-[var(--success-foreground)]"
                    >
                      <Phone className="size-4" /> Call
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {ride.requests.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No requests yet — riders will show up here to approve.
          </p>
        )}
        {declinedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {declinedCount} declined
          </p>
        )}
      </div>

      {/* ── Manage (secondary) — nothing to manage once a ride has departed ── */}
      {past ? (
        <p className="border-t px-4 py-2.5 text-center text-xs text-muted-foreground">
          This ride has departed. Ask a Ride Admin if it needs removing.
        </p>
      ) : (
        <div className="flex divide-x border-t [&>*]:flex-1">
          {!hidden &&
            (closed ? (
              <ManageButton onClick={() => setFull(false)} disabled={pending}>
                {pending && <Loader2 className="size-3.5 animate-spin" />}
                Reopen this ride
              </ManageButton>
            ) : (
              <ConfirmDialog
                trigger={
                  <ManageButton disabled={pending}>
                    {pending && <Loader2 className="size-3.5 animate-spin" />}
                    Mark ride as full
                  </ManageButton>
                }
                title="Mark this ride as full?"
                description={
                  <>
                    <p>
                      All {ride.seats_total}{" "}
                      {ride.seats_total === 1 ? "seat" : "seats"} will show as
                      booked
                      {left > 0 && (
                        <>
                          {" "}
                          — including the {left} you haven&apos;t given out yet
                        </>
                      )}
                      , and riders won&apos;t be able to request a seat.
                    </p>
                    <p>You can reopen the ride at any time.</p>
                  </>
                }
                confirmLabel="Mark as full"
                onConfirm={() => setFull(true)}
              />
            ))}

          {canEdit && (
            <Link href={`/rides/${ride.id}/edit`} className={MANAGE_CLS}>
              <Pencil className="size-3.5" />
              Edit ride
            </Link>
          )}

          {canDelete && (
            <ConfirmDialog
              destructive
              trigger={
                <ManageButton
                  disabled={pending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                  Delete ride
                </ManageButton>
              }
              title="Delete this ride?"
              description={
                <>
                  <p>
                    This permanently removes the ride and every seat request on
                    it. It can&apos;t be undone.
                  </p>
                  {approvedReqs.length > 0 && (
                    <p className="font-medium text-destructive">
                      {approvedReqs.length}{" "}
                      {approvedReqs.length === 1 ? "rider has" : "riders have"}{" "}
                      a confirmed seat — please let them know.
                    </p>
                  )}
                </>
              }
              confirmLabel="Delete ride"
              onConfirm={remove}
            />
          )}
        </div>
      )}
    </article>
  );
}

/** One cell of the manage footer — full-width tap target, muted until hovered. */
const MANAGE_CLS =
  "flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50";

function ManageButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button type="button" className={cn(MANAGE_CLS, className)} {...props}>
      {children}
    </button>
  );
}

function SeatMeter({ booked, total }: { booked: number; total: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2.5 w-4 rounded-sm",
            i < booked ? "bg-[var(--success)]" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function RiderIdentity({
  req,
}: {
  req: OfferedRide["requests"][number];
}) {
  return (
    <>
      <Avatar className="size-10">
        <AvatarImage src={req.rider.photo_url ?? undefined} alt="" />
        <AvatarFallback>{initials(req.rider.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{req.rider.name ?? "Rider"}</span>
          <GenderBadge gender={req.rider.gender} />
          <RoleBadge role={req.rider.role} />
        </div>
        <span className="text-sm text-muted-foreground">
          Needs {req.seats} {req.seats === 1 ? "seat" : "seats"}
        </span>
      </div>
    </>
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

  if (pending)
    return <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />;

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        aria-label="Decline"
        onClick={() => respond(false)}
        className="flex size-10 items-center justify-center rounded-lg border bg-background hover:bg-accent"
      >
        <X className="size-5" />
      </button>
      <button
        aria-label="Approve"
        onClick={() => respond(true)}
        className="flex size-10 items-center justify-center rounded-lg bg-[var(--success)] text-[var(--success-foreground)] hover:opacity-90"
      >
        <Check className="size-5" />
      </button>
    </div>
  );
}
