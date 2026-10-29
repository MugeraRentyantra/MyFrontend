import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  RadioGroup,
  StatusBanner,
  Textarea,
  toast,
} from '@/shared/components/ui';
import { REVIEW_DECISION, ROUTES, paths } from '@/shared/constants';
import { CheckCircle2, RotateCcw, Send, XCircle } from '@/shared/icons';
import { applyServerErrors, getErrorMessage, isErrorCode } from '@/shared/utils/errors';
import { useReviewSubmission } from '../hooks/useSubmissionReview';
import { reviewDefaultValues, reviewSchema } from '../schemas/reviewSchema';
import {
  DECISION_META,
  DECISION_ORDER,
  FEEDBACK_MAX_LENGTH,
  FEEDBACK_MIN_LENGTH,
  hasFailedRequiredCheck,
  ownerName,
  taskLabel,
} from '../utils/reviewHelpers';

const DECISION_ICONS = {
  [REVIEW_DECISION.APPROVED]: CheckCircle2,
  [REVIEW_DECISION.CHANGES_REQUESTED]: RotateCcw,
  [REVIEW_DECISION.REJECTED]: XCircle,
};

/**
 * KD10 decision panel: Approve / Request changes / Reject, feedback (required unless approving),
 * a confirmation step, then on to the next pending submission (or back to the queue when it's empty).
 * Approve is disabled while a required automated check has failed. Remount (key) per submission.
 */
export function DecisionForm({ submission }) {
  const navigate = useNavigate();
  const mutation = useReviewSubmission(submission._id);
  const approveBlocked = hasFailedRequiredCheck(submission.automatedChecks);
  const [pendingReview, setPendingReview] = useState(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setError,
    trigger,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm({
    resolver: zodResolver(reviewSchema),
    defaultValues: reviewDefaultValues,
    mode: 'onTouched',
  });

  const decision = watch('decision');
  const feedbackRequired = Boolean(decision) && decision !== REVIEW_DECISION.APPROVED;
  const confirmMeta = pendingReview ? DECISION_META[pendingReview.decision] : null;

  const options = DECISION_ORDER.map((value) => {
    const blocked = value === REVIEW_DECISION.APPROVED && approveBlocked;
    return {
      value,
      label: DECISION_META[value].label,
      description: blocked
        ? 'Unavailable: a required automated check failed.'
        : DECISION_META[value].description,
      disabled: blocked,
      icon: DECISION_ICONS[value],
    };
  });

  const closeConfirm = () => {
    if (!mutation.isPending) setPendingReview(null);
  };

  const submitReview = () => {
    if (!pendingReview || mutation.isPending) return;
    const values = pendingReview;
    const meta = DECISION_META[values.decision];
    mutation.mutate(
      { decision: values.decision, feedback: values.feedback },
      {
        onSuccess: (result) => {
          setPendingReview(null);
          const nextId = result?.nextPendingId;
          if (nextId && nextId !== submission._id) {
            toast.success(meta.successTitle, {
              description: 'Opening the next submission in your queue.',
            });
            navigate(paths.trainerReview(nextId));
          } else {
            toast.success('Queue cleared', {
              description: `${meta.successTitle}. Nothing else is waiting for your review.`,
            });
            navigate(ROUTES.TRAINER);
          }
        },
        onError: (error) => {
          setPendingReview(null);
          if (isErrorCode(error, 'ALREADY_REVIEWED')) {
            toast.info('Already reviewed', {
              description: 'A decision was already recorded for this submission. Showing it now.',
            });
            return;
          }
          if (isErrorCode(error, 'CHECKS_FAILED')) {
            toast.error("This submission can't be approved", {
              description: getErrorMessage(error),
            });
            return;
          }
          if (applyServerErrors(error, setError)) return;
          toast.error("We couldn't save your review", { description: getErrorMessage(error) });
        },
      },
    );
  };

  return (
    <Card as="section" padding="none" aria-label="Your decision">
      <CardHeader
        title="Your decision"
        description="The student sees your decision and feedback as soon as you submit."
      />
      <form
        noValidate
        onSubmit={handleSubmit((values) => setPendingReview(values))}
        className="space-y-5 p-5"
      >
        {approveBlocked ? (
          <StatusBanner variant="warning" title="Approval is blocked">
            A required automated check failed. Request changes and explain what needs fixing.
          </StatusBanner>
        ) : null}

        <Controller
          name="decision"
          control={control}
          render={({ field, fieldState }) => (
            <RadioGroup
              name={field.name}
              label="Decision"
              required
              variant="cards"
              optionsClassName="sm:grid-cols-1 md:grid-cols-3 lg:grid-cols-1"
              options={options}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                field.onBlur();
                if (touchedFields.feedback || errors.feedback) trigger('feedback');
              }}
              error={fieldState.error?.message}
            />
          )}
        />

        <Textarea
          label="Feedback for the student"
          required={feedbackRequired}
          rows={6}
          showCount
          minLength={feedbackRequired ? FEEDBACK_MIN_LENGTH : undefined}
          maxLength={FEEDBACK_MAX_LENGTH}
          placeholder={
            feedbackRequired
              ? 'What needs to change, and where? Be specific so they can fix it in one go.'
              : 'Optional: what they did well, or tips for the next task.'
          }
          hint={
            feedbackRequired
              ? `Required. At least ${FEEDBACK_MIN_LENGTH} characters.`
              : 'Optional when you approve.'
          }
          error={errors.feedback?.message}
          {...register('feedback')}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          leftIcon={Send}
          loading={isSubmitting}
          disabled={mutation.isPending}
        >
          Submit review
        </Button>
      </form>

      <ConfirmDialog
        open={Boolean(pendingReview)}
        onClose={closeConfirm}
        onConfirm={submitReview}
        title={confirmMeta?.confirmTitle ?? 'Submit review?'}
        confirmLabel={confirmMeta?.confirmLabel ?? 'Submit'}
        variant={confirmMeta?.variant ?? 'primary'}
        loading={mutation.isPending}
        message={
          <>
            <strong className="font-medium text-slate-900">{taskLabel(submission.task)}</strong>
            {` · attempt #${submission.attemptNumber ?? 1} from `}
            <strong className="font-medium text-slate-900">{ownerName(submission)}</strong>. The
            decision can&apos;t be changed after you submit it.
          </>
        }
      >
        {pendingReview?.feedback ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your feedback</p>
            <blockquote className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {pendingReview.feedback}
            </blockquote>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No feedback included.</p>
        )}
      </ConfirmDialog>
    </Card>
  );
}

export default DecisionForm;
