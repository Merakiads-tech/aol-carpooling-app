import { Skeleton } from "@/components/ui/skeleton";
import { RideListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <RideListSkeleton count={3} />
    </div>
  );
}
