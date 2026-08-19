"use client";

import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function dayMon(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}
function weekday(iso: string): string {
  return WEEK[parseISO(iso).getDay()];
}

/**
 * Quick date row: Today, Tomorrow, the next few days as buttons, plus a
 * "Choose date" calendar for anything further out.
 */
export function DateChips({
  value,
  today,
  onChange,
  pending,
  counts,
}: {
  value: string;
  today: string;
  onChange: (v: string) => void;
  pending?: boolean;
  /** Rides available per ISO date — shown as a badge on each chip. */
  counts?: Record<string, number>;
}) {
  const quick = [0, 1, 2, 3, 4].map((i) => addDays(today, i));
  const isCustom = !quick.includes(value);
  const countFor = (iso: string) => counts?.[iso] ?? 0;

  return (
    <div className={cn("flex items-start gap-2", pending && "opacity-60")}>
      {/* Quick days scroll horizontally; pt gives the count badges room so the
          horizontal-scroll container doesn't clip them at the top. */}
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 pr-1.5 pt-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {quick.map((iso, i) => {
        const active = value === iso;
        const top = i === 0 ? "Today" : i === 1 ? "Tomorrow" : weekday(iso);
        const n = countFor(iso);
        const hasCounts = counts !== undefined;
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onChange(iso)}
            className={cn(
              "relative flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 leading-tight transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent",
              hasCounts && n === 0 && !active && "opacity-45",
            )}
          >
            {n > 0 && <CountBadge n={n} active={active} />}
            <span className="text-sm font-semibold">{top}</span>
            <span
              className={cn(
                "text-xs",
                active ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              {dayMon(iso)}
            </span>
          </button>
        );
      })}
      </div>

      {/* "Pick date" is pinned outside the scroll row so it's always visible. */}
      <div className="shrink-0 pt-3">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "relative flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 leading-tight transition-colors",
              isCustom
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {isCustom && countFor(value) > 0 && (
              <CountBadge n={countFor(value)} active />
            )}
            <span className="flex items-center gap-1 text-sm font-semibold">
              <CalendarDays className="size-3.5" />
              {isCustom ? weekday(value) : "Pick"}
            </span>
            <span
              className={cn(
                "text-xs",
                isCustom
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground",
              )}
            >
              {isCustom ? dayMon(value) : "date"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={parseISO(value)}
            onSelect={(d) => d && onChange(toISO(d))}
            disabled={{ before: parseISO(today) }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      </div>
    </div>
  );
}

function CountBadge({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      className={cn(
        "absolute -right-1.5 -top-1.5 flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums shadow-sm ring-2 ring-background",
        active
          ? "bg-[var(--gold)] text-white"
          : "bg-[var(--gold-soft)] text-[var(--gold-ink)]",
      )}
      aria-label={`${n} ${n === 1 ? "ride" : "rides"}`}
    >
      {n}
    </span>
  );
}
