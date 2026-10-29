import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  StatusBadge,
  StatusBanner,
  Tabs,
  toast,
} from '@/shared/components/ui';
import { ROUTES, TASK_STATUS } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  History,
  Hourglass,
  LayoutDashboard,
  Play,
  RotateCcw,
  Upload,
} from '@/shared/icons';
import { getErrorMessage, getErrorStatus, isErrorCode } from '@/shared/utils/errors';
import { formatDate } from '@/shared/utils/helpers';
import { LockedTaskNotice } from '../components/LockedTaskNotice';
import { SubmissionForm } from '../components/SubmissionForm';
import { SubmissionHistory } from '../components/SubmissionHistory';
import { TaskInstructions } from '../components/TaskInstructions';
import { TaskMeta } from '../components/TaskMeta';
import { TaskDetailSkeleton } from '../components/TaskStates';
import { useStartTask } from '../hooks/useStartTask';
import { useSubmissions } from '../hooks/useSubmissions';
import { useTaskContent } from '../hooks/useTaskContent';
import { TASK_TABS, canSubmitStatus, isTeamEnrollment, taskLabel } from '../utils/taskActions';

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function StatePill({ icon: Icon, tone, children }) {
  return (
    <span
      className={`inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium ${tone}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

function ContentError({ error, onRetry }) {
  const status = getErrorStatus(error);
  let title = "Couldn't load this task";
  let message;
  if (status === 404) {
    title = 'Task not found';
    message = "This task doesn't exist or isn't part of your internship.";
  } else if (isErrorCode(error, 'ENROLLMENT_NOT_ACTIVE')) {
    title = 'Your internship is not active';
    message = 'Complete your payment to unlock your tasks. Your dashboard shows what to do next.';
  } else if (status === 403) {
    title = "You don't have access to this task";
    message = 'Tasks can only be opened by the student or team they belong to.';
  }
  const canRetry = status !== 404 && status !== 403;

  return (
    <div className="space-y-4">
      <ErrorState
        error={error}
        title={title}
        message={message}
        onRetry={canRetry ? onRetry : undefined}
      />
      <div className="flex flex-wrap justify-center gap-2">
        <Button as={Link} to={ROUTES.TASKS} variant="outline" leftIcon={ArrowLeft}>
          All tasks
        </Button>
        {isErrorCode(error, 'ENROLLMENT_NOT_ACTIVE') ? (
          <Button as={Link} to={ROUTES.DASHBOARD} leftIcon={LayoutDashboard}>
            Go to dashboard
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * /tasks/:id (GP6, GP8, GP9) — id is the TaskProgress _id. Header with the task's status, meta
 * and primary action; tabs Instructions | Submit work | History (synced to ?tab=). Locked tasks
 * show the missing prerequisites instead of the instructions.
 */
function TaskDetailView({ progressId }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const contentQuery = useTaskContent(progressId);
  const content = contentQuery.data;
  const progress = content?.progress;
  const task = content?.task;
  const status = progress?.status;
  const locked = Boolean(content?.locked) || status === TASK_STATUS.LOCKED;

  const submissionsQuery = useSubmissions(progressId, { enabled: Boolean(content) && !locked });
  const submissions = submissionsQuery.data ?? [];
  const latestSubmission = submissions[0] ?? null;

  const startTask = useStartTask();
  const draftRef = useRef(null);
  const tabsRef = useRef(null);
  const [checked, setChecked] = useState({});

  useDocumentTitle(task?.title ? `${taskLabel(task.sequence)}: ${task.title}` : 'Task');

  const canSubmit = canSubmitStatus(status);
  const showSubmitTab = canSubmit || status === TASK_STATUS.AVAILABLE;
  const availableTabs = [
    TASK_TABS.INSTRUCTIONS,
    ...(showSubmitTab ? [TASK_TABS.SUBMIT] : []),
    TASK_TABS.HISTORY,
  ];
  const tabParam = searchParams.get('tab');
  const activeTab = availableTabs.includes(tabParam) ? tabParam : TASK_TABS.INSTRUCTIONS;

  const setTab = (tab, { scroll = false } = {}) => {
    setSearchParams(
      (previous) => {
        const params = new URLSearchParams(previous);
        if (tab === TASK_TABS.INSTRUCTIONS) params.delete('tab');
        else params.set('tab', tab);
        return params;
      },
      { replace: true },
    );
    if (scroll && tabsRef.current?.scrollIntoView) {
      tabsRef.current.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  const handleStart = () => {
    startTask.mutate(progressId, {
      onSuccess: () => {
        toast.success('Task started', {
          description: 'Submit your work from the "Submit work" tab when it is ready.',
        });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Could not start the task. Please try again.'));
      },
    });
  };

  const handleToggleCriterion = (index, value) => {
    setChecked((current) => ({ ...current, [index]: value }));
  };

  if (contentQuery.isLoading) {
    return <TaskDetailSkeleton />;
  }

  if (contentQuery.isError || !content || !progress) {
    return (
      <div className="space-y-6">
        <PageHeader title="Task" backTo={{ label: 'All tasks', to: ROUTES.TASKS }} />
        <ContentError error={contentQuery.error} onRetry={() => contentQuery.refetch()} />
      </div>
    );
  }

  let primaryAction = null;
  switch (status) {
    case TASK_STATUS.AVAILABLE:
      primaryAction = (
        <Button leftIcon={Play} loading={startTask.isPending} onClick={handleStart}>
          Start task
        </Button>
      );
      break;
    case TASK_STATUS.IN_PROGRESS:
      primaryAction = (
        <Button leftIcon={Upload} onClick={() => setTab(TASK_TABS.SUBMIT, { scroll: true })}>
          Submit work
        </Button>
      );
      break;
    case TASK_STATUS.CHANGES_REQUESTED:
      primaryAction = (
        <Button leftIcon={RotateCcw} onClick={() => setTab(TASK_TABS.SUBMIT, { scroll: true })}>
          Resubmit
        </Button>
      );
      break;
    case TASK_STATUS.SUBMITTED:
      primaryAction = (
        <StatePill icon={Hourglass} tone="bg-violet-50 text-violet-700">
          Waiting for review
        </StatePill>
      );
      break;
    case TASK_STATUS.APPROVED:
      primaryAction = (
        <StatePill icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700">
          {progress.approvedAt ? `Approved ${formatDate(progress.approvedAt)}` : 'Approved'}
        </StatePill>
      );
      break;
    default:
      primaryAction = null;
  }

  const header = (
    <PageHeader
      backTo={{ label: 'All tasks', to: ROUTES.TASKS }}
      eyebrow={taskLabel(task?.sequence)}
      title={task?.title || 'Untitled task'}
      description={
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusBadge status={status} size="md" />
          <TaskMeta task={task} />
        </div>
      }
      actions={primaryAction}
    />
  );

  if (locked) {
    return (
      <div className="space-y-6">
        {header}
        <LockedTaskNotice progress={progress} />
      </div>
    );
  }

  let banner = null;
  if (status === TASK_STATUS.CHANGES_REQUESTED && activeTab !== TASK_TABS.SUBMIT) {
    banner = (
      <StatusBanner
        variant="warning"
        title="Your trainer asked for changes"
        action={
          activeTab !== TASK_TABS.HISTORY ? (
            <Button size="sm" variant="outline" onClick={() => setTab(TASK_TABS.HISTORY)}>
              Read feedback
            </Button>
          ) : null
        }
      >
        Read the feedback, update your work and resubmit it for review.
      </StatusBanner>
    );
  } else if (status === TASK_STATUS.SUBMITTED) {
    banner = (
      <StatusBanner variant="info" title="Submitted for review">
        {latestSubmission?.attemptNumber
          ? `Your trainer will review attempt ${latestSubmission.attemptNumber}. `
          : 'Your trainer will review your work. '}
        The decision and feedback will appear in History.
      </StatusBanner>
    );
  } else if (status === TASK_STATUS.APPROVED) {
    banner = (
      <StatusBanner
        variant="success"
        title="Task approved"
        action={
          <Button as={Link} to={ROUTES.TASKS} size="sm" variant="outline">
            Back to tasks
          </Button>
        }
      >
        Nice work. Any tasks that depended on this one are now unlocked.
      </StatusBanner>
    );
  }

  let submitContent = null;
  if (status === TASK_STATUS.AVAILABLE) {
    submitContent = (
      <EmptyState
        titleAs="h2"
        icon={Play}
        title="Start the task to submit"
        description="Starting the task lets your trainer know you're working on it and opens the submission form."
        action={
          <Button leftIcon={Play} loading={startTask.isPending} onClick={handleStart}>
            Start task
          </Button>
        }
      />
    );
  } else if (canSubmit) {
    submitContent = submissionsQuery.isLoading ? (
      <SkeletonCard lines={6} />
    ) : (
      <SubmissionForm
        content={content}
        latestSubmission={latestSubmission}
        draftRef={draftRef}
        onSubmitted={() => setTab(TASK_TABS.HISTORY, { scroll: true })}
      />
    );
  }

  const tabs = [
    {
      value: TASK_TABS.INSTRUCTIONS,
      label: 'Instructions',
      icon: BookOpen,
      content: (
        <TaskInstructions
          content={content}
          checked={checked}
          onToggleCriterion={handleToggleCriterion}
        />
      ),
    },
    showSubmitTab
      ? {
          value: TASK_TABS.SUBMIT,
          label: 'Submit work',
          icon: Upload,
          content: submitContent,
        }
      : null,
    {
      value: TASK_TABS.HISTORY,
      label: 'History',
      icon: History,
      count: submissionsQuery.isSuccess ? submissions.length : undefined,
      content: (
        <SubmissionHistory
          submissions={submissions}
          isLoading={submissionsQuery.isLoading}
          isError={submissionsQuery.isError}
          error={submissionsQuery.error}
          onRetry={() => submissionsQuery.refetch()}
          canResubmit={canSubmit}
          onResubmit={() => setTab(TASK_TABS.SUBMIT, { scroll: true })}
          showSubmitter={isTeamEnrollment(content.enrollment)}
        />
      ),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {header}
      {banner}
      <div ref={tabsRef} className="scroll-mt-20">
        <Tabs
          items={tabs}
          value={activeTab}
          onChange={(tab) => setTab(tab)}
          aria-label="Task sections"
        />
      </div>
    </div>
  );
}

export default function TaskDetailPage() {
  const { id } = useParams();
  // Keyed by id so tabs, drafts and the self-check reset when moving to another task.
  return <TaskDetailView key={id} progressId={id} />;
}
