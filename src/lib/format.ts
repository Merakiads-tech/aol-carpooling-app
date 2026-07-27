import type { RideDirection } from "@/lib/types";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-08-02" → "Sat, 2 Aug". Locale/timezone-stable (no Intl). */
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

/** "07:00" → "7:00 AM". */
export function formatTime(timeStr: string): string {
  const [hStr, min] = timeStr.split(":");
  let h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${period}`;
}

/** Today's date as YYYY-MM-DD in the given timezone (default IST). */
export function todayISO(timeZone = "Asia/Kolkata"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
}

export function directionLabel(
  direction: RideDirection,
  eventName: string,
): string {
  return direction === "to_event" ? `To ${eventName}` : `From ${eventName}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Current wall-clock in a timezone (default IST) as date + minutes-of-day. */
export function nowInZone(timeZone = "Asia/Kolkata"): {
  date: string;
  minutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

/**
 * Is a ride "live now"? True from 30 min before departure to 3 h after,
 * on the departure date. Used to surface the pickup banner on Home.
 */
export function isRideLive(departDate: string, departTime: string): boolean {
  const now = nowInZone();
  if (now.date !== departDate) return false;
  const start = timeToMinutes(departTime);
  return now.minutes >= start - 30 && now.minutes <= start + 180;
}
