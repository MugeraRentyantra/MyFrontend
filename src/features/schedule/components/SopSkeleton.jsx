import { Skeleton, SkeletonText } from '@/shared/components/ui';

/** Placeholder while a protected SOP loads. */
export function SopSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the SOP…
      </p>
      <Skeleton className="h-14 w-full" rounded="lg" />
      <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <Skeleton className="h-6 w-1/2" />
        <SkeletonText lines={4} />
        <Skeleton className="h-5 w-1/3" />
        <SkeletonText lines={5} />
      </div>
    </div>
  );
}

export default SopSkeleton;
