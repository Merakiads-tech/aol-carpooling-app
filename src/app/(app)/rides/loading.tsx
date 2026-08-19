import { RideListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
      </div>
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />

      {/* direction segments */}
      <div className="grid grid-cols-2 gap-2">
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
      </div>
      {/* date chips */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>

      <RideListSkeleton count={3} />
    </div>
  );
}
