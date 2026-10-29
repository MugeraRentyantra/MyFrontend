import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDialog, PageHeader, StatusBanner, toast } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { getErrorMessage, isErrorCode } from '@/shared/utils/errors';
import { formatRelativeTime } from '@/shared/utils/helpers';
import {
  isAssessmentConfig,
  usePublishAssessment,
  useSaveAssessmentDraft,
  useUnsavedChangesGuard,
} from '../hooks/useAssessmentBuilder';
import { createInitialDraft, serializeDraft, toPayload, validateDraft } from '../utils/validation';
import { getVersionInfo } from '../utils/versions';
import { BuilderSummary } from './BuilderSummary';
import { PublishBar } from './PublishBar';
import { QuestionEditor } from './QuestionEditor';
import { SlabTable } from './SlabTable';
import { VersionBadges } from './VersionBadges';

const SECTION_HEADINGS = {
  questions: 'questions-heading',
  slabs: 'slabs-heading',
  checklist: 'assessment-checklist-heading',
};

function focusSection(target) {
  const heading = document.getElementById(SECTION_HEADINGS[target] ?? target);
  if (!heading) return;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  heading.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}

/** Keeps the row keys of the draft that was sent, so a save never remounts the editors. */
function adoptSavedDraft(saved, current) {
  const next = createInitialDraft(saved);
  return {
    questions: next.questions.map((row, index) => ({ ...row, key: current.questions[index]?.key ?? row.key })),
    slabs: next.slabs.map((row, index) => ({ ...row, key: current.slabs[index]?.key ?? row.key })),
  };
}

function ServerIssues({ issues, onDismiss }) {
  if (!issues) return null;
  const details = Array.isArray(issues.details) ? issues.details.filter((detail) => detail?.message) : [];
  return (
    <StatusBanner variant="error" title={issues.title} onDismiss={onDismiss}>
      <p>{issues.message}</p>
      {details.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-4">
          {details.slice(0, 10).map((detail, index) => (
            <li key={`${detail.field ?? 'detail'}-${index}`}>{detail.message}</li>
          ))}
          {details.length > 10 ? <li>…and {details.length - 10} more.</li> : null}
        </ul>
      ) : null}
    </StatusBanner>
  );
}

/**
 * The assessment builder screen (KD5) for one designation: 15 questions, discount slabs, a live
 * checklist and a sticky Save / Publish bar. `config` is the latest saved config (null when the
 * designation has none yet — the editor then starts from an empty draft with the default slabs).
 * Mount it with `key={designationId}` so switching designation starts a fresh editor.
 */
