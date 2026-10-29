import { Link } from 'react-router-dom';
import { Button, Card, CardFooter, ProgressBar, StatusBadge } from '@/shared/components/ui';
import { ArrowRight, CalendarDays, ClipboardList, Users } from '@/shared/icons';
import { ENROLLMENT_STATUS, ROUTES, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatDate, pluralize } from '@/shared/utils/helpers';
import {
  describeEnrollment,
  getEnrollmentTeamId,
  isTeamEnrollment,
} from '../utils/dashboardHelpers';

/**
 * The active internship at a glance: designation, domain, duration, enrollment type and status,
 * plus approved/total task progress. `children` render in a divided row below (GitHub status).
 */
export function ProgressCard({ enrollment, approved = 0, total = 0, team, className, children }) {
  if (!enrollment) return null;
  const { designation, subtitle } = describeEnrollment(enrollment);
  const isTeam = isTeamEnrollment(enrollment);
  const teamId = getEnrollmentTeamId(enrollment);
  const teamName = team?.name ?? enrollment.team?.name ?? null;
  const remaining = Math.max(total - approved, 0);
  const isDone = total > 0 && remaining === 0;
  const isCompleted = enrollment.status === ENROLLMENT_STATUS.COMPLETED;

  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <div className="flex-1 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Your internship</p>
            <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-slate-900">
              {designation}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <StatusBadge status={enrollment.enrollmentType} dot={false} />
            <StatusBadge status={enrollment.status} />
          </div>
        </div>

        {isTeam && teamName ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>
              Team{' '}
              {teamId ? (
                <Link to={paths.team(teamId)} className="link">
                  {teamName}
                </Link>
              ) : (
                <span className="font-medium text-slate-900">{teamName}</span>
              )}
            </span>
          </p>
        ) : null}

        <div className="mt-6">
          {total > 0 ? (
            <>
              <ProgressBar
                value={approved}
                max={total}
                label="Tasks approved"
                showValue
                size="lg"
                variant={isDone ? 'success' : 'brand'}
                aria-valuetext={`${approved} of ${total} tasks approved`}
              />
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {approved} of {pluralize(total, 'task')}
                </span>{' '}
                approved
                {remaining > 0 ? ` · ${remaining} to go` : ''}
              </p>
            </>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {isTeam
                ? "Your team's tasks appear here once the team starts."
                : 'Your tasks appear here once your schedule starts.'}
            </p>
          )}
        </div>

        {enrollment.activatedAt || enrollment.completedAt ? (
          <p className="mt-4 text-xs text-slate-500">
            {isCompleted && enrollment.completedAt
              ? `Completed ${formatDate(enrollment.completedAt)}`
              : `Started ${formatDate(enrollment.activatedAt)}`}
          </p>
        ) : null}
      </div>

      {children ? (
        <div className="border-t border-slate-100 px-5 py-4 sm:px-6">{children}</div>
      ) : null}

      <CardFooter className="justify-start gap-1 sm:justify-end">
        <Button
          as={Link}
          to={ROUTES.SCHEDULE}
          variant="ghost"
          size="sm"
          leftIcon={CalendarDays}
          className="h-10 sm:h-8"
        >
          Schedule
        </Button>
        <Button
          as={Link}
          to={ROUTES.TASKS}
          variant="ghost"
          size="sm"
          leftIcon={ClipboardList}
          rightIcon={ArrowRight}
          className="h-10 sm:h-8"
        >
          All tasks
        </Button>
      </CardFooter>
    </Card>
  );
}

export default ProgressCard;
