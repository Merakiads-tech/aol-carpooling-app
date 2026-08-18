import { cn } from "@/lib/utils";
import type { RideDay } from "@/lib/admin";

const WD = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Stacked bar chart of ride volume over the next 14 days (going vs return),
 * with a pending-request count floated above each day. Pure CSS/flex — no
 * chart library, fully theme-aware.
 */
export function RidesByDayChart({ days }: { days: RideDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.going + d.returning));

  return (
    <div>
      <div className="flex h-36 items-stretch gap-1">
        {days.map((d, i) => {
          const total = d.going + d.returning;
          const heightPct = (total / max) * 100;
          const wd = new Date(`${d.date}T00:00:00`).getDay();
          const dayNum = Number(d.date.slice(8, 10));
          const isToday = i === 0;
          return (
            <div
              key={d.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${d.date}: ${d.going} going, ${d.returning} return, ${d.pending} pending`}
            >
              <span className="h-3.5 text-[10px] font-bold tabular-nums leading-none text-amber-600 dark:text-amber-400">
                {d.pending > 0 ? d.pending : ""}
              </span>
              <div className="relative w-full max-w-[26px] flex-1 rounded-md bg-muted/50">
                {total > 0 && (
                  <div
                    className="absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-md"
                    style={{ height: `${Math.max(heightPct, 6)}%` }}
                  >
                    <div className="bg-[var(--gold)]" style={{ flexGrow: d.returning }} />
                    <div className="bg-primary" style={{ flexGrow: d.going }} />
                  </div>
                )}
              </div>
              <div className="text-center leading-none">
                <div className="text-[10px] text-muted-foreground">{WD[wd]}</div>
                <div
                  className={cn(
                    "text-xs tabular-nums",
                    isToday ? "font-bold text-primary" : "text-foreground",
                  )}
                >
                  {dayNum}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <Legend swatch="bg-primary" label="Going" />
        <Legend swatch="bg-[var(--gold)]" label="Return" />
        <span className="inline-flex items-center gap-1.5">
          <span className="font-bold text-amber-600 dark:text-amber-400">N</span>
          = pending, shown above the day
        </span>
      </div>
    </div>
  );
}

/** Horizontal split bar of the upcoming request pipeline. */
export function RequestPipeline({
  pending,
  approved,
  declined,
}: {
  pending: number;
  approved: number;
  declined: number;
}) {
  const total = pending + approved + declined;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {approved > 0 && (
          <div className="bg-[var(--success)]" style={{ width: `${pct(approved)}%` }} />
        )}
        {pending > 0 && (
          <div className="bg-[var(--gold)]" style={{ width: `${pct(pending)}%` }} />
        )}
        {declined > 0 && (
          <div className="bg-muted-foreground/40" style={{ width: `${pct(declined)}%` }} />
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <Legend swatch="bg-[var(--gold)]" label={`${pending} pending`} />
        <Legend swatch="bg-[var(--success)]" label={`${approved} approved`} />
        <Legend swatch="bg-muted-foreground/40" label={`${declined} declined`} />
      </div>
    </div>
  );
}

/** Seat fill-rate progress bar. */
export function FillBar({ filled, offered }: { filled: number; offered: number }) {
  const pct = offered ? Math.min(100, Math.round((filled / offered) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">
          {filled} <span className="text-muted-foreground">/ {offered} seats filled</span>
        </span>
        <span className="text-sm font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-[3px]", swatch)} />
      {label}
    </span>
  );
}
