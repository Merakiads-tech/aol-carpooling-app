"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Clock, Loader2, MapPin, Phone, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GenderBadge, RoleBadge } from "@/components/badges";
import { directionLabel, formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MyRequest, RequestStatus } from "@/lib/types";
import { cancelRequestAction } from "./actions";

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const STATUS_STYLE: Record<RequestStatus, string> = {
  pending: "bg-primary/10 text-primary",
  approved: "bg-[var(--success)]/10 text-[var(--success)]",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Waiting for approval",
  approved: "Approved",
  declined: "Not approved",
  cancelled: "Cancelled",
};

export function RequestedCard({ req }: { req: MyRequest }) {
  const [pending, start] = useTransition();
  const canCancel = req.status === "pending" || req.status === "approved";

  function cancel() {
    start(async () => {
      const res = await cancelRequestAction(req.request_id);
      if (res.error) toast.error(res.error);
      else toast.success("Request cancelled.");
    });
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarImage src={req.driver.photo_url ?? undefined} alt="" />
          <AvatarFallback>{initials(req.driver.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium">{req.driver.name ?? "Driver"}</span>
            <GenderBadge gender={req.driver.gender} />
            <RoleBadge role={req.driver.role} />
          </div>
          <p className="text-sm text-muted-foreground">
            {directionLabel(req.direction, req.event_location.name)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-1 text-xs font-medium",
            STATUS_STYLE[req.status],
          )}
        >
          {STATUS_LABEL[req.status]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          {formatDate(req.depart_date)} · {formatTime(req.depart_time)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" />
          {req.pickup_label}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" />
          {req.seats} {req.seats === 1 ? "seat" : "seats"}
        </span>
      </div>

      {req.status === "approved" && req.driver_phone && (
        <a
          href={`tel:${req.driver_phone}`}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--success)]/10 px-3 py-2 text-sm font-medium text-[var(--success)]"
        >
          <Phone className="size-4" /> {req.driver_phone}
        </a>
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
  );
}
