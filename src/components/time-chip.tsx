import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RideDirection } from "@/lib/types";

/** Departure time as a coloured anchor tile (colour encodes direction). */
export function TimeChip({
  time,
  direction,
}: {
  time: string;
  direction: RideDirection;
}) {
  const [hm, period] = formatTime(time).split(" ");
  const toEvent = direction === "to_event";
  return (
    <div
      className={cn(
        "flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2",
        toEvent
          ? "bg-primary/10 text-primary"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      <span className="text-sm font-bold leading-none tabular-nums">{hm}</span>
      <span className="mt-0.5 text-[10px] font-bold tracking-wide">
        {period}
      </span>
    </div>
  );
}
