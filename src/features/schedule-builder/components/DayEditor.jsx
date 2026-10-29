import { memo, useState } from 'react';
import { Input, Textarea } from '@/shared/components/ui';
import { ChevronDown, FileText } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatNumber } from '@/shared/utils/helpers';
import { DAY_LIMITS } from '../schemas/scheduleValidation';
import { dayFieldId } from '../utils/days';
import { MarkdownEditor } from './MarkdownEditor';

function sameErrors(a, b) {
  if (a === b) return true;
  const aKeys = Object.keys(a ?? {});
  const bKeys = Object.keys(b ?? {});
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a[key] === b[key]);
}

/**
 * The fields of one schedule day (rendered inside a DynamicRowEditor row): title, activity,
 * required evidence and the SOP (markdown, collapsible to keep long schedules scannable).
 * `onChange(patch)` merges the patch into the day.
 */
function DayEditorComponent({ day, onChange, readOnly = false, errors }) {
  const sopError = errors?.sopContent;
  const [sopOpen, setSopOpen] = useState(() => !readOnly && !String(day.sopContent ?? '').trim());
  const showSop = sopOpen || Boolean(sopError);
  const sopRegionId = dayFieldId(day.key, 'sop-region');
  const sopLength = String(day.sopContent ?? '').length;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input
        id={dayFieldId(day.key, 'title')}
        label="Title"
        required={!readOnly}
        value={day.title}
        onChange={(event) => onChange({ title: event.target.value })}
        readOnly={readOnly}
        maxLength={DAY_LIMITS.title}
        placeholder="e.g. Set up your development environment"
        error={errors?.title}
      />
      <Input
        id={dayFieldId(day.key, 'requiredEvidence')}
        label="Required evidence"
        value={day.requiredEvidence}
        onChange={(event) => onChange({ requiredEvidence: event.target.value })}
        readOnly={readOnly}
        maxLength={DAY_LIMITS.requiredEvidence}
        placeholder="e.g. Screenshot of the running app"
        hint={readOnly ? undefined : 'What students hand in for this day.'}
        error={errors?.requiredEvidence}
      />
      <Textarea
        id={dayFieldId(day.key, 'activity')}
        className="sm:col-span-2"
        label="Activity"
        rows={3}
        value={day.activity}
        onChange={(event) => onChange({ activity: event.target.value })}
        readOnly={readOnly}
        placeholder="What students do today, in a sentence or two."
        showCount={!readOnly}
        maxLength={DAY_LIMITS.activity}
        error={errors?.activity}
      />

      <div className="sm:col-span-2">
        <button
          type="button"
          onClick={() => setSopOpen((open) => !open)}
          aria-expanded={showSop}
          aria-controls={sopRegionId}
          disabled={Boolean(sopError)}
          className={cn(
            'flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors duration-150',
            'hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:hover:bg-slate-50',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="text-sm font-medium text-slate-700">SOP content</span>
            <span className="truncate text-xs text-slate-500">
              {sopLength > 0 ? `${formatNumber(sopLength)} characters` : 'Not written yet'}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700">
            {showSop ? 'Hide' : readOnly ? 'View' : 'Edit'}
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-150', showSop && 'rotate-180')}
              aria-hidden="true"
            />
          </span>
        </button>
        {showSop ? (
          <div id={sopRegionId} className="mt-3">
            <MarkdownEditor
              id={dayFieldId(day.key, 'sopContent')}
              label={`SOP for day ${day.dayNumber}`}
              value={day.sopContent}
              onChange={(value) => onChange({ sopContent: value })}
              readOnly={readOnly}
              rows={12}
              maxLength={DAY_LIMITS.sopContent}
              placeholder={'## Goal\nWhat students achieve today.\n\n## Steps\n1. …\n2. …'}
              error={sopError}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Memoised: typing in one day doesn't re-render the others. `onChange` is ignored in the comparison
 * because DynamicRowEditor's update helper always targets the row's current index.
 */
export const DayEditor = memo(
  DayEditorComponent,
  (previous, next) =>
    previous.day === next.day &&
    previous.readOnly === next.readOnly &&
    previous.index === next.index &&
    sameErrors(previous.errors, next.errors),
);

export default DayEditor;
