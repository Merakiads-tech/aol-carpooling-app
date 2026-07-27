"use client";

import { cn } from "@/lib/utils";

function parse(value: string) {
  if (!value) return { h12: 8, min: 0, period: "AM" as "AM" | "PM" };
  const [hStr, mStr] = value.split(":");
  const h24 = Number(hStr);
  return {
    h12: h24 % 12 || 12,
    min: Number(mStr),
    period: (h24 >= 12 ? "PM" : "AM") as "AM" | "PM",
  };
}
function to24(h12: number, min: number, period: "AM" | "PM"): string {
  let h = h12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 15, 30, 45];

export function TimeField({
  name,
  value,
  onChange,
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { h12, min, period } = parse(value);

  return (
    <div className="flex items-center gap-2">
      <Wheel
        aria-label="Hour"
        options={HOURS.map((h) => ({ v: h, label: String(h) }))}
        value={h12}
        onChange={(v) => onChange(to24(v, min, period))}
      />
      <span className="text-lg font-semibold text-muted-foreground">:</span>
      <Wheel
        aria-label="Minute"
        options={MINUTES.map((m) => ({
          v: m,
          label: String(m).padStart(2, "0"),
        }))}
        value={min}
        onChange={(v) => onChange(to24(h12, v, period))}
      />
      <div className="ml-1 flex overflow-hidden rounded-lg border">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(to24(h12, min, p))}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors",
              period === p
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent",
            )}
          >
            {p}
          </button>
        ))}
      </div>
      {name && <input type="hidden" name={name} value={value || "08:00"} />}
    </div>
  );
}

function Wheel({
  options,
  value,
  onChange,
  ...aria
}: {
  options: { v: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
  "aria-label": string;
}) {
  return (
    <select
      {...aria}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-11 rounded-lg border bg-background px-3 text-base font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
