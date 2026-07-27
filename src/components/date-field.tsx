"use client";

import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function label(value: string, today: string): string {
  if (value === today) return "Today";
  if (value === addDays(today, 1)) return "Tomorrow";
  const d = parseISO(value);
  return `${WEEK[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]}`;
}

export function DateField({
  name,
  value,
  today,
  onChange,
}: {
  name?: string;
  value: string;
  today: string;
  onChange: (v: string) => void;
}) {
  const chips = [
    { label: "Today", val: today },
    { label: "Tomorrow", val: addDays(today, 1) },
  ];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {chips.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onChange(c.val)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              value === c.val
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {c.label}
          </button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                value !== today && value !== addDays(today, 1)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              <CalendarDays className="size-4" />
              {label(value, today)}
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
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
