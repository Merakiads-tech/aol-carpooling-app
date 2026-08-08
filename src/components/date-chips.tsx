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
}: {
  value: string;
  today: string;
  onChange: (v: string) => void;
  pending?: boolean;
}) {
  const quick = [0, 1, 2, 3, 4].map((i) => addDays(today, i));
  const isCustom = !quick.includes(value);

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        pending && "opacity-60",
      )}
    >
      {quick.map((iso, i) => {
        const active = value === iso;
        const top = i === 0 ? "Today" : i === 1 ? "Tomorrow" : weekday(iso);
        return (
          <button
            key={iso}
            type="button"
            onClick={() => onChange(iso)}
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 leading-tight transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
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

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 leading-tight transition-colors",
              isCustom
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
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
  );
}
