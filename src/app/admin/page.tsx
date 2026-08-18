import Link from "next/link";
import { CalendarDays, CarFront, Clock, Phone, Users2 } from "lucide-react";
import { getAdminStats, getPendingNow, getRidesByDay } from "@/lib/admin";
import { formatDate, formatTime, directionLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LiveRefresh } from "./_components/live-refresh";
import { FillBar, RequestPipeline, RidesByDayChart } from "./_components/charts";

// Always render fresh — the dashboard is meant to reflect "right now".
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [stats, days, pending] = await Promise.all([
    getAdminStats(),
    getRidesByDay(),
    getPendingNow(),
  ]);

  const s = stats ?? {
    rides_today: 0, rides_upcoming: 0, rides_total: 0,
    seats_offered: 0, seats_filled: 0,
    req_pending: 0, req_approved: 0, req_declined: 0,
    users: 0, users_incomplete: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Right now</h1>
        <LiveRefresh />
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={CarFront}
          label="Departing today"
          value={s.rides_today}
          hint="rides today"
        />
        <Stat
          icon={CalendarDays}
          label="Upcoming rides"
          value={s.rides_upcoming}
          hint="today & later"
        />
        <Stat
          icon={Clock}
          label="Pending requests"
          value={s.req_pending}
          hint="awaiting approval"
          accent={s.req_pending > 0}
          href="#needs-attention"
        />
        <Stat
          icon={Users2}
          label="Users"
          value={s.users}
          hint={
            s.users_incomplete > 0
              ? `${s.users_incomplete} incomplete`
              : "all complete"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-medium">Rides · next 14 days</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Volume by day, split by direction
          </p>
          <RidesByDayChart days={days} />
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-medium">Requests &amp; seats</h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Across upcoming rides
          </p>
          <RequestPipeline
            pending={s.req_pending}
            approved={s.req_approved}
            declined={s.req_declined}
          />
          <div className="mt-5 border-t pt-4">
            <FillBar filled={s.seats_filled} offered={s.seats_offered} />
          </div>
        </div>
      </div>

      {/* Action queue */}
      <section id="needs-attention" className="scroll-mt-20">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Needs attention</h2>
          <span className="text-xs text-muted-foreground">
            {pending.length} pending on upcoming rides
          </span>
        </div>

        {pending.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nothing waiting — every upcoming ride is up to date. 🎉
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {directionLabel(p.direction, p.event)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(p.depart_date)} · {formatTime(p.depart_time)} ·{" "}
                    <span className="text-foreground">{p.rider.name ?? "—"}</span>{" "}
                    wants {p.seats} {p.seats === 1 ? "seat" : "seats"} from{" "}
                    {p.driver.name ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {p.rider.phone && (
                    <CallButton phone={p.rider.phone} label="Rider" variant="soft" />
                  )}
                  {p.driver.phone && (
                    <CallButton phone={p.driver.phone} label="Driver" variant="solid" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={cn(
        "h-full rounded-2xl border bg-card p-4 transition-colors",
        accent && "border-[var(--gold)]/40 bg-[var(--gold-soft)]",
        href && "hover:border-foreground/20",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className={cn("size-3.5", accent && "text-[var(--gold-ink)]")} />
        {label}
      </div>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tabular-nums",
          accent && "text-[var(--gold-ink)]",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function CallButton({
  phone,
  label,
  variant,
}: {
  phone: string;
  label: string;
  variant: "solid" | "soft";
}) {
  return (
    <a
      href={`tel:${phone}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
        variant === "solid"
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground",
      )}
    >
      <Phone className="size-3.5" /> {label}
    </a>
  );
}
