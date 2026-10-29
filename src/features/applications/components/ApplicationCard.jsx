import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardFooter, StatusBadge } from '@/shared/components/ui';
import { Award, CalendarDays, CreditCard, RotateCcw } from '@/shared/icons';
import { ENROLLMENT_STATUS, PAYMENT_STATUS, ROUTES, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatDate, formatDuration, formatMoney } from '@/shared/utils/helpers';
import { useActiveEnrollment } from '../hooks/useApplications';

/** The next step for an enrollment, by its status (and payment status while unpaid). */
function getPrimaryAction(enrollment) {
  switch (enrollment.status) {
    case ENROLLMENT_STATUS.PENDING_PAYMENT:
      return enrollment.paymentStatus === PAYMENT_STATUS.FAILED
        ? { label: 'Retry payment', to: paths.payment(enrollment._id), icon: RotateCcw }
        : { label: 'Complete payment', to: paths.payment(enrollment._id), icon: CreditCard };
    case ENROLLMENT_STATUS.ACTIVE:
    case ENROLLMENT_STATUS.IN_PROGRESS:
      return { label: 'Open schedule', to: ROUTES.SCHEDULE, icon: CalendarDays };
    case ENROLLMENT_STATUS.COMPLETED:
      return { label: 'View certificate', to: ROUTES.CERTIFICATE, icon: Award };
    default:
      return null;
  }
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * One of the student's internship applications (enrollments): plan, type, the enrollment and
 * payment states shown separately (two state machines), the payable amount from the server's
 * price snapshot and the next step. Opening it also makes it the active enrollment for the
 * learning screens.
 */
export function ApplicationCard({ enrollment, current = false, headingAs: Heading = 'h3', className }) {
  const { setActiveEnrollmentId } = useActiveEnrollment();
  if (!enrollment) return null;

  const plan = enrollment.plan ?? {};
  const designation = plan.designation?.name ?? 'Internship';
  const meta = [plan.domain?.name, plan.durationMonths ? formatDuration(plan.durationMonths) : null]
    .filter(Boolean)
    .join(' · ');
  const snapshot = enrollment.priceSnapshot ?? {};
  const action = getPrimaryAction(enrollment);
  const awaitingPayment = enrollment.status === ENROLLMENT_STATUS.PENDING_PAYMENT;

  return (
    <Card
      as="article"
      padding="none"
      className={cn('flex h-full flex-col', current && 'border-brand-300 ring-1 ring-brand-200', className)}
    >
      <div className="flex-1 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Heading className="break-words text-base font-semibold text-slate-900">
              {designation}
            </Heading>
            {meta ? <p className="mt-0.5 text-sm text-slate-500">{meta}</p> : null}
          </div>
          <StatusBadge status={enrollment.enrollmentType} dot={false} className="shrink-0" />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Enrollment">
            <StatusBadge status={enrollment.status} />
          </Field>
          <Field label="Payment">
            {enrollment.paymentStatus ? (
              <StatusBadge status={enrollment.paymentStatus} />
            ) : (
              <StatusBadge status="NOT_STARTED" label="Not started" />
            )}
          </Field>
          <Field label="Amount payable">
            <span className="font-semibold">
              {formatMoney(snapshot.payableAmount, snapshot.currency || undefined)}
            </span>
          </Field>
          <Field label="Created">
            {enrollment.createdAt ? (
              <time dateTime={enrollment.createdAt}>{formatDate(enrollment.createdAt)}</time>
            ) : (
              '—'
            )}
          </Field>
        </dl>
      </div>

      {action || current ? (
        <CardFooter className="justify-between">
          {current ? (
            <Badge variant="brand" size="sm">
              Showing now
            </Badge>
          ) : (
            <span aria-hidden="true" />
          )}
          {action ? (
            <Button
              as={Link}
              to={action.to}
              size="sm"
              variant={awaitingPayment ? 'primary' : 'outline'}
              leftIcon={action.icon}
              onClick={() => setActiveEnrollmentId(enrollment._id)}
              aria-label={`${action.label}: ${designation}`}
              className="h-10 sm:h-8"
            >
              {action.label}
            </Button>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export default ApplicationCard;
