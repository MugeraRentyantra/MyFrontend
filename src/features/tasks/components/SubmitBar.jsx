import { Button, ProgressBar } from '@/shared/components/ui';
import { CheckCircle2, Circle, Send } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/**
 * Bottom action bar of the submission form (GP8). Sticky at the bottom of the screen on mobile.
 * "Submit for review" stays disabled until the checklist (screenshots, description, GitHub link)
 * is complete; while the upload runs it shows the progress (announced via aria-live).
 */
export function SubmitBar({
  checklist = [],
  submitting = false,
  uploadProgress = null,
  label = 'Submit for review',
  className,
}) {
  const doneCount = checklist.filter((item) => item.done).length;
  const ready = checklist.length > 0 && doneCount === checklist.length;
  const uploadKnown = typeof uploadProgress === 'number';
  const processing = uploadKnown && uploadProgress >= 100;

  let liveMessage = '';
  if (submitting) {
    liveMessage = processing ? 'Upload complete. Saving your submission…' : 'Uploading your submission…';
  }

  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 rounded-b-xl border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(15,23,42,0.12)] backdrop-blur',
        'sm:static sm:bg-slate-50/60 sm:px-5 sm:shadow-none sm:backdrop-blur-none',
        className,
      )}
    >
      {submitting ? (
        <div className="mb-3">
          {uploadKnown ? (
            <ProgressBar
              value={uploadProgress}
              label={processing ? 'Saving your submission' : 'Uploading screenshots'}
              showValue
              size="sm"
            />
          ) : (
            <p className="text-sm font-medium text-slate-700">Uploading your submission…</p>
          )}
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {liveMessage}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-600 sm:hidden">
            {ready ? 'Ready to submit' : `${doneCount} of ${checklist.length} ready`}
          </p>
          <ul aria-label="Before you submit" className="hidden flex-wrap gap-x-4 gap-y-1 text-xs sm:flex">
            {checklist.map((item) => (
              <li
                key={item.key}
                className={cn(
                  'inline-flex items-center gap-1.5',
                  item.done ? 'text-emerald-700' : 'text-slate-500',
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{item.done ? item.label : (item.hint ?? item.label)}</span>
                <span className="sr-only">{item.done ? '(done)' : '(to do)'}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button
          type="submit"
          leftIcon={Send}
          loading={submitting}
          disabled={!ready}
          className="w-full shrink-0 sm:w-auto"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

export default SubmitBar;
