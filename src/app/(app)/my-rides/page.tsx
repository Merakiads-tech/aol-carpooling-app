import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMyOfferedRides, getMyRequests } from "@/lib/rides";
import { todayISO } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/app";
import { Agenda } from "./agenda";

export const metadata: Metadata = { title: "My Rides" };

export default async function MyRidesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = tab === "requested" ? "requested" : "offered";
  const today = todayISO();
  const [offered, requests] = await Promise.all([
    getMyOfferedRides(),
    getMyRequests(),
  ]);
  const pendingTotal = offered.reduce(
    (n, r) => n + r.requests.filter((q) => q.status === "pending").length,
    0,
  );
  // Tab counts reflect only current/upcoming rides — past rides are hidden by
  // default in the agenda, so counting them would be misleading.
  const upcomingOffered = offered.filter((r) => r.depart_date >= today).length;
  const upcomingRequests = requests.filter((r) => r.depart_date >= today).length;

  return (
    <div className="space-y-5">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Home
      </Link>
      <h1 className="text-xl font-semibold">My Rides</h1>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="offered" className="relative">
            Offered ({upcomingOffered})
            {pendingTotal > 0 && (
              <span className="ml-1.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                {pendingTotal}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requested">
            Requested ({upcomingRequests})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offered" className="mt-4">
          {offered.length === 0 ? (
            <EmptyState
              text="You haven't offered a seat yet."
              cta={{ href: "/rides/new", label: COPY.offerRide }}
            />
          ) : (
            <Agenda kind="offered" items={offered} today={today} />
          )}
        </TabsContent>

        <TabsContent value="requested" className="mt-4">
          {requests.length === 0 ? (
            <EmptyState
              text="You haven't requested a car yet."
              cta={{ href: "/rides", label: COPY.findRide }}
            />
          ) : (
            <Agenda kind="requested" items={requests} today={today} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  text,
  cta,
}: {
  text: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild className="mt-4" size="sm">
        <Link href={cta.href}>{cta.label}</Link>
      </Button>
    </div>
  );
}
