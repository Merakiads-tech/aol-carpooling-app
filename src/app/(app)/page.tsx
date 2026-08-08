import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CarFront,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
} from "lucide-react";
import { APP_CONFIG, COPY } from "@/config/app";
import { getProfile } from "@/lib/auth";
import { getMyOfferedRides, getMyRequests } from "@/lib/rides";
import {
  directionLabel,
  formatDate,
  formatTime,
  isRideLive,
  todayISO,
} from "@/lib/format";
import { RouteLabel } from "@/components/route-label";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const [profile, offered, requests] = await Promise.all([
    getProfile(),
    getMyOfferedRides(),
    getMyRequests(),
  ]);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const today = todayISO();

  const pendingCount = offered.reduce(
    (n, r) => n + r.requests.filter((q) => q.status === "pending").length,
    0,
  );
  const liveOffered = offered.find(
    (r) => r.status !== "cancelled" && isRideLive(r.depart_date, r.depart_time),
  );
  const liveApproved = requests.find(
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
        direction: r.direction,
        eventName: r.event_location.name,
        tag: { label: "Offering", cls: "bg-secondary text-secondary-foreground" },
      })),
    ...requests
      .filter((r) => r.depart_date >= today && r.status !== "declined")
      .map((r) => ({
        key: `r-${r.request_id}`,
        href: "/my-rides?tab=requested",
        date: r.depart_date,
        time: r.depart_time,
        direction: r.direction,
        eventName: r.event_location.name,
        tag:
          r.status === "approved"
            ? { label: "Approved", cls: "bg-[var(--success)]/10 text-[var(--success)]" }
            : { label: "Waiting", cls: "bg-primary/10 text-primary" },
      })),
  ].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const subtitle =
    pendingCount > 0
      ? "You have ride requests to review."
      : upcoming.length > 0
        ? "Here's what's coming up."
        : "Where are you headed today?";

  return (
    <div className="space-y-8">
      {/* ── Greeting ── */}
      <header className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          Namaste, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </header>

      {/* ── Primary action, then a clear secondary ── */}
      <section className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
        <Link
          href="/rides"
          className="group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white shadow-lg transition-transform active:scale-[0.99]"
        >
          {/* soft glow */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-2xl"
          />
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Search className="size-7" aria-hidden />
          </span>
          <span className="relative flex-1">
            <span className="block text-xl font-semibold">{COPY.findRide}</span>
            <span className="mt-0.5 block text-sm text-white/85">
              {COPY.findRideSub}
            </span>
          </span>
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </Link>

        <Link
          href="/rides/new"
          className="group flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-emerald-500/40"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CarFront className="size-5.5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-semibold">{COPY.offerRide}</span>
            <span className="text-sm text-muted-foreground">
              {COPY.offerRideSub}
            </span>
          </span>
          <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </Link>
      </section>

      {/* ── One focal personal card (most relevant only) ── */}
      <FocalCard
        live={liveOffered ? "offered" : liveApproved ? "requested" : null}
        liveTitle={
          liveOffered
            ? `Your ride ${directionLabel(liveOffered.direction, liveOffered.event_location.name)}`
            : liveApproved
              ? `Your ride ${directionLabel(liveApproved.direction, liveApproved.event_location.name)}`
              : ""
        }
        livePhone={liveApproved?.driver_phone ?? null}
        pendingCount={pendingCount}
        upcoming={upcoming.slice(0, 2)}
      />

      <ContactAdmins />
    </div>
  );
}

type UpItem = {
  key: string;
  href: string;
  date: string;
  time: string;
  direction: "to_event" | "from_event";
  eventName: string;
  tag: { label: string; cls: string };
};

function FocalCard({
  live,
  liveTitle,
  livePhone,
  pendingCount,
  upcoming,
}: {
  live: "offered" | "requested" | null;
  liveTitle: string;
  livePhone: string | null;
  pendingCount: number;
  upcoming: UpItem[];
}) {
  // Priority: a ride happening now → requests to review → what's next.
  if (live) {
    return (
      <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 text-white shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            Happening now
          </p>
          <p className="mt-1 text-lg font-semibold">{liveTitle} is on</p>
          <p className="text-sm text-white/85">
            {live === "offered"
              ? "See who you're picking up and call them."
              : "Sync up with your driver now."}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href={live === "offered" ? "/my-rides?tab=offered" : "/my-rides?tab=requested"}
              className="flex-1 rounded-lg bg-white/20 py-2 text-center text-sm font-medium hover:bg-white/30"
            >
              View details
            </Link>
            {livePhone && (
              <a
                href={`tel:${livePhone}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-sm font-semibold text-indigo-700"
              >
                <Phone className="size-4" /> Call
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (pendingCount > 0) {
    return (
      <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
        <Link
          href="/my-rides?tab=offered"
          className="flex items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <BellRing className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              {pendingCount} {pendingCount === 1 ? "person wants" : "people want"}{" "}
              to join
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300/80">
              Approve or decline in My Rides.
            </p>
          </div>
          <ChevronRight className="size-5 text-amber-700 dark:text-amber-300" />
        </Link>
      </section>
    );
  }

  if (upcoming.length === 0) return null;

  return (
    <section className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Your next {upcoming.length === 1 ? "ride" : "rides"}
        </h2>
        <Link href="/my-rides" className="text-sm font-medium text-primary">
          View all
        </Link>
      </div>
      <ul className="space-y-2">
        {upcoming.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <MapPin className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <RouteLabel
                  direction={item.direction}
                  eventName={item.eventName}
                  className="text-sm"
                />
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="size-3.5" />
                  {formatDate(item.date)} · {formatTime(item.time)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
                  item.tag.cls,
                )}
              >
                {item.tag.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContactAdmins() {
  const { phone, whatsapp } = APP_CONFIG.support;
  const waNumber = whatsapp.replace(/[^\d]/g, "");
  if (!phone && !waNumber) return null;

  return (
    <section className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="size-4" />
        Need help? Contact Ride Admins
      </div>
      <div className="flex gap-1">
        {phone && (
          <a
            href={`tel:${phone}`}
            aria-label="Call ride admins"
            className="flex size-9 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
          >
            <Phone className="size-4.5" />
          </a>
        )}
        {waNumber && (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp ride admins"
            className="flex size-9 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
          >
            <MessageCircle className="size-4.5" />
          </a>
        )}
      </div>
    </section>
  );
}
