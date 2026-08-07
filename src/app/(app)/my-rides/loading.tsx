import { Skeleton } from "@/components/ui/skeleton";
import { RideListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <RideListSkeleton count={2} />
    </div>
  );
}
