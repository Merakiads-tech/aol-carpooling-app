import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CarFront,
  ChevronRight,
  Hand,
  Handshake,
  MapPin,
  MessageCircle,
  Phone,
  PlusCircle,
  Search,
  Users,
} from "lucide-react";
import { APP_CONFIG } from "@/config/app";
import { getProfile } from "@/lib/auth";
import { getMyOfferedRides, getMyRequests } from "@/lib/rides";
import { formatDate, formatTime, todayISO } from "@/lib/format";

type Featured = {
  kind: "approved" | "pending" | "driving";
  direction: "to_event" | "from_event";
  eventName: string;
  pickup: string;
  date: string;
  time: string;
  seats: number;
  seatsBooked?: number;
  driverName?: string | null;
  driverPhone?: string | null;
  href: string;
};

function splitLoc(label: string) {
  const parts = label.split(",").map((s) => s.trim());
  return { main: parts[0], sub: parts.slice(1).join(", ") };
}

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

  const candidates: Featured[] = [
    ...requests
      .filter(
        (r) =>
          r.depart_date >= today &&
          (r.status === "approved" || r.status === "pending"),
      )
      .map((r) => ({
        kind: (r.status === "approved" ? "approved" : "pending") as
          | "approved"
          | "pending",
        direction: r.direction,
        eventName: r.event_location.name,
        pickup: r.pickup_label,
        date: r.depart_date,
        time: r.depart_time,
        seats: r.seats,
        driverName: r.driver.name,
        driverPhone: r.driver_phone,
        href: "/my-rides?tab=requested",
      })),
    ...offered
      .filter((r) => r.depart_date >= today && r.status !== "cancelled")
      .map((r) => ({
        kind: "driving" as const,
        direction: r.direction,
        eventName: r.event_location.name,
        pickup: r.pickup_label,
        date: r.depart_date,
        time: r.depart_time,
        seats: r.seats_total,
        seatsBooked: r.seats_filled,
        href: "/my-rides?tab=offered",
      })),
  ].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time),
  );

  const featured = candidates[0] ?? null;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gold-ink)]">
          {formatDate(today)}
        </p>
        <h1 className="mt-1.5 text-[30px] leading-tight">
          {greeting()}, {firstName}.
        </h1>
      </header>

      {pendingCount > 0 && (
        <Link
          href="/my-rides?tab=offered"
          className="flex items-center gap-3 rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold-soft)] p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--gold)] text-white">
            <BellRing className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-[var(--gold-ink)]">
              {pendingCount} {pendingCount === 1 ? "person wants" : "people want"}{" "}
              to join
            </p>
            <p className="text-sm text-[var(--gold-ink)]/80">
              Approve or decline in My Rides.
            </p>
          </div>
          <ChevronRight className="size-5 text-[var(--gold-ink)]" />
        </Link>
      )}

      {featured ? (
        <BoardingPass f={featured} />
      ) : (
        <EmptyHero firstName={firstName} />
      )}

      {/* browse + offer */}
      <Link
        href="/rides"
        className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4 transition-colors hover:border-[var(--gold)]/40"
      >
        <span className="flex items-center gap-3">
          <Search className="size-5 text-[var(--gold-ink)]" />
          <span className="font-semibold">Browse rides to Harivan Ashram</span>
        </span>
        <ArrowRight className="size-5 text-muted-foreground" />
      </Link>

      {featured && (
        <Link
          href="/rides/new"
          className="inline-flex items-center gap-1.5 px-1 text-sm font-semibold text-[var(--gold-ink)]"
        >
          <PlusCircle className="size-4" /> Have a car? Offer a seat
        </Link>
      )}

      <ContactAdmins />
    </div>
  );
}

function greeting() {
  // Server renders in UTC; keep it simple + stable.
  return "Namaste";
}

