import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationCard } from '@/features/applications/components/ApplicationCard';
import { Button } from '@/shared/components/ui';
import { Briefcase } from '@/shared/icons';
import { ROUTES } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { pluralize } from '@/shared/utils/helpers';

/** "Your applications": one ApplicationCard per enrollment, newest first. */
export function ApplicationsSection({ enrollments = [], currentId, className }) {
  const headingId = useId();
  const sorted = useMemo(
    () =>
      [...enrollments].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      ),
    [enrollments],
  );

  if (sorted.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id={headingId} className="text-base font-semibold text-slate-900">
            Your applications
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {pluralize(sorted.length, 'internship')} you&apos;ve enrolled in.
          </p>
        </div>
        <Button
          as={Link}
          to={ROUTES.CATALOG}
          variant="outline"
          size="sm"
          leftIcon={Briefcase}
          className="h-10 self-start sm:h-8 sm:self-auto"
        >
          Browse internships
        </Button>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((enrollment) => (
          <li key={enrollment._id} className="min-w-0">
            <ApplicationCard enrollment={enrollment} current={enrollment._id === currentId} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ApplicationsSection;
