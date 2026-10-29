import { useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, Select, StatusBanner, toast } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { GraduationCap, RefreshCw, UserCheck, Users } from '@/shared/icons';
import { getErrorMessage, getFieldErrors } from '@/shared/utils/errors';
import { formatDate } from '@/shared/utils/helpers';
import {
  useCreateAssignment,
  useTargetAssignments,
  useTrainerOptions,
} from '../hooks/useAssignments';
import {
  TARGET_TYPE,
  assignmentTrainerId,
  isAssignmentActive,
} from '../utils/assignmentHelpers';
import { AssignmentHistory } from './AssignmentHistory';
import { TargetPicker } from './TargetPicker';
import { TargetTypeToggle } from './TargetTypeToggle';

function SelectedTarget({ target, onChange, disabled }) {
  const Icon = target.type === TARGET_TYPE.TEAM ? Users : GraduationCap;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {target.type === TARGET_TYPE.TEAM ? 'Team' : 'Student enrollment'}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{target.name}</p>
            {target.detail ? <p className="truncate text-xs text-slate-500">{target.detail}</p> : null}
          </div>
        </div>
        <Button variant="ghost" onClick={onChange} disabled={disabled}>
          Choose someone else
        </Button>
      </div>
    </div>
  );
}

function AssignTrainerDialogContent({ onClose, initialTarget }) {
  const formId = useId();
  const [targetType, setTargetType] = useState(initialTarget?.type ?? TARGET_TYPE.ENROLLMENT);
  const [target, setTarget] = useState(initialTarget ?? null);
  const [pickerOpen, setPickerOpen] = useState(!initialTarget);
  const [trainerId, setTrainerId] = useState('');
  const [errors, setErrors] = useState({});

  const trainersQuery = useTrainerOptions();
  const historyQuery = useTargetAssignments(target);
  const mutation = useCreateAssignment();

  const trainers = useMemo(() => trainersQuery.data ?? [], [trainersQuery.data]);
  const history = historyQuery.data ?? [];
  const current = history.find(isAssignmentActive) ?? null;
  const currentTrainerId = assignmentTrainerId(current);
  const isReassign = Boolean(current);

  const trainerOptions = trainers.map((trainer) => ({
    value: trainer._id,
    label:
      trainer._id === currentTrainerId
        ? `${trainer.name} (current trainer)`
        : `${trainer.name}${trainer.email ? ` · ${trainer.email}` : ''}`,
    disabled: trainer._id === currentTrainerId,
  }));

  const close = () => {
    if (!mutation.isPending) onClose();
  };

  const changeType = (nextType) => {
    if (nextType === targetType) return;
    setTargetType(nextType);
    setTarget(null);
    setErrors((previous) => ({ ...previous, target: undefined }));
  };

  const selectTarget = (nextTarget) => {
    setTarget(nextTarget);
    setErrors((previous) => ({ ...previous, target: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mutation.isPending) return;

    const nextErrors = {};
    if (!target) {
      nextErrors.target =
        targetType === TARGET_TYPE.TEAM ? 'Choose a team.' : 'Choose a student enrollment.';
    }
    if (!trainerId) nextErrors.trainerId = 'Choose a trainer.';
    else if (trainerId === currentTrainerId) {
      nextErrors.trainerId = 'This trainer is already assigned. Choose someone else.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const body =
      target.type === TARGET_TYPE.TEAM
        ? { trainerId, teamId: target.id }
        : { trainerId, enrollmentId: target.id };
    const trainerName = trainers.find((trainer) => trainer._id === trainerId)?.name ?? 'The trainer';

    mutation.mutate(body, {
      onSuccess: () => {
        toast.success(isReassign ? 'Trainer reassigned' : 'Trainer assigned', {
          description: `${trainerName} now reviews work from ${target.name}.`,
        });
        onClose();
      },
      onError: (error) => {
        const fields = getFieldErrors(error);
        const mapped = {};
        if (fields.trainerId) mapped.trainerId = fields.trainerId;
        const targetMessage = fields.enrollmentId ?? fields.teamId ?? fields.target;
        if (targetMessage) mapped.target = targetMessage;
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          if (mapped.target) setPickerOpen(true);
          return;
        }
        toast.error("We couldn't save the assignment", { description: getErrorMessage(error) });
      },
    });
  };

  let trainerField;
  if (trainersQuery.isError && trainers.length === 0) {
    trainerField = (
      <StatusBanner
        variant="error"
        title="We couldn't load the trainers"
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            loading={trainersQuery.isFetching}
            onClick={() => trainersQuery.refetch()}
          >
            Try again
          </Button>
        }
      >
        {getErrorMessage(trainersQuery.error)}
      </StatusBanner>
    );
  } else if (!trainersQuery.isLoading && trainers.length === 0) {
    trainerField = (
      <StatusBanner
        variant="warning"
        title="No active trainers yet"
        action={
          <Button as={Link} to={ROUTES.ADMIN_USERS} variant="outline" size="sm">
            Manage users
          </Button>
        }
      >
        Give a user the Trainer role first, then come back to assign them.
      </StatusBanner>
    );
  } else {
    trainerField = (
      <Select
        label="Trainer"
        required
        placeholder={trainersQuery.isLoading ? 'Loading trainers…' : 'Choose a trainer'}
        options={trainerOptions}
        value={trainerId}
        onChange={(event) => {
          setTrainerId(event.target.value);
          setErrors((previous) => ({ ...previous, trainerId: undefined }));
        }}
        disabled={trainersQuery.isLoading}
        error={errors.trainerId}
        hint="Only active users with the Trainer role are listed."
      />
    );
  }

  return (
    <Modal
      open
      onClose={close}
      size="lg"
      title={initialTarget ? 'Reassign trainer' : 'Assign a trainer'}
      description="The trainer reviews this student's or team's submissions. Reassigning keeps the history."
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            leftIcon={UserCheck}
            loading={mutation.isPending}
            disabled={trainers.length === 0 && !trainersQuery.isLoading}
          >
            {isReassign ? 'Reassign trainer' : 'Assign trainer'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="space-y-6">
        {pickerOpen ? (
          <>
            <TargetTypeToggle value={targetType} onChange={changeType} disabled={mutation.isPending} />
            <TargetPicker
              key={targetType}
              type={targetType}
              selected={target}
              onSelect={selectTarget}
              error={errors.target}
              initialSearch={target?.type === targetType ? (target.searchText ?? '') : ''}
            />
          </>
        ) : (
          <SelectedTarget
            target={target}
            onChange={() => setPickerOpen(true)}
            disabled={mutation.isPending}
          />
        )}

        {trainerField}

        {target ? (
          <section aria-label="Current trainer and history" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Trainer history</h3>
              {current ? (
                <p className="text-xs text-slate-500">
                  Current: <span className="font-medium text-slate-700">{current.trainer?.name ?? 'Unknown'}</span>
                  {current.assignedAt ? ` since ${formatDate(current.assignedAt)}` : ''}
                </p>
              ) : null}
            </div>
            <AssignmentHistory
              items={history}
              loading={historyQuery.isLoading}
              error={historyQuery.isError ? historyQuery.error : null}
              onRetry={historyQuery.refetch}
            />
            {current ? (
              <p className="text-xs text-slate-500">
                Saving ends the current assignment and starts a new one. Both stay in the history.
              </p>
            ) : null}
          </section>
        ) : null}
      </form>
    </Modal>
  );
}

/**
 * KD11 "Assign trainer" dialog: target type → searchable target → trainer → current trainer and
 * history → Assign. `initialTarget` (from a table row) opens it as "Reassign" for that target.
 * The content only mounts while open, so every opening starts fresh.
 */
export function AssignTrainerDialog({ open, onClose, initialTarget = null }) {
  if (!open) return null;
  return <AssignTrainerDialogContent onClose={onClose} initialTarget={initialTarget} />;
}

export default AssignTrainerDialog;
