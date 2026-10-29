import { cn } from '@/shared/utils/cn';

const ROUNDED = { md: 'rounded-md', lg: 'rounded-lg', full: 'rounded-full' };

/** Placeholder block shown while content loads. Size it with className. */
export function Skeleton({ className, rounded = 'md', ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse bg-slate-200/70', ROUNDED[rounded] ?? ROUNDED.md, className)}
      {...rest}
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className={cn('h-3.5', index === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3, className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-card', className)}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" rounded="lg" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <SkeletonText lines={lines} className="mt-4" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className }) {
  return (
    <div aria-hidden="true" className={cn('divide-y divide-slate-100', className)}>
      <div className="flex gap-4 bg-slate-50 px-4 py-3">
        {Array.from({ length: columns }).map((_, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={rowIndex} className="flex gap-4 px-4 py-4">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <Skeleton
              // eslint-disable-next-line react/no-array-index-key
              key={columnIndex}
              className={cn('h-4 flex-1', columnIndex === 0 && 'max-w-[40%]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
