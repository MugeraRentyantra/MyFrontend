import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, Skeleton, SkeletonText } from '@/shared/components/ui';
import { ROUTES, buildPath } from '@/shared/constants';
import { ArrowRight, Building2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { useDomains } from '../hooks/useDomains';
import { getDomainVisual } from '../utils/designationVisuals';

function DomainSkeletonGrid() {
  return (
    <div role="status">
      <span className="sr-only">Loading domains…</span>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <Skeleton className="h-10 w-10" rounded="lg" />
            <Skeleton className="mt-4 h-4 w-1/2" />
            <SkeletonText lines={2} className="mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Home page band of published industry domains; each links to the filtered catalog. */
export function DomainStrip({ className }) {
  const { data: domains = [], isLoading, isError, error, refetch } = useDomains();

  let content;
  if (isLoading) {
    content = <DomainSkeletonGrid />;
  } else if (isError) {
    content = (
      <ErrorState compact error={error} title="We couldn't load domains" onRetry={refetch} />
    );
  } else if (domains.length === 0) {
    content = (
      <EmptyState
        compact
        icon={Building2}
        title="Domains are on their way"
        description="Industry domains appear here as soon as they're published."
      />
    );
  } else {
    content = (
      <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {domains.map((domain) => {
          const visual = getDomainVisual(domain.slug || domain.name);
          const Icon = visual.icon;
          return (
            <li
              key={domain._id}
              className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card transition duration-150 hover:border-slate-300 hover:shadow-md"
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  visual.tint,
                )}
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">
                <Link
                  to={buildPath(ROUTES.CATALOG, {}, { domain: domain._id })}
                  className="rounded-sm outline-none transition-colors after:absolute after:inset-0 after:rounded-xl group-hover:text-brand-700 focus-visible:after:ring-2 focus-visible:after:ring-brand-500 focus-visible:after:ring-offset-2"
                >
                  {domain.name}
                </Link>
              </h3>
              {domain.description ? (
                <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-slate-600">
                  {domain.description}
                </p>
              ) : null}
              <span
                className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand-700"
                aria-hidden="true"
              >
                See internships
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section
      aria-labelledby="domains-heading"
      className={cn('bg-slate-50 py-16 sm:py-20', className)}
    >
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="eyebrow">Industry domains</p>
          <h2
            id="domains-heading"
            className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
          >
            Build for real businesses
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every plan pairs a role with an industry, so your project mirrors how banks, clinics and
            online stores actually run.
          </p>
        </div>
        <div className="mt-10">{content}</div>
      </div>
    </section>
  );
}

export default DomainStrip;
