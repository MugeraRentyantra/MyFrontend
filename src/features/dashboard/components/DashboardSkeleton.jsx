import { SkeletonCard } from '@/shared/components/ui';

/** First-load placeholder that mirrors the active dashboard grid. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">
        Loading your dashboard…
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonCard lines={5} className="lg:col-span-2" />
        <SkeletonCard lines={5} />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} className="md:col-span-2 lg:col-span-1" />
      </div>
    </div>
  );
}

export default DashboardSkeleton;
