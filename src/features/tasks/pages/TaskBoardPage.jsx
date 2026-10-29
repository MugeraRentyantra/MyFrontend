import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useActiveEnrollment } from '@/features/applications/hooks/useApplications';
import { Button, EmptyState, ErrorState, PageHeader, Select } from '@/shared/components/ui';
import { ACTIVE_ENROLLMENT_STATUSES, ENROLLMENT_STATUS } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { Filter } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { isErrorCode } from '@/shared/utils/errors';
import { TaskBoard, TaskList } from '../components/TaskBoard';
import { TaskFilters } from '../components/TaskFilters';
import {
  InactiveEnrollmentState,
  NoEnrollmentState,
  NoTasksState,
  PaymentLockedState,
  TaskBoardSkeleton,
  TeamNotStartedState,
} from '../components/TaskStates';
import { TaskSummary } from '../components/TaskSummary';
import { TASK_VIEWS, useTaskBoardView } from '../hooks/useTaskBoardView';
import { useTasks } from '../hooks/useTasks';
import {
  STATUS_FILTER_ALL,
  countByStatus,
  getEnrollmentLabel,
  getStatusFilterLabel,
  isStatusFilter,
  isTeamEnrollment,
} from '../utils/taskActions';

function EnrollmentSwitcher({ enrollments, value, onChange }) {
  if (enrollments.length < 2) return null;
  return (
    <Select
      size="sm"
      aria-label="Choose internship"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      options={enrollments.map((item) => ({ value: item._id, label: getEnrollmentLabel(item) }))}
      className="w-full sm:w-72"
    />
  );
}

/**
 * /tasks (GP5): the tasks of the active enrollment with a summary strip, a status filter synced to
 * ?status= and, from lg, a board (columns by status) or a list; mobile always gets the list.
 */
export default function TaskBoardPage() {
  useDocumentTitle('Tasks');
  const [searchParams, setSearchParams] = useSearchParams();
  const { view, setView, canShowBoard } = useTaskBoardView();
  const {
    enrollment,
    enrollments,
    isLoading: enrollmentsLoading,
    isError: enrollmentsError,
    error: enrollmentsErrorValue,
    refetch: refetchEnrollments,
    setActiveEnrollmentId,
  } = useActiveEnrollment();

  const isActive = Boolean(enrollment) && ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status);
  const tasksQuery = useTasks(enrollment?._id, { enabled: isActive });
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const statusParam = searchParams.get('status');
  const status = isStatusFilter(statusParam) ? statusParam : STATUS_FILTER_ALL;
  const counts = useMemo(() => countByStatus(tasks), [tasks]);
  const visibleTasks = useMemo(
    () => (status === STATUS_FILTER_ALL ? tasks : tasks.filter((task) => task.status === status)),
    [tasks, status],
  );

  const setStatus = (next) => {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (!next || next === STATUS_FILTER_ALL) params.delete('status');
        else params.set('status', next);
        return params;
      },
      { replace: true },
    );
  };

  const description = enrollment
    ? [
        isTeamEnrollment(enrollment) && enrollment.team?.name ? `Team ${enrollment.team.name}` : null,
        getEnrollmentLabel(enrollment),
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Work through your internship tasks, submit your work and follow your trainer’s reviews.';

  let content;
  if (enrollmentsLoading) {
    content = <TaskBoardSkeleton />;
  } else if (enrollmentsError) {
    content = (
      <ErrorState
        error={enrollmentsErrorValue}
        title="Couldn't load your internship"
        onRetry={() => refetchEnrollments()}
      />
    );
  } else if (!enrollment) {
    content = <NoEnrollmentState />;
  } else if (enrollment.status === ENROLLMENT_STATUS.PENDING_PAYMENT) {
    content = <PaymentLockedState enrollment={enrollment} />;
  } else if (!isActive) {
    content = <InactiveEnrollmentState enrollment={enrollment} />;
  } else if (tasksQuery.isLoading) {
    content = <TaskBoardSkeleton />;
  } else if (tasksQuery.isError) {
    content = isErrorCode(tasksQuery.error, 'ENROLLMENT_NOT_ACTIVE') ? (
      <PaymentLockedState enrollment={enrollment} />
    ) : (
      <ErrorState
        error={tasksQuery.error}
        title="Couldn't load your tasks"
        onRetry={() => tasksQuery.refetch()}
      />
    );
  } else if (!tasks.length) {
    content = isTeamEnrollment(enrollment) ? (
      <TeamNotStartedState teamId={enrollment.teamId ?? enrollment.team?._id} />
    ) : (
      <NoTasksState />
    );
  } else {
    const showBoard = canShowBoard && view === TASK_VIEWS.BOARD;
    content = (
      <div className="space-y-6">
        <TaskSummary tasks={tasks} />
        <TaskFilters
          value={status}
          onChange={setStatus}
          counts={counts}
          total={tasks.length}
          view={view}
          onViewChange={canShowBoard ? setView : undefined}
        />
        <div
          className={cn(
            'transition-opacity duration-150',
            tasksQuery.isFetching && !tasksQuery.isLoading && 'opacity-70',
          )}
        >
          {visibleTasks.length === 0 ? (
            <EmptyState
              titleAs="h2"
              compact
              variant="muted"
              icon={Filter}
              title={`No ${getStatusFilterLabel(status).toLowerCase()} tasks`}
              description="Try another status to see the rest of your tasks."
              action={
                <Button variant="outline" size="sm" onClick={() => setStatus(STATUS_FILTER_ALL)}>
                  Show all tasks
                </Button>
              }
            />
          ) : showBoard ? (
            <TaskBoard tasks={visibleTasks} />
          ) : (
            <TaskList tasks={visibleTasks} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description={description}
        actions={
          enrollment ? (
            <EnrollmentSwitcher
              enrollments={enrollments}
              value={enrollment._id}
              onChange={setActiveEnrollmentId}
            />
          ) : null
        }
      />
      {content}
    </div>
  );
}
