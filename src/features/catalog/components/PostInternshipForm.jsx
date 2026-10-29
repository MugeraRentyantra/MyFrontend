import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  DescriptionList,
  ErrorState,
  Input,
  Select,
  Skeleton,
  StatusBanner,
  StatusBadge,
  toast,
} from '@/shared/components/ui';
import { IndianRupee, Plus, Save } from '@/shared/icons';
import { DURATION_OPTIONS, PUBLISH_STATUS, ROUTES } from '@/shared/constants';
import { getErrorMessage, isErrorCode } from '@/shared/utils/errors';
import { formatDate, formatDuration, formatMoney, rupeesToPaise } from '@/shared/utils/helpers';
import { useCatalogOptions } from '../hooks/useCatalogAdmin';
import { useCreatePlan, useUpdatePlan } from '../hooks/useEmployerInternships';
import {
  paiseToRupeeInput,
  parseRupeeInput,
  planCreateSchema,
  planUpdateSchema,
} from '../schemas/catalogValidation';
import { applyKnownFieldErrors } from '../utils/formErrors';
import { FormActions } from './FormActions';

export const DUPLICATE_PLAN_MESSAGE = 'A plan for this designation, domain and duration already exists.';

const CREATE_FIELDS = ['designationId', 'domainId', 'durationMonths', 'basePrice'];
const UPDATE_FIELDS = ['domainId', 'durationMonths', 'basePrice'];

const DURATION_SELECT_OPTIONS = DURATION_OPTIONS.map((months) => ({
  value: String(months),
  label: formatDuration(months),
}));

const PRICE_HINT = 'In rupees, up to 2 decimal places. Maximum ₹10,00,000.';

function toOptions(items) {
  return items.map((item) => ({
    value: item._id,
    label: item.status === PUBLISH_STATUS.PUBLISHED ? item.name : `${item.name} (draft)`,
  }));
}

function FormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the plan form…
      </span>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" rounded="lg" />
        </div>
      ))}
    </div>
  );
}

