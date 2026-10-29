import { Skeleton } from '@/shared/components/ui';

/** First-load placeholder for the schedule: a summary bar and a week of day cards. */
export function ScheduleSkeleton({ days = 4, label = 'Loading your schedule…' }) {
  return (
    <div className="space-y-6" aria-busy="true">
      <p className="sr-only" role="status">
        {label}
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-3 h-2 w-full" rounded="full" />
        <Skeleton className="mt-3 h-4 w-56" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: days }, (_, index) => (
          <div
            key={index}
            className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card"
          >
            <Skeleton className="h-10 w-10 shrink-0" rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ScheduleSkeleton;
