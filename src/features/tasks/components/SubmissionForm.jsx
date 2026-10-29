import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardBody, CardHeader, StatusBanner, toast } from '@/shared/components/ui';
import { TASK_STATUS } from '@/shared/constants';
import { Upload } from '@/shared/icons';
import { applyServerErrors, getErrorMessage } from '@/shared/utils/errors';
import { useSubmitTask } from '../hooks/useSubmitTask';
import {
  descriptionLength,
  getSubmissionChecklist,
  submissionSchema,
} from '../schemas/submissionValidation';
import { isTeamEnrollment } from '../utils/taskActions';
import { DescriptionField } from './DescriptionField';
import { FeedbackBox } from './FeedbackBox';
import { GithubLinkField } from './GithubLinkField';
import { ScreenshotUploader } from './ScreenshotUploader';
import { SubmitBar } from './SubmitBar';

const FORM_FIELDS = ['screenshots', 'description', 'githubUrl'];

/** "screenshots[0]" / "screenshots.0" -> "screenshots"; unknown fields go to the form banner. */
function normalizeServerError(error) {
  if (!error || !Array.isArray(error.details)) return error;
  const details = error.details.map((detail) => {
    const base = String(detail?.field ?? '').split(/[.[]/)[0];
    return { ...detail, field: FORM_FIELDS.includes(base) ? base : 'root.server' };
  });
  return { ...error, details };
}

function initialValues({ draft, previous, teamRepoUrl }) {
  if (draft) return draft;
  return {
    screenshots: [],
    description: previous?.description ?? '',
    githubUrl: previous?.githubUrl || teamRepoUrl || '',
  };
}

/**
 * Submission form (GP8): screenshots, description and GitHub link, validated with zod and again
 * by the server (422 details land under the matching field). A resubmission starts from the
 * previous attempt's description. The page keeps an unsent draft in `draftRef` so switching tabs
 * does not lose it.
 */
export function SubmissionForm({ content, latestSubmission = null, draftRef, onSubmitted }) {
  const progress = content?.progress ?? {};
  const progressId = progress._id;
  const teamRepoUrl = isTeamEnrollment(content?.enrollment) ? (content?.team?.repoUrl ?? '') : '';
  const isResubmission =
    progress.status === TASK_STATUS.CHANGES_REQUESTED || Boolean(latestSubmission);
  const showFeedback =
    progress.status === TASK_STATUS.CHANGES_REQUESTED && Boolean(latestSubmission?.review);

  const submitTask = useSubmitTask(progressId);
  const submittedRef = useRef(false);

  // Read the saved draft once, when the form mounts.
  const [draft] = useState(() => draftRef?.current ?? null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(submissionSchema),
    mode: 'onTouched',
    defaultValues: initialValues({ draft, previous: latestSubmission, teamRepoUrl }),
  });

  // Keep the unsent draft (including picked files) when the tab panel unmounts.
  useEffect(
    () => () => {
      if (draftRef && !submittedRef.current) draftRef.current = getValues();
    },
    [draftRef, getValues],
  );

  const values = watch();
  const checklist = getSubmissionChecklist(values);
  const submitting = isSubmitting || submitTask.isPending;

  let prefillSource = null;
  if (!draft && latestSubmission?.githubUrl) prefillSource = 'previous';
  else if (!draft && teamRepoUrl) prefillSource = 'team';

  const onSubmit = async (data) => {
    if (submitTask.isPending) return;
    try {
      const submission = await submitTask.mutateAsync(data);
      submittedRef.current = true;
      if (draftRef) draftRef.current = null;
      toast.success('Submitted for review', {
        description: 'Your trainer has been notified. You can follow the review in History.',
      });
      onSubmitted?.(submission);
    } catch (error) {
      const applied = applyServerErrors(normalizeServerError(error), setError);
      if (!applied) {
        toast.error(getErrorMessage(error, 'Could not submit your work. Please try again.'));
      }
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} aria-busy={submitting || undefined}>
      <Card padding="none">
        <CardHeader
          title={isResubmission ? 'Resubmit your work' : 'Submit your work'}
          description={
            isResubmission
              ? 'Upload fresh screenshots that show your changes, then update the description and link.'
              : 'Add screenshots of your result, describe what you did and link your code on GitHub.'
          }
          icon={Upload}
        />
        <CardBody className="space-y-6">
          {showFeedback ? (
            <FeedbackBox review={latestSubmission.review} title="What your trainer asked for" />
          ) : null}

          {errors.root?.server?.message ? (
            <StatusBanner variant="error" title="We couldn't accept this submission">
              {errors.root.server.message}
            </StatusBanner>
          ) : null}

          <Controller
            name="screenshots"
            control={control}
            render={({ field, fieldState }) => (
              <ScreenshotUploader
                files={field.value ?? []}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                disabled={submitting}
              />
            )}
          />

          <DescriptionField
            {...register('description')}
            count={descriptionLength(values.description)}
            error={errors.description?.message}
            isResubmission={isResubmission && !draft && Boolean(latestSubmission?.description)}
            readOnly={submitting}
          />

          <GithubLinkField
            {...register('githubUrl')}
            error={errors.githubUrl?.message}
            prefillSource={prefillSource}
            readOnly={submitting}
          />
        </CardBody>
        <SubmitBar
          checklist={checklist}
          submitting={submitting}
          uploadProgress={submitTask.uploadProgress}
          label={isResubmission ? 'Resubmit for review' : 'Submit for review'}
        />
      </Card>
    </form>
  );
}

export default SubmissionForm;