function PlanForm({ plan, designations, domains, onCancel, onSaved, inDialog }) {
  const isEdit = Boolean(plan);
  const createMutation = useCreatePlan();
  const updateMutation = useUpdatePlan();
  const [formError, setFormError] = useState(null);

  const designationOptions = useMemo(() => toOptions(designations), [designations]);
  const domainOptions = useMemo(() => toOptions(domains), [domains]);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(isEdit ? planUpdateSchema : planCreateSchema),
    mode: 'onTouched',
    defaultValues: isEdit
      ? {
          domainId: plan.domainId ?? plan.domain?._id ?? '',
          durationMonths: plan.durationMonths ? String(plan.durationMonths) : '',
          basePrice: paiseToRupeeInput(plan.basePrice),
        }
      : { designationId: '', domainId: '', durationMonths: '', basePrice: '', publishNow: false },
  });

  const priceInput = watch('basePrice');
  const parsedPrice = parseRupeeInput(priceInput);
  const priceHint =
    parsedPrice !== null && parsedPrice > 0
      ? `Students see ${formatMoney(rupeesToPaise(parsedPrice))} before any assessment discount.`
      : PRICE_HINT;
  const isBusy = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const handleError = (error) => {
    if (isErrorCode(error, 'DUPLICATE_PLAN')) {
      setFormError(DUPLICATE_PLAN_MESSAGE);
      return;
    }
    const applied = applyKnownFieldErrors(error, setError, isEdit ? UPDATE_FIELDS : CREATE_FIELDS);
    if (!applied) setFormError(getErrorMessage(error, "We couldn't save this plan. Please try again."));
  };

  const onSubmit = async (values) => {
    setFormError(null);
    const basePrice = rupeesToPaise(parseRupeeInput(values.basePrice));
    try {
      if (isEdit) {
        const saved = await updateMutation.mutateAsync({
          id: plan._id,
          values: { basePrice, durationMonths: values.durationMonths, domainId: values.domainId },
        });
        toast.success('Plan updated', {
          description: 'The new price applies to quotes created from now on.',
        });
        onSaved?.(saved);
      } else {
        const saved = await createMutation.mutateAsync({
          designationId: values.designationId,
          domainId: values.domainId,
          durationMonths: values.durationMonths,
          basePrice,
          status: values.publishNow ? PUBLISH_STATUS.PUBLISHED : PUBLISH_STATUS.DRAFT,
        });
        toast.success('Plan created', {
          description: values.publishNow
            ? 'It is published and students can choose it now.'
            : 'It is saved as a draft. Publish it when it is ready.',
        });
        onSaved?.(saved);
      }
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {isEdit ? (
        <StatusBanner variant="warning" title="Price changes apply to new quotes only.">
          Existing quotes and enrollments keep their saved price.
        </StatusBanner>
      ) : null}

      {formError ? (
        <StatusBanner variant="error" title="Couldn't save the plan">
          {formError}
        </StatusBanner>
      ) : null}

      {isEdit ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <DescriptionList
            columns={2}
            items={[
              { label: 'Designation', value: plan.designation?.name ?? '—' },
              {
                label: 'Status',
                value: <StatusBadge status={plan.status} />,
              },
              { label: 'Current base price', value: formatMoney(plan.basePrice, plan.currency) },
              { label: 'Last updated', value: formatDate(plan.updatedAt) },
            ]}
          />
          <p className="mt-3 text-xs text-slate-500">
            A plan&apos;s designation can&apos;t change. Create a new plan for another designation.
          </p>
        </div>
      ) : (
        <Select
          label="Designation"
          required
          placeholder="Choose a designation"
          options={designationOptions}
          error={errors.designationId?.message}
          {...register('designationId')}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label="Domain"
          required
          placeholder="Choose a domain"
          options={domainOptions}
          error={errors.domainId?.message}
          {...register('domainId')}
        />
        <Select
          label="Duration"
          required
          placeholder="Choose a duration"
          options={DURATION_SELECT_OPTIONS}
          error={errors.durationMonths?.message}
          {...register('durationMonths')}
        />
      </div>

      <Input
        label="Base price (₹)"
        required
        inputMode="decimal"
        autoComplete="off"
        placeholder="12999"
        leftIcon={IndianRupee}
        hint={priceHint}
        error={errors.basePrice?.message}
        {...register('basePrice')}
      />

      {!isEdit ? (
        <Checkbox
          label="Publish now"
          description="Students can choose this plan as soon as it's saved. Leave unticked to save a draft."
          {...register('publishNow')}
        />
      ) : null}

      <FormActions inDialog={inDialog}>
        {onCancel ? (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          leftIcon={isEdit ? Save : Plus}
          loading={isBusy}
          disabled={isEdit && !isDirty}
        >
          {isEdit ? 'Save changes' : 'Create plan'}
        </Button>
      </FormActions>
    </form>
  );
}

/**
 * PostInternshipForm — create or edit an internship plan (KD4): designation, domain, duration
 * (1, 2, 3, 4 or 6 months) and a base price typed in rupees and sent to the API as integer paise.
 * Pass `plan` to edit (the designation is then fixed). Loads the designation/domain options first.
 * `inDialog` pins the action row to the bottom of a Modal body.
 */
export function PostInternshipForm({ plan = null, onCancel, onSaved, inDialog = false }) {
  const designationsQuery = useCatalogOptions('designation');
  const domainsQuery = useCatalogOptions('domain');

  if (designationsQuery.isError || domainsQuery.isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load the catalog"
        error={designationsQuery.error ?? domainsQuery.error}
        onRetry={() => {
          if (designationsQuery.isError) designationsQuery.refetch();
          if (domainsQuery.isError) domainsQuery.refetch();
        }}
      />
    );
  }

  if (designationsQuery.isPending || domainsQuery.isPending) return <FormSkeleton />;

  if (!plan && (designationsQuery.data.length === 0 || domainsQuery.data.length === 0)) {
    return (
      <div className="space-y-5">
        <StatusBanner variant="info" title="Add the catalog first">
          A plan needs at least one designation and one domain. Create them, then come back to set a
          price.
        </StatusBanner>
        <FormActions inDialog={inDialog}>
          {onCancel ? (
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
          ) : null}
          <Button
            as={Link}
            to={designationsQuery.data.length === 0 ? ROUTES.ADMIN_DESIGNATIONS : ROUTES.ADMIN_DOMAINS}
          >
            {designationsQuery.data.length === 0 ? 'Go to designations' : 'Go to domains'}
          </Button>
        </FormActions>
      </div>
    );
  }

  return (
    <PlanForm
      plan={plan}
      designations={designationsQuery.data}
      domains={domainsQuery.data}
      onCancel={onCancel}
      onSaved={onSaved}
      inDialog={inDialog}
    />
  );
}

export default PostInternshipForm;
