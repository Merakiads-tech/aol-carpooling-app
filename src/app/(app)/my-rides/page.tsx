import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMyOfferedRides, getMyRequests } from "@/lib/rides";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { COPY } from "@/config/app";
import { OfferedRideCard } from "./offered-ride";
import { RequestedCard } from "./requested-card";

export const metadata: Metadata = { title: "My Rides" };

export default async function MyRidesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const defaultTab = tab === "requested" ? "requested" : "offered";
  const [offered, requests] = await Promise.all([
    getMyOfferedRides(),
    getMyRequests(),
  ]);
  const pendingTotal = offered.reduce(
    (n, r) => n + r.requests.filter((q) => q.status === "pending").length,
    0,
  );

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
            Offered ({offered.length})
            {pendingTotal > 0 && (
              <span className="ml-1.5 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                {pendingTotal}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requested">
            Requested ({requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offered" className="mt-4 space-y-3">
          {offered.length === 0 ? (
            <EmptyState
              text="You haven't offered a seat yet."
              cta={{ href: "/rides/new", label: COPY.offerRide }}
            />
          ) : (
            offered.map((ride) => (
              <OfferedRideCard key={ride.id} ride={ride} />
            ))
          )}
        </TabsContent>

        <TabsContent value="requested" className="mt-4 space-y-3">
          {requests.length === 0 ? (
            <EmptyState
              text="You haven't requested a car yet."
              cta={{ href: "/rides", label: COPY.findRide }}
            />
          ) : (
            requests.map((req) => (
              <RequestedCard key={req.request_id} req={req} />
            ))
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
