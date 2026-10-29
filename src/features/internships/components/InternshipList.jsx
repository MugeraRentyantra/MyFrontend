import { EmptyState, ErrorState } from '@/shared/components/ui';
import { Search } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { InternshipCard, InternshipCardSkeleton } from './InternshipCard';

const GRID_CLASSES = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3';

/**
 * Responsive grid of InternshipCards with loading, error and empty states.
 * items: summaries from useInternships. `emptyState` overrides { icon, title, description, action }.
 */
export function InternshipList({
  items,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  isFetching = false,
  emptyState,
  skeletonCount = 6,
  headingAs = 'h3',
  className,
}) {
  if (isLoading) {
    return (
      <div role="status" className={className}>
        <span className="sr-only">Loading internships…</span>
        <div className={GRID_CLASSES}>
          {Array.from({ length: skeletonCount }, (_, index) => (
            <InternshipCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        error={error}
        title="We couldn't load internships"
        onRetry={onRetry}
        className={className}
      />
    );
  }

  if (!items || items.length === 0) {
    return (
      <EmptyState
        icon={emptyState?.icon ?? Search}
        title={emptyState?.title ?? 'No internships available yet'}
        description={
          emptyState?.description ?? 'New internships are published regularly. Please check back soon.'
        }
        action={emptyState?.action}
        titleAs={headingAs}
        className={className}
      />
    );
  }

  return (
    <ul
      role="list"
      aria-busy={isFetching || undefined}
      className={cn(
        GRID_CLASSES,
        'transition-opacity duration-150',
        isFetching && 'opacity-70',
        className,
      )}
    >
      {items.map((summary) => (
        <li key={summary.designation._id} className="min-w-0">
          <InternshipCard summary={summary} headingAs={headingAs} />
        </li>
      ))}
    </ul>
  );
}

export default InternshipList;
