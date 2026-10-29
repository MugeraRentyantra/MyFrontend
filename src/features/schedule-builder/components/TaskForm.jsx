import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DynamicRowEditor,
  Input,
  Select,
  StatusBanner,
  Switch,
  Textarea,
} from '@/shared/components/ui';
import { GithubIcon } from '@/shared/icons';
import {
  TASK_LIMITS,
  emptyCriterion,
  taskSchema,
  taskToFormValues,
} from '../schemas/scheduleValidation';
import { dayLabel } from '../utils/format';
import { PrerequisitePicker } from './PrerequisitePicker';

function SectionTitle({ title, description }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
    </div>
  );
}

function criterionError(errors, index) {
  const entry = errors?.acceptanceCriteria?.[index];
  return entry?.text?.message ?? entry?.message;
}

/**
 * Task definition form (KD7). Validation runs client-side with zod; `onSubmit(values, { setError })`
 * receives parsed values and can map server errors back onto fields. Submit it from outside with
 * `<button type="submit" form={formId}>`. `onDirtyChange(isDirty)` reports unsaved edits.
 */
export function TaskForm({ formId, task, tasks = [], days = [], onSubmit, onDirtyChange }) {
  const defaultValues = useMemo(() => taskToFormValues(task), [task]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(taskSchema),
    mode: 'onTouched',
    defaultValues,
  });

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const dayOptions = useMemo(
    () => [
      { value: '', label: 'Not tied to a day' },
      ...days.map((day) => ({ value: String(day.dayNumber), label: dayLabel(day) })),
    ],
    [days],
  );

  // A new task is added at the end, so every existing task comes before it.
  const sequence = task?.sequence;
  const criteriaError =
    errors.acceptanceCriteria?.message ?? errors.acceptanceCriteria?.root?.message;

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit?.(values, { setError }))}
      className="space-y-8"
    >
      {errors.root?.server?.message ? (
        <StatusBanner variant="error" title="Couldn't save the task">
          {errors.root.server.message}
        </StatusBanner>
      ) : null}

      <section className="space-y-4">
        <SectionTitle title="What students build" />
        <Input
          label="Title"
          required
          maxLength={TASK_LIMITS.title}
          placeholder="e.g. Build the account sign-up API"
          error={errors.title?.message}
          {...register('title')}
        />
        <Textarea
          label="Problem statement"
          required
          rows={5}
          showCount
          maxLength={TASK_LIMITS.problemStatement}
          placeholder="Describe the problem, the context and any constraints."
          error={errors.problemStatement?.message}
          {...register('problemStatement')}
        />
        <Textarea
          label="Expected outcome"
          required
          rows={3}
          showCount
          maxLength={TASK_LIMITS.expectedOutcome}
          placeholder="What a finished, working submission looks like."
          error={errors.expectedOutcome?.message}
          {...register('expectedOutcome')}
        />
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Acceptance criteria"
          description="Trainers review submissions against these. One clear, checkable statement each."
        />
        <Controller
          control={control}
          name="acceptanceCriteria"
          render={({ field }) => (
            <DynamicRowEditor
              rows={field.value}
              onChange={field.onChange}
              createRow={() => emptyCriterion()}
              getRowKey={(row, index) => row?.key ?? index}
              itemLabel="Criterion"
              addLabel="Add criterion"
              minRows={1}
              maxRows={TASK_LIMITS.maxCriteria}
              renderRow={(row, index, helpers) => (
                <Input
                  aria-label={`Acceptance criterion ${index + 1}`}
                  value={row.text}
                  onChange={(event) => helpers.update({ text: event.target.value })}
                  onBlur={field.onBlur}
                  maxLength={TASK_LIMITS.criterion}
                  placeholder="e.g. POST /accounts returns 201 with the new account"
                  error={criterionError(errors, index)}
                />
              )}
            />
          )}
        />
        {criteriaError ? (
          <p role="alert" className="text-xs text-rose-600">
            {criteriaError}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <SectionTitle title="Setup" />
        <Input
          label="Starter repository"
          type="url"
          inputMode="url"
          autoComplete="off"
          leftIcon={GithubIcon}
          placeholder="https://github.com/org/starter-repo"
          hint="Optional. Students start from this repository."
          error={errors.starterRepoUrl?.message}
          {...register('starterRepoUrl')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Estimated hours"
            required
            type="number"
            inputMode="decimal"
            min={TASK_LIMITS.minHours}
            max={TASK_LIMITS.maxHours}
            step="0.5"
            rightElement="hours"
            hint={`Between ${TASK_LIMITS.minHours} and ${TASK_LIMITS.maxHours}.`}
            error={errors.estimatedHours?.message}
            {...register('estimatedHours')}
          />
          <Select
            label="Schedule day"
            options={dayOptions}
            hint="Optional. Shows the task next to that day."
            error={errors.dayNumber?.message}
            {...register('dayNumber')}
          />
        </div>
        <Controller
          control={control}
          name="requiresTrainerReview"
          render={({ field }) => (
            <Switch
              ref={field.ref}
              checked={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              label="Trainer review required"
              description="A trainer approves each submission before the tasks that depend on it unlock."
            />
          )}
        />
      </section>

      <section>
        <Controller
          control={control}
          name="prerequisiteTaskIds"
          render={({ field }) => (
            <PrerequisitePicker
              tasks={tasks}
              taskId={task?._id ?? null}
              sequence={sequence}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.prerequisiteTaskIds?.message}
            />
          )}
        />
      </section>
    </form>
  );
}

export default TaskForm;
