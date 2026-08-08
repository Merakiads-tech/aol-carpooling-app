"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { CircleCheck, CircleX, Clock, Hourglass, Loader2, MapPin, Phone, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GenderBadge, GenderOnlyPill, RoleBadge } from "@/components/badges";
import { RouteLabel } from "@/components/route-label";
import { TimeChip } from "@/components/time-chip";
import { cn } from "@/lib/utils";
import type { MyRequest, RequestStatus } from "@/lib/types";
import { cancelRequestAction } from "./actions";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS: Record<
  Exclude<RequestStatus, "cancelled">,
  { label: string; cls: string; Icon: typeof Clock }
> = {
  pending: {
    label: "Waiting for the driver to approve",
    cls: "bg-primary/10 text-primary",
    Icon: Hourglass,
  },
  approved: {
    label: "You're in — seat confirmed",
    cls: "bg-[var(--success)]/10 text-[var(--success)]",
    Icon: CircleCheck,
  },
  declined: {
    label: "Not approved this time",
    cls: "bg-muted text-muted-foreground",
    Icon: CircleX,
  },
};

export function RequestedCard({ req }: { req: MyRequest }) {
  const [pending, start] = useTransition();
  const canCancel = req.status === "pending" || req.status === "approved";
  const status = STATUS[req.status as keyof typeof STATUS] ?? STATUS.pending;
  const firstName = req.driver.name?.split(" ")[0] ?? "the driver";

  function cancel() {
    start(async () => {
      const res = await cancelRequestAction(req.request_id);
      if (res.error) toast.error(res.error);
      else toast.success("Request cancelled.");
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ── Status: the rider's headline ── */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold",
          status.cls,
        )}
      >
        <status.Icon className="size-4" />
        {status.label}
      </div>

      <div className="flex items-start gap-3 p-4">
        <TimeChip time={req.depart_time} direction={req.direction} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarImage src={req.driver.photo_url ?? undefined} alt="" />
              <AvatarFallback>{initials(req.driver.name)}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">{req.driver.name ?? "Driver"}</span>
            <GenderBadge gender={req.driver.gender} />
            <RoleBadge role={req.driver.role} />
          </div>
          <RouteLabel
            direction={req.direction}
            eventName={req.event_location.name}
            className="mt-1.5 text-sm text-muted-foreground"
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {req.pickup_label}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {req.seats} {req.seats === 1 ? "seat" : "seats"}
            </span>
            <GenderOnlyPill gender={req.gender_only} />
          </div>
        </div>
      </div>

      {/* ── Primary action / status detail ── */}
      <div className="px-4 pb-4">
        {req.status === "approved" && req.driver_phone && (
          <a
            href={`tel:${req.driver_phone}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--success)] py-3 text-sm font-semibold text-[var(--success-foreground)] hover:opacity-90"
          >
            <Phone className="size-4" /> Call {firstName} · {req.driver_phone}
          </a>
        )}
        {req.status === "pending" && (
          <p className="text-sm text-muted-foreground">
            You&apos;ll get {firstName}&apos;s number here as soon as they
            approve.
          </p>
        )}

        {canCancel && (
          <button
            onClick={cancel}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-destructive hover:underline disabled:opacity-50"
          >
            {pending && <Loader2 className="size-3.5 animate-spin" />}
            Cancel my request
          </button>
        )}
      </div>
    </article>
  );
}
