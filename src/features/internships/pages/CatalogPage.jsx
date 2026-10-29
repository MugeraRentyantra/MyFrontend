import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, PageHeader } from '@/shared/components/ui';
import { useDebounce, useDocumentTitle } from '@/shared/hooks';
import { DURATION_OPTIONS, ROUTES } from '@/shared/constants';
import { Filter, X } from '@/shared/icons';
import { pluralize } from '@/shared/utils/helpers';
import { InternshipFilters } from '../components/InternshipFilters';
import { InternshipList } from '../components/InternshipList';
import { useInternships } from '../hooks/useInternships';

const SEARCH_PARAM = 'q';
const DOMAIN_PARAM = 'domain';
const DURATION_PARAM = 'duration';
const SEARCH_DEBOUNCE_MS = 300;

const VALID_DURATIONS = new Set(DURATION_OPTIONS.map(String));

/** Public catalog (SN5): search + domain + duration filters kept in the URL. */
export function CatalogPage() {
  useDocumentTitle('Internships');
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get(SEARCH_PARAM) ?? '';
  const domainId = searchParams.get(DOMAIN_PARAM) ?? '';
  const rawDuration = searchParams.get(DURATION_PARAM) ?? '';
  const duration = VALID_DURATIONS.has(rawDuration) ? rawDuration : '';
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  const { data, domains, domainsLoading, isLoading, isFetching, isError, error, refetch } =
    useInternships({ search: debouncedSearch, domainId, durationMonths: duration });

  const updateParam = useCallback(
    (key, value) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set(key, value);
          else next.delete(key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const hasFilters = Boolean(search || domainId || duration);
  const count = data?.length ?? 0;

  let resultSummary = '';
  if (isLoading) resultSummary = 'Loading internships…';
  else if (!isError) {
    resultSummary = hasFilters
      ? `${pluralize(count, 'internship')} match your filters`
      : `${pluralize(count, 'internship')} open for enrollment`;
  }

  return (
    <div className="bg-slate-50">
      <div className="container-page space-y-6 py-8 sm:py-10">
        <PageHeader
          breadcrumbs={[
            { label: 'Home', to: ROUTES.HOME },
            { label: 'Internships', to: ROUTES.CATALOG },
          ]}
          title="Explore internships"
          description="Pick a role, take one 15-question assessment and unlock a merit discount on individual plans. Every internship runs on day-wise tasks reviewed by trainers."
        />

        <InternshipFilters
          search={search}
          onSearchChange={(value) => updateParam(SEARCH_PARAM, value)}
          domainId={domainId}
          onDomainChange={(value) => updateParam(DOMAIN_PARAM, value)}
          duration={duration}
          onDurationChange={(value) => updateParam(DURATION_PARAM, value)}
          domains={domains}
          domainsLoading={domainsLoading}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />

        <div className="flex min-h-[2rem] flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600" aria-live="polite" aria-atomic="true">
            {resultSummary}
          </p>
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={X}
              onClick={clearFilters}
              className="hidden md:inline-flex"
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        <InternshipList
          items={data}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          isFetching={isFetching && !isLoading}
          headingAs="h2"
          emptyState={
            hasFilters
              ? {
                  icon: Filter,
                  title: 'No internships match your filters',
                  description: 'Try a different search term, domain or duration.',
                  action: (
                    <Button variant="outline" leftIcon={X} onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ),
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}

export default CatalogPage;
