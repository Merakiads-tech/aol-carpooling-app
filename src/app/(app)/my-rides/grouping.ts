const WEEKDAY = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type Dated = { depart_date: string; depart_time: string };
export type DateGroup<T> = { date: string; items: T[] };

function parse(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "Today" / "Tomorrow" / "Saturday" for a grouped date header. */
export function relLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  return WEEKDAY[parse(iso).getDay()];
}

/** "9 Aug" — the secondary line of a date header. */
export function dayLabel(iso: string): string {
  const d = parse(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/**
 * Split rides into upcoming date-groups (today first, ascending; each group's
 * rides ordered by time) and a flat list of past rides (most recent first).
 */
export function partition<T extends Dated>(
  items: T[],
  today: string,
): { upcoming: DateGroup<T>[]; past: T[] } {
  const upcomingItems = items.filter((i) => i.depart_date >= today);
  const past = items
    .filter((i) => i.depart_date < today)
    .sort((a, b) =>
      (b.depart_date + b.depart_time).localeCompare(a.depart_date + a.depart_time),
    );

  const map = new Map<string, T[]>();
  for (const i of upcomingItems) {
    const arr = map.get(i.depart_date);
    if (arr) arr.push(i);
    else map.set(i.depart_date, [i]);
  }
  const upcoming = [...map.keys()]
    .sort()
    .map((date) => ({
      date,
      items: map
        .get(date)!
        .sort((a, b) => a.depart_time.localeCompare(b.depart_time)),
    }));

  return { upcoming, past };
}