export function AssessmentBuilder({ designationId, designation, config }) {
  const [initial] = useState(() => {
    const draft = createInitialDraft(config);
    return { draft, snapshot: serializeDraft(draft) };
  });
  const [draft, setDraft] = useState(initial.draft);
  const [baseline, setBaseline] = useState(initial.snapshot);
  const [serverIssues, setServerIssues] = useState(null);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const snapshot = useMemo(() => serializeDraft(draft), [draft]);
  const isDirty = snapshot !== baseline;
  const validation = useMemo(() => validateDraft(draft), [draft]);

  const saveMutation = useSaveAssessmentDraft(designationId);
  const publishMutation = usePublishAssessment(designationId);
  const blocker = useUnsavedChangesGuard(isDirty);

  const isSaving = saveMutation.isPending;
  const isPublishing = publishMutation.isPending;
  const versions = getVersionInfo(config);
  const designationName = designation?.name ?? 'Assessment';

  const setQuestions = useCallback((questions) => setDraft((current) => ({ ...current, questions })), []);
  const setSlabs = useCallback((slabs) => setDraft((current) => ({ ...current, slabs })), []);

  // ---- Save draft ---------------------------------------------------------------------------
  const canSave = isDirty && !isSaving && !isPublishing;

  const handleSave = () => {
    if (!canSave) return;
    const payload = toPayload(draft);
    const sentSnapshot = JSON.stringify(payload);
    setServerIssues(null);
    saveMutation.mutate(payload, {
      onSuccess: (saved) => {
        const current = draftRef.current;
        if (isAssessmentConfig(saved) && serializeDraft(current) === sentSnapshot) {
          // Adopt the server copy (new questions now have ids) — nothing was typed meanwhile.
          const next = adoptSavedDraft(saved, current);
          setDraft(next);
          setBaseline(serializeDraft(next));
        } else {
          // The admin kept typing while saving: what was sent is saved, the rest is still unsaved.
          setBaseline(sentSnapshot);
        }
        const savedAs = isAssessmentConfig(saved) ? `Saved as draft v${saved.version}. ` : '';
        toast.success('Draft saved', {
          description: versions.liveVersion
            ? `${savedAs}Students keep getting v${versions.liveVersion} until you publish.`
            : `${savedAs}Students won't see it until you publish.`,
        });
      },
      onError: (error) => {
        setServerIssues({
          title: "We couldn't save the draft",
          message: getErrorMessage(error),
          details: error?.details,
        });
        toast.error("Couldn't save the draft", { description: getErrorMessage(error) });
      },
    });
  };

  // ---- Publish --------------------------------------------------------------------------------
  const publishVersion = versions.publishVersion;
  const canPublish = Boolean(publishVersion) && !isDirty && validation.isValid && !isSaving && !isPublishing;

  const handleConfirmPublish = () => {
    if (!canPublish) return;
    publishMutation.mutate(undefined, {
      onSuccess: (published) => {
        setConfirmPublishOpen(false);
        setServerIssues(null);
        const version = isAssessmentConfig(published) ? published.version : publishVersion;
        toast.success(`Version ${version} is live`, {
          description: 'New students get these questions and slabs. Earlier results stay as they are.',
        });
      },
      onError: (error) => {
        setConfirmPublishOpen(false);
        setServerIssues({
          title: isErrorCode(error, 'INVALID_TRANSITION')
            ? 'There is no draft to publish'
            : "This version wasn't published",
          message: getErrorMessage(error),
          details: error?.details,
        });
        toast.error("Couldn't publish", { description: getErrorMessage(error) });
      },
    });
  };

  // ---- Status line for the publish bar ------------------------------------------------------
  let statusText;
  let statusTone = 'neutral';
  if (isSaving) {
    statusText = 'Saving draft…';
    statusTone = 'busy';
  } else if (isPublishing) {
    statusText = `Publishing version ${publishVersion}…`;
    statusTone = 'busy';
  } else if (isDirty) {
    statusText = 'Unsaved changes';
    statusTone = 'warning';
  } else if (!config) {
    statusText = 'Not saved yet';
  } else if (versions.draftVersion) {
    statusText = `Draft v${versions.draftVersion} saved${config.updatedAt ? ` ${formatRelativeTime(config.updatedAt)}` : ''}`;
  } else {
    statusText = `Version ${versions.liveVersion ?? config.version} is live`;
    statusTone = 'success';
  }

  let hint = null;
  let showReview = false;
  if (!isSaving && !isPublishing) {
    if (isDirty) {
      hint = validation.isValid
        ? `Save as draft v${versions.nextSaveVersion}, then publish it.`
        : `Saving is fine while it's incomplete. ${validation.issueCount} ${validation.issueCount === 1 ? 'item needs' : 'items need'} attention before publishing.`;
      showReview = !validation.isValid;
    } else if (!config) {
      hint = 'Write your questions and save a draft. Students see nothing until you publish.';
    } else if (!publishVersion) {
      hint = `Edit and save to start draft v${versions.nextSaveVersion}. Students keep the live version until you publish.`;
    } else if (!validation.isValid) {
      hint = `${validation.issueCount} ${validation.issueCount === 1 ? 'item needs' : 'items need'} attention before you can publish.`;
      showReview = true;
    } else {
      hint = `Ready to publish version ${publishVersion}.`;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Assessments', to: ROUTES.ADMIN_ASSESSMENTS }, { label: designationName }]}
        eyebrow="Assessment builder"
        title={`${designationName} assessment`}
        description="Write the 15 questions students answer before they enroll, mark the correct answers and set the discount each score range earns."
        actions={<VersionBadges config={config} />}
      />

      <ServerIssues issues={serverIssues} onDismiss={() => setServerIssues(null)} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-10">
          <QuestionEditor questions={draft.questions} onChange={setQuestions} issues={validation.questionIssues} />
          <SlabTable slabs={draft.slabs} onChange={setSlabs} analysis={validation.slabs} />
        </div>
        <aside aria-label="Publishing status" className="min-w-0 lg:sticky lg:top-24">
          <BuilderSummary validation={validation} config={config} onJump={focusSection} />
        </aside>
      </div>

      <PublishBar
        statusText={statusText}
        statusTone={statusTone}
        hint={hint}
        onReviewIssues={showReview ? () => focusSection('checklist') : undefined}
        onSave={handleSave}
        onPublish={() => setConfirmPublishOpen(true)}
        canSave={canSave}
        canPublish={canPublish}
        isSaving={isSaving}
        isPublishing={isPublishing}
        publishLabel={publishVersion ? `Publish v${publishVersion}` : 'Publish'}
      />

      <ConfirmDialog
        open={confirmPublishOpen}
        onClose={() => {
          if (!isPublishing) setConfirmPublishOpen(false);
        }}
        onConfirm={handleConfirmPublish}
        loading={isPublishing}
        confirmDisabled={!canPublish && !isPublishing}
        title={publishVersion ? `Publish version ${publishVersion}?` : 'Publish this version?'}
        message={`Publishing creates version ${publishVersion ?? versions.nextSaveVersion}. Students who already took the assessment keep their result.`}
        confirmLabel={publishVersion ? `Publish version ${publishVersion}` : 'Publish'}
        cancelLabel="Cancel"
      />

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        variant="danger"
        title="Leave without saving?"
        message="You have unsaved changes to this assessment. If you leave now, they will be lost."
        confirmLabel="Leave without saving"
        cancelLabel="Keep editing"
      />
    </div>
  );
}

export default AssessmentBuilder;
