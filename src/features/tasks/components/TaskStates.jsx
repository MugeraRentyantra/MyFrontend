import { Link } from 'react-router-dom';
import { Button, Card, EmptyState, Skeleton, SkeletonText } from '@/shared/components/ui';
import {
  PAYMENT_STATUS,
  ROUTES,
  SUPPORT_EMAIL,
  getStatusMeta,
  paths,
} from '@/shared/constants';
import { ClipboardList, CreditCard, Lock, Mail, Search, ShieldAlert, Users } from '@/shared/icons';

/** Loading layout of the task board: summary strip, filters and a few cards. */
export function TaskBoardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading your tasks…
      </span>
      <Card className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2 w-full" rounded="full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </Card>
      <Skeleton className="h-10 w-full max-w-xl" rounded="lg" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Loading layout of the task page. */
export function TaskDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the task…
      </span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-3/4 max-w-lg" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-full max-w-md" rounded="lg" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <SkeletonText lines={5} />
        </Card>
        <Card className="space-y-4">
          <Skeleton className="h-5 w-28" />
          <SkeletonText lines={3} />
        </Card>
      </div>
    </div>
  );
}

export function NoEnrollmentState() {
  return (
    <EmptyState
      titleAs="h2"
      icon={ClipboardList}
      title="No internship yet"
      description="Take a designation's assessment and enroll in a plan. Your tasks will appear here once your internship starts."
      action={
        <Button as={Link} to={ROUTES.CATALOG} leftIcon={Search}>
          Browse internships
        </Button>
      }
    />
  );
}

/** PENDING_PAYMENT (or a 403 ENROLLMENT_NOT_ACTIVE): tasks stay locked until payment succeeds. */
export function PaymentLockedState({ enrollment }) {
  const failed = enrollment?.paymentStatus === PAYMENT_STATUS.FAILED;
  const confirming = enrollment?.paymentStatus === PAYMENT_STATUS.PENDING;
  let description =
    'Your tasks, schedule and SOPs unlock as soon as your payment is confirmed.';
  if (failed) description = 'Your last payment did not go through. Try again to unlock your tasks.';
  if (confirming) {
    description =
      'We are waiting for your payment to be confirmed. Your tasks unlock automatically when it is.';
  }

  return (
    <EmptyState
      titleAs="h2"
      variant="locked"
      icon={Lock}
      title={confirming ? 'Confirming your payment' : 'Complete payment to unlock your tasks'}
      description={description}
      action={
        enrollment?._id ? (
          <Button as={Link} to={paths.payment(enrollment._id)} leftIcon={CreditCard}>
            {failed ? 'Retry payment' : confirming ? 'Check payment status' : 'Complete payment'}
          </Button>
        ) : null
      }
      secondaryAction={
        <Button as={Link} to={ROUTES.DASHBOARD} variant="ghost">
          Go to dashboard
        </Button>
      }
    />
  );
}

/** CANCELLED / SUSPENDED enrollments. */
export function InactiveEnrollmentState({ enrollment }) {
  const status = getStatusMeta(enrollment?.status).label.toLowerCase();
  return (
    <EmptyState
      titleAs="h2"
      variant="locked"
      icon={ShieldAlert}
      title="This internship isn't active"
      description={`Tasks are unavailable while your enrollment is ${status}. Contact support if you think this is a mistake.`}
      action={
        <Button as="a" href={`mailto:${SUPPORT_EMAIL}`} variant="outline" leftIcon={Mail}>
          Contact support
        </Button>
      }
    />
  );
}

/** Team enrollment whose team has not become ACTIVE yet (no shared tasks created). */
export function TeamNotStartedState({ teamId }) {
  return (
    <EmptyState
      titleAs="h2"
      icon={Users}
      title="Your team hasn't started yet"
      description="Tasks appear here once every member has joined and paid and your team is active."
      action={
        teamId ? (
          <Button as={Link} to={paths.team(teamId)} leftIcon={Users}>
            Go to your team
          </Button>
        ) : null
      }
    />
  );
}

export function NoTasksState() {
  return (
    <EmptyState
      titleAs="h2"
      icon={ClipboardList}
      title="No tasks yet"
      description="Your tasks will appear here as soon as your schedule is ready."
      action={
        <Button as={Link} to={ROUTES.SCHEDULE} variant="outline">
          View schedule
        </Button>
      }
    />
  );
}
