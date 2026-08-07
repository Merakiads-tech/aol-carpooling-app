import { ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RideDirection } from "@/lib/types";

/**
 * Plain-language ride direction:
 *   to_event:   Going to Hariwan Ashram
 *   from_event: Return from Hariwan Ashram
 */
export function RouteLabel({
  direction,
  eventName,
  className,
}: {
  direction: RideDirection;
  eventName: string;
  className?: string;
}) {
  const toEvent = direction === "to_event";
  const Icon = toEvent ? ArrowRight : RotateCcw;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-medium", className)}
    >
      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
      {toEvent ? `Going to ${eventName}` : `Return from ${eventName}`}
    </span>
  );
}
