import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Drawer, toast } from '@/shared/components/ui';
import {
  applyServerErrors,
  getErrorMessage,
  getFieldErrors,
  isErrorCode,
} from '@/shared/utils/errors';
import { useSaveTask } from '../hooks/useScheduleTasks';
import { formValuesToTaskPayload } from '../schemas/scheduleValidation';
import { TaskDetails } from './TaskDetails';
import { TaskForm } from './TaskForm';

const SERVER_FIELD_MAP = { form: 'root.server', templateId: 'root.server', sequence: 'root.server' };

/**
 * Add / edit / view a task definition in a large side drawer (KD7).
 * mode: 'create' | 'edit' | 'view'. Closing with unsaved edits asks for confirmation inside the drawer.
 */
export function TaskFormDrawer({
  open,
  mode = 'create',
  task = null,
  tasks = [],
  days = [],
  templateId,
  versionLabel,
  onClose,
  onLocked,
}) {
  const formId = useId();
  const saveTask = useSaveTask();
  const [isDirty, setIsDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const keepEditingRef = useRef(null);
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isPending = saveTask.isPending;

  // Every opening starts clean.
  useEffect(() => {
    if (open) {
      setIsDirty(false);
      setConfirmingDiscard(false);
    }
  }, [open, task]);

  useEffect(() => {
    if (confirmingDiscard) keepEditingRef.current?.focus();
  }, [confirmingDiscard]);

  const handleDirtyChange = useCallback((value) => setIsDirty(value), []);

  const requestClose = () => {
    if (isPending) return;
    if (!isView && isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };

  const handleSubmit = async (values, { setError }) => {
    const data = formValuesToTaskPayload(values, { templateId, sequence: task?.sequence });
    try {
      const saved = await saveTask.mutateAsync({ taskId: isEdit ? task?._id : null, data });
      toast.success(isEdit ? 'Task updated' : 'Task added', {
        description: saved?.title ?? values.title,
      });
      setIsDirty(false);
      onClose();
    } catch (error) {
      if (isErrorCode(error, 'CIRCULAR_PREREQUISITE')) {
        setError('prerequisiteTaskIds', {
          type: 'server',
          message: getFieldErrors(error).prerequisiteTaskIds ?? getErrorMessage(error),
        });
        return;
      }
      if (isErrorCode(error, 'TEMPLATE_PUBLISHED')) {
        toast.error('This version is locked', { description: getErrorMessage(error) });
        onLocked?.();
        onClose();
        return;
      }
      if (applyServerErrors(error, setError, { fieldMap: SERVER_FIELD_MAP })) return;
      toast.error(isEdit ? "Couldn't save the task" : "Couldn't add the task", {
        description: getErrorMessage(error),
      });
    }
  };

  let title = 'Add task';
  if (isEdit) title = 'Edit task';
  if (isView) title = task?.title ?? 'Task';

  let description = versionLabel;
  if (task?.sequence) description = `Task ${task.sequence}${versionLabel ? ` · ${versionLabel}` : ''}`;

  let footer;
  if (isView) {
    footer = (
      <Button variant="outline" onClick={onClose}>
        Close
      </Button>
    );
  } else if (confirmingDiscard) {
    footer = (
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-slate-800" role="alert">
          Discard your unsaved changes?
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={keepEditingRef} variant="outline" onClick={() => setConfirmingDiscard(false)}>
            Keep editing
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmingDiscard(false);
              setIsDirty(false);
              onClose();
            }}
          >
            Discard
          </Button>
        </div>
      </div>
    );
  } else {
    footer = (
      <>
        <Button variant="outline" onClick={requestClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" form={formId} loading={isPending}>
          {isEdit ? 'Save changes' : 'Add task'}
        </Button>
      </>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={requestClose}
      title={title}
      description={description}
      size="lg"
      footer={footer}
    >
      {open && task && isView ? <TaskDetails task={task} tasks={tasks} days={days} /> : null}
      {open && !isView ? (
        <TaskForm
          key={task?._id ?? 'new'}
          formId={formId}
          task={isEdit ? task : null}
          tasks={tasks}
          days={days}
          onSubmit={handleSubmit}
          onDirtyChange={handleDirtyChange}
        />
      ) : null}
    </Drawer>
  );
}

export default TaskFormDrawer;
