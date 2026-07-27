import { AlertTriangle, Phone } from "lucide-react";
import { getAdminStats, getPendingRequests } from "@/lib/admin";
import { formatDate, formatTime, directionLabel } from "@/lib/format";
import type { RideDirection } from "@/lib/types";

export default async function AdminOverviewPage() {
  const [stats, pending] = await Promise.all([
    getAdminStats(),
    getPendingRequests(),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Active rides" value={stats?.rides_active ?? 0} />
        <Stat label="Seats offered" value={stats?.seats_total ?? 0} />
        <Stat label="Seats filled" value={stats?.seats_filled ?? 0} />
        <Stat label="Pending requests" value={stats?.requests_pending ?? 0} />
        <Stat label="Total rides" value={stats?.rides_total ?? 0} />
        <Stat label="Users" value={stats?.users ?? 0} />
      </div>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <AlertTriangle className="size-4 text-amber-500" />
          Requests pending over 24 hours
        </h2>

        {pending.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nothing needs follow-up. 🎉
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {directionLabel(
                      p.ride.direction as RideDirection,
                      p.ride.event,
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(p.ride.depart_date)} ·{" "}
                    {formatTime(p.ride.depart_time)} · driver{" "}
                    {p.driver.name ?? "—"} · rider {p.rider.name ?? "—"}
                  </p>
                </div>
                {p.driver.phone && (
                  <a
                    href={`tel:${p.driver.phone}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                  >
                    <Phone className="size-4" /> Call driver
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
