import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  CarFront,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
} from "lucide-react";
import { APP_CONFIG, COPY } from "@/config/app";
import { getProfile } from "@/lib/auth";
import {
  getMyOfferedRides,
  getMyPendingRequestCount,
  getMyRequests,
} from "@/lib/rides";
import {
  directionLabel,
  formatDate,
  formatTime,
  isRideLive,
  todayISO,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const REQUEST_TAG: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "bg-primary/10 text-primary" },
  approved: {
    label: "Approved",
    cls: "bg-[var(--success)]/10 text-[var(--success)]",
  },
};

export default async function HomePage() {
  const [profile, offered, requests, pendingCount] = await Promise.all([
    getProfile(),
    getMyOfferedRides(),
    getMyRequests(),
    getMyPendingRequestCount(),
  ]);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const today = todayISO();

  // Rides happening right now → pickup banners.
  const liveOffered = offered.filter(
    (r) => r.status !== "cancelled" && isRideLive(r.depart_date, r.depart_time),
  );
  const liveApproved = requests.filter(
    (r) => r.status === "approved" && isRideLive(r.depart_date, r.depart_time),
  );

  const upcoming = [
    ...offered
      .filter((r) => r.depart_date >= today && r.status !== "cancelled")
      .map((r) => ({
        key: `o-${r.id}`,
        href: "/my-rides?tab=offered",
        date: r.depart_date,
        time: r.depart_time,
        title: directionLabel(r.direction, r.event_location.name),
        tag: { label: "Offering", cls: "bg-secondary text-secondary-foreground" },
      })),
    ...requests
      .filter((r) => r.depart_date >= today && r.status !== "declined")
      .map((r) => ({
        key: `r-${r.request_id}`,
        href: "/my-rides?tab=requested",
        date: r.depart_date,
        time: r.depart_time,
        title: directionLabel(r.direction, r.event_location.name),
        tag: REQUEST_TAG[r.status] ?? REQUEST_TAG.pending,
      })),
  ]
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Sparkles className="size-4" /> {APP_CONFIG.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Namaste, {firstName} 🙏
        </h1>
        <p className="mt-1 text-muted-foreground">Where are you headed today?</p>
      </div>

      {/* Live-trip pickup banners */}
      {liveOffered.map((r) => (
        <LiveBanner
          key={`lo-${r.id}`}
          href="/my-rides?tab=offered"
          title={`Your ride ${directionLabel(r.direction, r.event_location.name)} is on`}
          subtitle="See who you're picking up and call them."
        />
      ))}
      {liveApproved.map((r) => (
        <LiveBanner
          key={`la-${r.request_id}`}
          href="/my-rides?tab=requested"
          title={`Your ride ${directionLabel(r.direction, r.event_location.name)} is starting`}
          subtitle={
            r.driver.name
              ? `${r.driver.name} is driving — sync up now.`
              : "Sync up with your driver now."
          }
          phone={r.driver_phone}
        />
      ))}

      {/* Driver has requests to review */}
      {pendingCount > 0 && (
        <Link
          href="/my-rides?tab=offered"
          className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-white">
            <BellRing className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {pendingCount} {pendingCount === 1 ? "person wants" : "people want"}{" "}
              to join your ride
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300/80">
              Tap to approve or decline.
            </p>
          </div>
          <ArrowUpRight className="size-5 text-amber-700 dark:text-amber-300" />
        </Link>
      )}

      {/* Primary actions */}
      <div className="grid grid-cols-2 gap-3">
        <ActionCard
          href="/rides"
          icon={<Search className="size-6" />}
          title={COPY.findRide}
          subtitle={COPY.findRideSub}
          gradient="from-indigo-500 to-violet-600"
        />
        <ActionCard
          href="/rides/new"
          icon={<CarFront className="size-6" />}
          title={COPY.offerRide}
          subtitle={COPY.offerRideSub}
          gradient="from-emerald-500 to-teal-600"
        />
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Upcoming rides
          </h2>
          {upcoming.length > 0 && (
            <Link href="/my-rides" className="text-sm font-medium text-primary">
              View all
            </Link>
          )}
        </div>
        {upcoming.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nothing yet. Find a car or offer a seat to get going.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {upcoming.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(item.date)} · {formatTime(item.time)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-medium",
                      item.tag.cls,
                    )}
                  >
                    {item.tag.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ContactAdmins />
    </div>
  );
}

function LiveBanner({
  href,
  title,
  subtitle,
  phone,
}: {
  href: string;
  title: string;
  subtitle: string;
  phone?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-4 text-white shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <MapPin className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-white/85">{subtitle}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href={href}
          className="flex-1 rounded-lg bg-white/20 py-2 text-center text-sm font-medium hover:bg-white/30"
        >
          View details
        </Link>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-sm font-semibold text-indigo-700"
          >
            <Phone className="size-4" /> Call
          </a>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  href,
  icon,
  title,
  subtitle,
  gradient,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-6 overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-md transition-transform active:scale-[0.98]",
        gradient,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
        {icon}
      </span>
      <span>
        <span className="flex items-center gap-1 text-lg font-semibold">
          {title}
          <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="block text-sm text-white/85">{subtitle}</span>
      </span>
    </Link>
  );
}

function ContactAdmins() {
  const { phone, whatsapp } = APP_CONFIG.support;
  const waNumber = whatsapp.replace(/[^\d]/g, "");

  return (
    <section className="rounded-xl border bg-muted/40 p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-background text-muted-foreground">
          <Phone className="size-4.5" aria-hidden />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium">Need help? Contact Ride Admins</p>
          <p className="text-xs text-muted-foreground">
            For confusion, disputes, or urgent help.
          </p>
        </div>
      </div>
      {(phone || waNumber) && (
        <div className="mt-3 flex gap-2">
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <Phone className="size-4" /> Call
            </a>
          )}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          )}
        </div>
      )}
    </section>
  );
}