/* ── The boarding pass ── */
function BoardingPass({ f }: { f: Featured }) {
  const toEvent = f.direction === "to_event";
  const you = splitLoc(f.pickup);
  const fromMain = toEvent ? you.main : f.eventName;
  const fromSub = toEvent ? you.sub : "";
  const toMain = toEvent ? f.eventName : you.main;
  const toSub = toEvent ? "" : you.sub;
  const [hm, period] = formatTime(f.time).split(" ");

  return (
    <article className="rounded-[26px] border bg-card shadow-[0_8px_30px_rgba(28,27,25,0.07)]">
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
          {f.kind === "driving" ? "You're driving" : "Your next ride"}
        </p>

        {/* route */}
        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0 max-w-[38%]">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              From
            </p>
            <p className="font-display mt-1 truncate text-lg leading-tight">
              {fromMain}
            </p>
            {fromSub && (
              <p className="truncate text-xs text-muted-foreground">{fromSub}</p>
            )}
          </div>

          <div className="mt-3 flex flex-1 items-center px-1">
            <span className="size-2 rounded-full bg-foreground" />
            <span className="h-px flex-1 border-t border-dashed border-foreground/30" />
            <span className="flex size-8 items-center justify-center rounded-full border bg-[var(--gold-soft)] text-[var(--gold-ink)]">
              <CarFront className="size-4" />
            </span>
            <span className="h-px flex-1 border-t border-dashed border-foreground/30" />
            <span className="size-2 rounded-full bg-[var(--gold)]" />
          </div>

          <div className="min-w-0 max-w-[38%] text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              To
            </p>
            <p className="font-display mt-1 truncate text-lg leading-tight">
              {toMain}
            </p>
            {toSub && (
              <p className="truncate text-xs text-muted-foreground">{toSub}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Departs
            </p>
            <p className="font-display mt-0.5 text-[30px] leading-none">
              {hm}
              <span className="ml-1 text-base text-[var(--gold-ink)]">
                {period}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(f.date)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {f.kind === "driving" ? "Booked" : "Seats"}
            </p>
            <p className="font-display mt-0.5 text-[30px] leading-none">
              {f.kind === "driving" ? `${f.seatsBooked}/${f.seats}` : f.seats}
            </p>
          </div>
        </div>
      </div>

      {/* perforation */}
      <div className="relative">
        <div className="mx-6 border-t border-dashed" />
        <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full border bg-background" />
        <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full border bg-background" />
      </div>

      {/* stub */}
      <Stub f={f} />
    </article>
  );
}

function Stub({ f }: { f: Featured }) {
  if (f.kind === "driving") {
    return (
      <Link
        href={f.href}
        className="flex items-center gap-3 p-6"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <Users className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight">
            {f.seatsBooked ? `${f.seatsBooked} riding with you` : "No riders yet"}
          </p>
          <p className="text-xs text-muted-foreground">Tap to manage this ride</p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>
    );
  }
  const approved = f.kind === "approved";
  return (
    <div className="flex items-center gap-3 p-6">
      <span className="flex size-11 items-center justify-center rounded-full bg-secondary font-semibold">
        {(f.driverName ?? "?").split(" ").map((p) => p[0]).join("").slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-base leading-tight">
          {f.driverName ?? "Driver"}
        </p>
        <p className="text-xs text-muted-foreground">
          {approved ? "Confirmed your seat" : "Waiting for approval"}
        </p>
      </div>
      {approved && f.driverPhone ? (
        <a
          href={`tel:${f.driverPhone}`}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Phone className="size-4" /> Call
        </a>
      ) : (
        <span className="rounded-full bg-[var(--gold-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--gold-ink)]">
          Pending
        </span>
      )}
    </div>
  );
}

/* ── Warm empty state (no upcoming rides) ── */
function EmptyHero({ firstName }: { firstName: string }) {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[26px] border bg-card p-6 shadow-[0_8px_30px_rgba(28,27,25,0.06)]">
        {/* little route illustration */}
        <div className="flex items-center gap-2 text-[var(--gold-ink)]">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground">
            <MapPin className="size-4" />
          </span>
          <span className="h-px flex-1 border-t-2 border-dashed border-[var(--gold)]/40" />
          <span className="flex size-11 items-center justify-center rounded-full bg-[var(--gold-soft)]">
            <CarFront className="size-5" />
          </span>
          <span className="h-px flex-1 border-t-2 border-dashed border-[var(--gold)]/40" />
          <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
            <span className="size-2 rounded-full bg-[var(--gold)]" />
          </span>
        </div>

        <h2 className="font-display mt-5 text-2xl leading-tight">
          No rides yet, {firstName}.
        </h2>
        <p className="mt-1 text-muted-foreground">
          Someone from your event is probably already driving. Grab the empty
          seat — no money ever changes hands.
        </p>

        <Link
          href="/rides"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:opacity-90"
        >
          <Search className="size-4" /> Find a ride to Harivan Ashram
        </Link>
        <Link
          href="/rides/new"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold"
        >
          <PlusCircle className="size-4" /> Offer a seat instead
        </Link>
      </div>

      {/* how it works */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { Icon: Search, label: "Pick a ride" },
          { Icon: Hand, label: "Ask for a seat" },
          { Icon: Handshake, label: "Ride together" },
        ].map(({ Icon, label }, i) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl bg-secondary/60 px-2 py-4 text-center"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-card text-[var(--gold-ink)]">
              <Icon className="size-4" />
            </span>
            <span className="text-xs font-medium leading-tight">
              <span className="text-muted-foreground">{i + 1}. </span>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactAdmins() {
  const { phone, whatsapp } = APP_CONFIG.support;
  const waNumber = whatsapp.replace(/[^\d]/g, "");
  if (!phone && !waNumber) return null;
  return (
    <section className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-4 py-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="size-4" /> Need help? Contact ride admins
      </span>
      <div className="flex gap-1">
        {phone && (
          <a
            href={`tel:${phone}`}
            aria-label="Call ride admins"
            className="flex size-9 items-center justify-center rounded-lg text-[var(--gold-ink)] hover:bg-[var(--gold-soft)]"
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
            className="flex size-9 items-center justify-center rounded-lg text-[var(--success)] hover:bg-[var(--success)]/10"
          >
            <MessageCircle className="size-4.5" />
          </a>
        )}
      </div>
    </section>
  );
}
