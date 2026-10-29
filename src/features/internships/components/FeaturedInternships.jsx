import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { ArrowRight } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { useInternships } from '../hooks/useInternships';
import { InternshipList } from './InternshipList';

const FEATURED_COUNT = 6;

/** Home page grid of published designations with their "from" price. */
export function FeaturedInternships({ className }) {
  const { data, isLoading, isError, error, refetch } = useInternships();

  const featured = useMemo(() => {
    if (!data) return data;
    const withPlans = data.filter((summary) => summary.plans.length > 0);
    return (withPlans.length > 0 ? withPlans : data).slice(0, FEATURED_COUNT);
  }, [data]);

  return (
    <section aria-labelledby="featured-heading" className={cn('bg-white py-16 sm:py-20', className)}>
      <div className="container-page">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Internships</p>
            <h2
              id="featured-heading"
              className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
            >
              Choose your track
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Each track pairs a role with a real industry domain and runs for one to six months.
            </p>
          </div>
          <Button
            as={Link}
            to={ROUTES.CATALOG}
            variant="outline"
            rightIcon={ArrowRight}
            className="self-start sm:self-auto"
          >
            View all internships
          </Button>
        </div>

        <InternshipList
          className="mt-10"
          items={featured}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          skeletonCount={3}
          headingAs="h3"
        />
      </div>
    </section>
  );
}

export default FeaturedInternships;
