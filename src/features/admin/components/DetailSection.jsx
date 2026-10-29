import { useId } from 'react';
import { cn } from '@/shared/utils/cn';

/** A titled block inside a drawer: section heading (h3), optional description and right-aligned action. */
export function DetailSection({ title, description, action, children, className }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={headingId} className="text-sm font-semibold text-slate-900">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** Loading placeholder shared by the detail drawers. */
export function DetailSkeleton({ label = 'Loading details…' }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      <DetailSkeletonBlocks />
    </div>
  );
}

function DetailSkeletonBlocks() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex gap-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
      </div>
      {[0, 1, 2].map((block) => (
        <div key={block} className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((cell) => (
              <div key={cell} className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DetailSection;
