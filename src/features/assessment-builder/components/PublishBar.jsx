import { Button } from '@/shared/components/ui';
import { Rocket, Save } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const TONES = {
  neutral: 'bg-slate-400',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  busy: 'bg-brand-500 animate-pulse',
};

/**
 * Sticky action bar for the assessment builder (KD5): save state on the left (announced politely),
 * "Save draft" and "Publish" on the right. Publish is only enabled for a valid, fully saved draft;
 * `hint` explains why it is not available yet.
 */
export function PublishBar({
  statusText,
  statusTone = 'neutral',
  hint,
  onSave,
  onPublish,
  onReviewIssues,
  canSave,
  canPublish,
  isSaving = false,
  isPublishing = false,
  publishLabel = 'Publish',
  className,
}) {
  return (
    <div className={cn('sticky bottom-3 z-20 sm:bottom-4', className)}>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-elevated backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', TONES[statusTone] ?? TONES.neutral)} aria-hidden="true" />
            {statusText}
          </p>
          {hint ? (
            <p className="mt-0.5 text-xs text-slate-500">
              {hint}{' '}
              {onReviewIssues ? (
                <Button variant="link" size="xs" className="align-baseline" onClick={onReviewIssues}>
                  Review checklist
                </Button>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <Button
            variant="outline"
            leftIcon={Save}
            onClick={onSave}
            loading={isSaving}
            disabled={!canSave || isPublishing}
          >
            Save draft
          </Button>
          <Button leftIcon={Rocket} onClick={onPublish} loading={isPublishing} disabled={!canPublish || isSaving}>
            {publishLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PublishBar;
