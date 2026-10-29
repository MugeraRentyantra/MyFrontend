import { Select } from '@/shared/components/ui';
import { getStatusMeta } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { describeEnrollment } from '../utils/dashboardHelpers';

/**
 * Lets a student with several enrollments choose which one the learning screens show.
 * Renders nothing for a single enrollment. `onChange(enrollmentId)`.
 */
export function EnrollmentSwitcher({
  enrollments = [],
  value,
  onChange,
  className,
  'aria-label': ariaLabel = 'Choose the internship to show',
}) {
  if (!Array.isArray(enrollments) || enrollments.length < 2) return null;

  const options = enrollments.map((enrollment) => ({
    value: enrollment._id,
    label: `${describeEnrollment(enrollment).label} (${getStatusMeta(enrollment.status).label})`,
  }));

  return (
    <Select
      aria-label={ariaLabel}
      options={options}
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value)}
      className={cn('w-full sm:w-80', className)}
    />
  );
}

export default EnrollmentSwitcher;
