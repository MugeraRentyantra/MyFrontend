import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Drawer,
  EmptyState,
  ErrorState,
  Skeleton,
  toast,
} from '@/shared/components/ui';
import { SCHEDULE_STATUS, paths } from '@/shared/constants';
import { useDisclosure, useDocumentTitle } from '@/shared/hooks';
import { History, ListChecks, Plus } from '@/shared/icons';
import { getErrorMessage, isErrorCode } from '@/shared/utils/errors';
import { pluralize } from '@/shared/utils/helpers';
import { queryKeys } from '@/services/queryKeys';
import { ReadOnlyNotice } from '../components/ReadOnlyNotice';
import { ScheduleHeader } from '../components/ScheduleHeader';
import { ScheduleLoadError, SchedulePageSkeleton } from '../components/SchedulePageStates';
import { ScheduleTabs } from '../components/ScheduleTabs';
import { TaskFormDrawer } from '../components/TaskFormDrawer';
import { TaskList } from '../components/TaskList';
import { VersionList } from '../components/VersionList';
import { useCloneSchedule, useSchedule } from '../hooks/useSchedules';
import { useDeleteTask, useReorderTasks, useScheduleTasks } from '../hooks/useScheduleTasks';
import { findOrderViolation, getDependents, moveItem } from '../utils/graph';
import { scheduleName } from '../utils/format';

const EMPTY_TASKS = [];
const CLOSED_DRAWER = { open: false, mode: 'create', task: null };

function TaskListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100" aria-hidden="true">
      {[0, 1, 2, 3].map((item) => (
        <li key={item} className="flex gap-4 px-5 py-4">
          <Skeleton className="h-8 w-8" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Task list + editors for one loaded version. Keyed by id, so another version starts fresh. */
function ScheduleTasksView({ schedule }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const readOnly = schedule.status !== SCHEDULE_STATUS.DRAFT;
  const tasksQuery = useScheduleTasks(schedule._id);
  const tasks = tasksQuery.data ?? EMPTY_TASKS;
  const reorder = useReorderTasks(schedule._id);
  const deleteMutation = useDeleteTask();
  const clone = useCloneSchedule();
  const versionsDrawer = useDisclosure();
  const [drawer, setDrawer] = useState(CLOSED_DRAWER);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const addButtonRef = useRef(null);

  const days = useMemo(
    () =>
      [...(Array.isArray(schedule.days) ? schedule.days : [])].sort(
        (a, b) => (Number(a.dayNumber) || 0) - (Number(b.dayNumber) || 0),
      ),
    [schedule.days],
  );

  const versionLabel = `Version ${schedule.version}`;
  const reviewCount = tasks.filter((task) => task.requiresTrainerReview).length;
  const dependentsOfDeleted = taskToDelete ? getDependents(tasks, taskToDelete._id) : EMPTY_TASKS;

  const refreshSchedules = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.schedules });

  const handleCreateDraft = () => {
    if (clone.isPending) return;
    clone.mutate(schedule._id, {
      onSuccess: (created) => {
        versionsDrawer.close();
        toast.success(created?.version ? `Draft version ${created.version} created` : 'Draft created', {
          description: 'The days and tasks were copied. Make your changes, then publish.',
        });
        if (created?._id) navigate(paths.adminScheduleTasks(created._id));
      },
      onError: (error) => {
        toast.error("Couldn't create a new draft", { description: getErrorMessage(error) });
      },
    });
  };

  const handleMove = (task, direction) => {
    if (readOnly || reorder.isPending) return;
    const index = tasks.findIndex((item) => item._id === task._id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= tasks.length) return;

    const next = moveItem(tasks, index, target);
    const violation = findOrderViolation(next);
    if (violation) {
      toast.warning("This task can't move there", {
        description: `“${violation.task.title}” needs “${violation.prerequisite.title}” first, so it has to come after it.`,
      });
      return;
    }

    setAnnouncement(`“${task.title}” moved to position ${target + 1} of ${tasks.length}.`);
    reorder.mutate(
      next.map((item) => item._id),
      {
        onError: (error) => {
          setAnnouncement('The order could not be saved, so it was put back.');
          toast.error("Couldn't change the order", { description: getErrorMessage(error) });
          if (isErrorCode(error, 'TEMPLATE_PUBLISHED')) void refreshSchedules();
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!taskToDelete || deleteMutation.isPending) return;
    const deleted = taskToDelete;
    deleteMutation.mutate(deleted._id, {
      onSuccess: () => {
        setTaskToDelete(null);
        toast.success('Task deleted', { description: deleted.title });
        setAnnouncement(`“${deleted.title}” deleted.`);
        window.requestAnimationFrame(() => addButtonRef.current?.focus());
      },
      onError: (error) => {
        toast.error("Couldn't delete the task", { description: getErrorMessage(error) });
        if (isErrorCode(error, 'TEMPLATE_PUBLISHED')) {
          setTaskToDelete(null);
          void refreshSchedules();
        }
      },
    });
  };

  const openCreate = () => setDrawer({ open: true, mode: 'create', task: null });

  let content;
  if (tasksQuery.isLoading) {
    content = (
      <>
        <TaskListSkeleton />
        <span className="sr-only" role="status">
          Loading tasks…
        </span>
      </>
    );
  } else if (tasksQuery.isError && !tasksQuery.data) {
    content = (
      <div className="px-5 py-6">
        <ErrorState
          compact
          error={tasksQuery.error}
          title="Couldn't load the tasks"
          onRetry={() => tasksQuery.refetch()}
        />
      </div>
    );
  } else if (tasks.length === 0) {
    content = (
      <div className="px-5 py-8">
        <EmptyState
          compact
          icon={ListChecks}
          title={readOnly ? 'This version has no tasks' : 'No tasks yet'}
          description={
            readOnly
              ? 'Create a new draft to add tasks for future enrollments.'
              : 'Tasks are what students build and submit. Add the first one for this version.'
          }
          action={
            readOnly ? null : (
              <Button leftIcon={Plus} onClick={openCreate}>
                Add task
              </Button>
            )
          }
        />
      </div>
    );
  } else {
    content = (
      <TaskList
        tasks={tasks}
        days={days}
        readOnly={readOnly}
        isReordering={reorder.isPending}
        onMove={handleMove}
        onEdit={(task) => setDrawer({ open: true, mode: 'edit', task })}
        onView={(task) => setDrawer({ open: true, mode: 'view', task })}
        onDelete={(task) => setTaskToDelete(task)}
      />
    );
  }

  const versionListProps = {
    scheduleId: schedule._id,
    currentVersion: schedule.version,
    versionHref: paths.adminScheduleTasks,
    onCreateDraft: handleCreateDraft,
    isCreating: clone.isPending,
  };

  return (
    <div className="space-y-6">
      <ScheduleHeader
        schedule={schedule}
        actions={
          <Button
            variant="outline"
            leftIcon={History}
            onClick={versionsDrawer.open}
            className="lg:hidden"
            aria-haspopup="dialog"
          >
            Versions
          </Button>
        }
      >
        <ScheduleTabs
          scheduleId={schedule._id}
          daysCount={days.length}
          tasksCount={tasksQuery.data ? tasks.length : schedule.tasksCount}
        />
      </ScheduleHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          {readOnly ? (
            <ReadOnlyNotice
              status={schedule.status}
              version={schedule.version}
              onCreateDraft={handleCreateDraft}
              isCreating={clone.isPending}
            />
          ) : null}

          <Card padding="none">
            <CardHeader
              title="Tasks"
              description={
                readOnly
                  ? 'Students unlock tasks in this order once their prerequisites are approved.'
                  : 'Students unlock tasks in this order. A task waits until its prerequisites are approved.'
              }
              action={
                readOnly ? null : (
                  <Button ref={addButtonRef} leftIcon={Plus} onClick={openCreate}>
                    Add task
                  </Button>
                )
              }
            />
            {tasks.length > 0 ? (
              <p className="px-5 pt-1 text-xs text-slate-500">
                {pluralize(tasks.length, 'task')} · {reviewCount}{' '}
                {reviewCount === 1 ? 'needs' : 'need'} trainer review
              </p>
            ) : null}
            <div className="mt-4 border-t border-slate-100">{content}</div>
          </Card>

          <p className="sr-only" aria-live="polite">
            {announcement}
          </p>
        </div>

        <aside className="hidden lg:block">
          <Card className="lg:sticky lg:top-24">
            <VersionList {...versionListProps} />
          </Card>
        </aside>
      </div>

      <Drawer
        open={versionsDrawer.isOpen}
        onClose={versionsDrawer.close}
        title="Versions"
        description={scheduleName(schedule)}
        size="sm"
      >
        <VersionList {...versionListProps} showHeading={false} onNavigate={versionsDrawer.close} />
      </Drawer>

      <TaskFormDrawer
        open={drawer.open}
        mode={drawer.mode}
        task={drawer.task}
        tasks={tasks}
        days={days}
        templateId={schedule._id}
        versionLabel={versionLabel}
        onClose={() => setDrawer((current) => ({ ...current, open: false }))}
        onLocked={() => void refreshSchedules()}
      />

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        onClose={() => {
          if (!deleteMutation.isPending) setTaskToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete this task?"
        message={
          taskToDelete
            ? `“${taskToDelete.title}” will be removed from version ${schedule.version}. This can't be undone.`
            : ''
        }
        confirmLabel="Delete task"
        variant="danger"
        loading={deleteMutation.isPending}
      >
        {dependentsOfDeleted.length > 0 ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {dependentsOfDeleted.length === 1
              ? `“${dependentsOfDeleted[0].title}” lists it as a prerequisite and will no longer wait for it.`
              : `${dependentsOfDeleted.length} tasks list it as a prerequisite and will no longer wait for it.`}
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}

/** /admin/schedules/:id/tasks — task definitions of one schedule version (KD7). */
export default function TaskEditorPage() {
  const { id } = useParams();
  const { data: schedule, isError, error, refetch } = useSchedule(id);

  useDocumentTitle(schedule ? `Tasks · ${scheduleName(schedule)} v${schedule.version}` : 'Tasks');

  if (!schedule) {
    if (isError) return <ScheduleLoadError error={error} onRetry={() => refetch()} title="Tasks" />;
    return <SchedulePageSkeleton />;
  }

  return <ScheduleTasksView key={schedule._id} schedule={schedule} />;
}
