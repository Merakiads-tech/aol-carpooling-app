"use client";

import { useMemo, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyRequest, OfferedRide } from "@/lib/types";
import { OfferedRideCard } from "./offered-ride";
import { RequestedCard } from "./requested-card";
import { partition, relLabel, dayLabel } from "./grouping";

type Props =
  | { kind: "offered"; items: OfferedRide[]; today: string }
  | { kind: "requested"; items: MyRequest[]; today: string };

export function Agenda(props: Props) {
  const { kind, today } = props;
  const items = props.items as (OfferedRide | MyRequest)[];
  const [showPast, setShowPast] = useState(false);
  const { upcoming, past } = useMemo(
    () => partition(items, today),
    [items, today],
  );

  const renderCard = (item: OfferedRide | MyRequest) =>
    kind === "offered" ? (
      <OfferedRideCard ride={item as OfferedRide} today={today} />
    ) : (
      <RequestedCard req={item as MyRequest} />
    );
  const keyOf = (item: OfferedRide | MyRequest) =>
    kind === "offered"
      ? (item as OfferedRide).id
      : (item as MyRequest).request_id;

  return (
    <div className="space-y-6">
      {upcoming.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No upcoming rides.
        </p>
      )}

      {upcoming.map((group) => {
        const isToday = group.date === today;
        return (
          <section key={group.date}>
            <div className="mb-3 flex items-baseline justify-between border-b pb-1.5">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-sm font-bold",
                    isToday ? "text-primary" : "text-foreground",
                  )}
                >
                  {relLabel(group.date, today)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {dayLabel(group.date)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {group.items.length}{" "}
                {group.items.length === 1 ? "ride" : "rides"}
              </span>
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={keyOf(item)}>{renderCard(item)}</div>
              ))}
            </div>
          </section>
        );
      })}

      {past.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowPast((p) => !p)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <History className="size-4" />
            {showPast ? "Hide" : "Show"} past rides ({past.length})
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showPast && "rotate-180",
              )}
            />
          </button>
          {showPast && (
            <div className="mt-3 space-y-3 opacity-70">
              {past.map((item) => (
                <div key={keyOf(item)}>{renderCard(item)}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
