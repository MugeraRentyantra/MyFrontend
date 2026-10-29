import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ErrorState,
  Input,
  Skeleton,
  StatusBanner,
  toast,
} from '@/shared/components/ui';
import { Pencil, Users } from '@/shared/icons';
import { ROUTES, TEAM_MAX_INVITES } from '@/shared/constants';
import { useAuth } from '@/shared/hooks';
import { getErrorMessage, getFieldErrors } from '@/shared/utils/errors';
import { useCreateTeam } from '../hooks/useTeamMutations';
import { usePlanById } from '../hooks/useTeamPlans';
import { TEAM_NAME_MAX_LENGTH, teamFormSchema } from '../schemas/teamValidation';
import { planDesignationId } from '../utils/teamUtils';
import { EmailChipsInput } from './EmailChipsInput';
import { PlanPicker } from './PlanPicker';
import { TeamPlanSummary } from './TeamPlanSummary';
import { TeamPricingNotice } from './TeamPricingNotice';

/**
 * Create-team form (SN10): name (3-60), plan (fixed from ?planId or picked from published plans)
 * and up to TEAM_MAX_INVITES invite emails. Creates the team, then sends the invites, and hands
 * `{ team, invited, inviteError }` to `onCreated`.
 */
export function TeamForm({ initialPlanId = '', initialDesignationId = '', onCreated }) {
  const { user } = useAuth();
  const createTeam = useCreateTeam();
  const planQuery = usePlanById(initialPlanId, initialDesignationId);
  const [planMode, setPlanMode] = useState(initialPlanId ? 'fixed' : 'pick');
  const [pickerDesignationId, setPickerDesignationId] = useState(initialDesignationId);
  const [emailDraft, setEmailDraft] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    setFocus,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm({
    resolver: zodResolver(teamFormSchema),
    mode: 'onTouched',
    defaultValues: { name: '', planId: initialPlanId, emails: [] },
  });

  const busy = isSubmitting || createTeam.isPending;
  const linkedPlanMissing = Boolean(initialPlanId) && planQuery.isSuccess && !planQuery.data;

  // A plan link that no longer resolves (unpublished, wrong id) falls back to the picker.
  useEffect(() => {
    if (linkedPlanMissing && planMode === 'fixed') {
      setPlanMode('pick');
      setValue('planId', '');
    }
  }, [linkedPlanMissing, planMode, setValue]);

  const switchToPicker = () => {
    setPickerDesignationId(planDesignationId(planQuery.data) ?? initialDesignationId);
    setPlanMode('pick');
    setValue('planId', '', { shouldDirty: true });
  };

  const handlePlanPicked = useCallback(
    (plan) => {
      setValue('planId', plan?._id ?? '', { shouldDirty: true, shouldValidate: isSubmitted });
    },
    [setValue, isSubmitted],
  );

  const onSubmit = async (values) => {
    // Text still in the email box could not become a chip (its message is shown): fix it first.
    if (emailDraft.trim()) {
      setFocus('emails');
      return;
    }
    try {
      const result = await createTeam.mutateAsync({
        name: values.name,
        planId: values.planId,
        emails: values.emails,
      });
      if (onCreated) onCreated(result);
    } catch (error) {
      // Field errors for fields on this form go under the field; anything else is a toast.
      const fieldErrors = getFieldErrors(error);
      const known = ['name', 'planId'].filter((field) => fieldErrors[field]);
      known.forEach((field) => setError(field, { type: 'server', message: fieldErrors[field] }));
      if (known.length === 0) {
        toast.error("Couldn't create the team", { description: getErrorMessage(error) });
      }
    }
  };

  let planSection;
  if (planMode === 'fixed') {
    let planContent;
    if (planQuery.isLoading) {
      planContent = <Skeleton className="h-24 w-full" rounded="lg" />;
    } else if (planQuery.isError) {
      planContent = (
        <div className="space-y-3">
          <ErrorState
            compact
            error={planQuery.error}
            title="Couldn't load the plan"
            onRetry={() => planQuery.refetch()}
          />
          <Button variant="link" onClick={switchToPicker}>
            Choose a plan yourself instead
          </Button>
        </div>
      );
    } else {
      planContent = (
        <TeamPlanSummary
          plan={planQuery.data}
          action={
            <Button
              variant="outline"
              size="sm"
              leftIcon={Pencil}
              onClick={switchToPicker}
              disabled={busy}
              aria-label="Change the internship plan"
            >
              Change
            </Button>
          }
        />
      );
    }
    planSection = (
      <section aria-label="Internship plan" className="space-y-1.5">
        <p className="text-sm font-medium text-slate-700">Internship plan</p>
        {planContent}
        {errors.planId?.message ? (
          <p role="alert" className="text-xs text-rose-600">
            {errors.planId.message}
          </p>
        ) : null}
      </section>
    );
  } else {
    planSection = (
      <div className="space-y-4">
        {linkedPlanMissing ? (
          <StatusBanner variant="warning" title="That plan isn't available any more">
            Choose a designation, domain and duration below.
          </StatusBanner>
        ) : null}
        <PlanPicker
          key={pickerDesignationId || 'none'}
          initialDesignationId={pickerDesignationId}
          onChange={handlePlanPicked}
          error={errors.planId?.message}
          disabled={busy}
        />
      </div>
    );
  }

  return (
    <Card
      as="form"
      padding="none"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-label="Create a team"
    >
      <CardHeader
        icon={Users}
        title="Team details"
        description={`Name your team, confirm the plan and invite up to ${TEAM_MAX_INVITES} teammates.`}
      />
      <CardBody className="space-y-6">
        <Input
          label="Team name"
          required
          placeholder="e.g. Byte Builders"
          autoComplete="off"
          maxLength={TEAM_NAME_MAX_LENGTH}
          hint={`3–${TEAM_NAME_MAX_LENGTH} characters. Your teammates and trainer will see it.`}
          error={errors.name?.message}
          {...register('name')}
        />

        {planSection}

        <Controller
          name="emails"
          control={control}
          render={({ field, fieldState }) => (
            <EmailChipsInput
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              onDraftChange={setEmailDraft}
              label="Invite teammates (optional)"
              hint={`Up to ${TEAM_MAX_INVITES} emails. Press Enter, comma or space after each one — you can also invite people later.`}
              ownEmail={user?.email}
              max={TEAM_MAX_INVITES}
              error={fieldState.error?.message}
              disabled={busy}
            />
          )}
        />

        <TeamPricingNotice />
      </CardBody>
      <CardFooter className="flex-col-reverse items-stretch sm:flex-row sm:items-center">
        <Button as={Link} to={ROUTES.DASHBOARD} variant="ghost">
          Cancel
        </Button>
        <Button type="submit" loading={busy} leftIcon={Users}>
          Create team
        </Button>
      </CardFooter>
    </Card>
  );
}

export default TeamForm;
