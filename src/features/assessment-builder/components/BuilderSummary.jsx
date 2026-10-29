import { Button, DescriptionList, ProgressBar } from '@/shared/components/ui';
import { AlertCircle, CheckCircle2 } from '@/shared/icons';
import { formatDateTime } from '@/shared/utils/helpers';
import { QUESTION_COUNT } from '../utils/validation';
import { getVersionInfo } from '../utils/versions';

const SECTION_LABELS = { questions: 'Go to questions', slabs: 'Go to slabs' };

/**
 * Live publishing checklist (KD5): question completeness, every validation rule with what still
 * needs attention, and the version facts. `onJump(target)` scrolls to 'questions' or 'slabs'.
 */
export function BuilderSummary({ validation, config, onJump }) {
  const { checks, issueCount, completeQuestions } = validation;
  const { liveVersion, draftVersion, nextSaveVersion } = getVersionInfo(config);
  const allComplete = completeQuestions === QUESTION_COUNT;

  let draftLabel = 'Not saved yet';
  if (draftVersion) draftLabel = `v${draftVersion}`;
  else if (config) draftLabel = `None — saving starts v${nextSaveVersion}`;

  return (
    <section
      id="assessment-checklist"
      aria-labelledby="assessment-checklist-heading"
      className="scroll-mt-24 rounded-xl border border-slate-200 bg-white shadow-card"
    >
      <div className="border-b border-slate-100 px-5 py-4">
        <h2
          id="assessment-checklist-heading"
          tabIndex={-1}
          className="text-base font-semibold text-slate-900 focus:outline-none"
        >
          Publishing checklist
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {issueCount === 0
            ? 'Everything is in place. Save your changes, then publish.'
            : `${issueCount} ${issueCount === 1 ? 'item needs' : 'items need'} attention before you can publish.`}
        </p>
      </div>

      <div className="space-y-5 px-5 py-4">
        <ProgressBar
          label="Questions complete"
          value={completeQuestions}
          max={QUESTION_COUNT}
          size="sm"
          variant={allComplete ? 'success' : 'brand'}
          aria-valuetext={`${completeQuestions} of ${QUESTION_COUNT} questions complete`}
        />

        <ul className="space-y-3">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2.5">
              {check.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              )}
              <div className="min-w-0 text-sm">
                <p className={check.ok ? 'text-slate-700' : 'font-medium text-slate-900'}>
                  {check.label}
                  <span className="sr-only">{check.ok ? ' (done)' : ' (needs attention)'}</span>
                </p>
                {!check.ok && check.detail ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {check.detail}{' '}
                    {onJump && check.target ? (
                      <Button
                        variant="link"
                        size="xs"
                        className="align-baseline"
                        onClick={() => onJump(check.target)}
                      >
                        {SECTION_LABELS[check.target] ?? 'Show'}
                      </Button>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-5 py-4">
        <DescriptionList
          columns={1}
          items={[
            { label: 'Live version', value: liveVersion ? `v${liveVersion}` : 'None yet' },
            { label: 'Working draft', value: draftLabel },
            { label: 'Last saved', value: config?.updatedAt ? formatDateTime(config.updatedAt) : 'Never' },
          ]}
        />
      </div>
    </section>
  );
}

export default BuilderSummary;
