import { useEffect, useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Modal, Select, StatusBanner, toast } from '@/shared/components/ui';
import { DURATION_OPTIONS, paths } from '@/shared/constants';
import { Info } from '@/shared/icons';
import { applyServerErrors, getErrorMessage } from '@/shared/utils/errors';
import { formatDuration } from '@/shared/utils/helpers';
import {
  useCreateSchedule,
  useExistingDraft,
  useScheduleCatalogOptions,
} from '../hooks/useSchedules';
import { createScheduleSchema } from '../schemas/scheduleValidation';
import { emptyDayPayload } from '../utils/days';

const DURATION_SELECT_OPTIONS = DURATION_OPTIONS.map((months) => ({
  value: String(months),
  label: formatDuration(months),
}));

const SERVER_FIELD_MAP = { form: 'root.server' };

/**
 * "New schedule" (KD6): pick designation, domain and duration, then POST a draft with one empty day
 * and open it in the editor. `defaultValues` pre-selects the list's current filters.
 */
export function CreateScheduleDialog({ open, onClose, defaultValues }) {
  const formId = useId();
  const navigate = useNavigate();
  const options = useScheduleCatalogOptions();
  const createMutation = useCreateSchedule();

  const defaultDesignationId = defaultValues?.designationId ?? '';
  const defaultDomainId = defaultValues?.domainId ?? '';

  const {
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createScheduleSchema),
    mode: 'onTouched',
    defaultValues: { designationId: '', domainId: '', durationMonths: '' },
  });

  // Fresh form every time the dialog opens.
  useEffect(() => {
    if (open) {
      reset({ designationId: defaultDesignationId, domainId: defaultDomainId, durationMonths: '' });
    }
  }, [open, reset, defaultDesignationId, defaultDomainId]);

  const designationId = watch('designationId');
  const domainId = watch('domainId');
  const durationMonths = watch('durationMonths');
  const { data: existingDraft } = useExistingDraft({ designationId, domainId, durationMonths });

  const isPending = isSubmitting || createMutation.isPending;

  const handleClose = () => {
    if (!isPending) onClose();
  };

  const onSubmit = async (values) => {
    try {
      const schedule = await createMutation.mutateAsync({
        designationId: values.designationId,
        domainId: values.domainId,
        durationMonths: Number(values.durationMonths),
        days: [emptyDayPayload(1)],
      });
      toast.success(`Version ${schedule?.version ?? 1} created`, {
        description: 'Add the days and tasks, then publish it when it is ready.',
      });
      onClose();
      if (schedule?._id) navigate(paths.adminSchedule(schedule._id));
    } catch (error) {
      if (!applyServerErrors(error, setError, { fieldMap: SERVER_FIELD_MAP })) {
        toast.error("Couldn't create the schedule", { description: getErrorMessage(error) });
      }
    }
  };

  const loadingOptions = options.isLoading;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New schedule"
      description="Choose who this schedule is for. You'll add the days and tasks next."
      size="md"
      closeOnOverlayClick={!isPending}
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={isPending} disabled={loadingOptions}>
            Create draft
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {errors.root?.server?.message ? (
          <StatusBanner variant="error" title="Couldn't create the schedule">
            {errors.root.server.message}
          </StatusBanner>
        ) : null}

        {options.isError ? (
          <StatusBanner
            variant="error"
            title="Couldn't load designations and domains"
            action={
              <Button variant="outline" size="sm" onClick={options.refetch}>
                Try again
              </Button>
            }
          >
            {getErrorMessage(options.error)}
          </StatusBanner>
        ) : null}

        <Controller
          control={control}
          name="designationId"
          render={({ field }) => (
            <Select
              label="Designation"
              required
              placeholder={loadingOptions ? 'Loading designations…' : 'Choose a designation'}
              options={options.designations}
              disabled={loadingOptions}
              error={errors.designationId?.message}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
            />
          )}
        />

        <Controller
          control={control}
          name="domainId"
          render={({ field }) => (
            <Select
              label="Domain"
              required
              placeholder={loadingOptions ? 'Loading domains…' : 'Choose a domain'}
              options={options.domains}
              disabled={loadingOptions}
              error={errors.domainId?.message}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
            />
          )}
        />

        <Controller
          control={control}
          name="durationMonths"
          render={({ field }) => (
            <Select
              label="Duration"
              required
              placeholder="Choose a duration"
              options={DURATION_SELECT_OPTIONS}
              error={errors.durationMonths?.message}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={(event) => field.onChange(event.target.value)}
              onBlur={field.onBlur}
            />
          )}
        />

        {existingDraft ? (
          <StatusBanner variant="warning" title={`Version ${existingDraft.version} is already a draft`}>
            You can keep working on it instead of starting another one.{' '}
            <Link
              to={paths.adminSchedule(existingDraft._id)}
              onClick={handleClose}
              className="link font-medium"
            >
              Open version {existingDraft.version}
            </Link>
          </StatusBanner>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span>
              If this combination already has versions, the draft becomes the next version number.
              Published versions are never changed.
            </span>
          </p>
        )}
      </form>
    </Modal>
  );
}

export default CreateScheduleDialog;
