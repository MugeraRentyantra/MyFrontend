import { useMemo, useState } from 'react';
import { Badge, Switch } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';
import { formatDateTime, formatMoney, pluralize } from '@/shared/utils/helpers';
import { buildAuditDiff } from '../utils/format';

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const MONEY_KEY = /(price|amount)$/i;

const CHANGE_BADGE = {
  changed: { label: 'Changed', variant: 'warning' },
  added: { label: 'Added', variant: 'success' },
  removed: { label: 'Removed', variant: 'danger' },
};

function isPrimitive(value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value);
}

/** One before/after value, formatted by type (money keys in paise also show the rupee amount). */
function DiffValue({ value, present, fieldKey }) {
  if (!present) return <span className="text-sm italic text-slate-400">Not set</span>;
  if (value === null) return <span className="font-mono text-xs text-slate-500">null</span>;
  if (typeof value === 'boolean') {
    return <span className="font-mono text-xs text-slate-800">{String(value)}</span>;
  }
  if (typeof value === 'number') {
    if (MONEY_KEY.test(fieldKey) && Number.isInteger(value)) {
      return (
        <span className="text-sm text-slate-800">
          <span className="tabular font-medium">{formatMoney(value)}</span>{' '}
          <span className="font-mono text-xs text-slate-500">({value} paise)</span>
        </span>
      );
    }
    return <span className="tabular font-mono text-xs text-slate-800">{value}</span>;
  }
  if (typeof value === 'string') {
    if (ISO_DATE_TIME.test(value)) {
      return (
        <time dateTime={value} className="text-sm text-slate-800">
          {formatDateTime(value)}
        </time>
      );
    }
    if (value === '') return <span className="text-sm italic text-slate-400">Empty</span>;
    return <span className="whitespace-pre-wrap break-words text-sm text-slate-800">{value}</span>;
  }
  if (Array.isArray(value) && value.every(isPrimitive)) {
    if (value.length === 0) return <span className="font-mono text-xs text-slate-500">[ ]</span>;
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((item, index) => (
          <code
            key={index}
            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800"
          >
            {String(item)}
          </code>
        ))}
      </span>
    );
  }
  return (
    <pre className="scrollbar-thin max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-2 font-mono text-xs text-slate-700">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function ValueCell({ label, value, present, fieldKey, tone }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-md',
        tone === 'before' && 'bg-rose-50/70 px-2 py-1.5 ring-1 ring-inset ring-rose-200/70',
        tone === 'after' && 'bg-emerald-50/70 px-2 py-1.5 ring-1 ring-inset ring-emerald-200/70',
      )}
    >
      <span className="mb-1 block text-xs font-medium text-slate-500 md:sr-only">{label}</span>
      <DiffValue value={value} present={present} fieldKey={fieldKey} />
    </div>
  );
}

/**
 * GP13 before/after comparison of an audit entry, field by field. Changed, added and removed fields are
 * highlighted and labelled (never colour alone); "Only changed fields" hides the rest.
 */
export function AuditDiff({ before, after, className }) {
  const rows = useMemo(() => buildAuditDiff(before, after), [before, after]);
  const [onlyChanged, setOnlyChanged] = useState(false);

  const changedCount = rows.filter((row) => row.change !== 'same').length;
  const isCreate = (before === null || before === undefined) && after !== null && after !== undefined;
  const isDelete = (after === null || after === undefined) && before !== null && before !== undefined;
  const visibleRows = onlyChanged ? rows.filter((row) => row.change !== 'same') : rows;

  if (rows.length === 0) {
    return (
      <p className={cn('text-sm text-slate-500', className)}>
        This entry has no before or after details.
      </p>
    );
  }

  let summary = `${pluralize(changedCount, 'field')} changed.`;
  if (isCreate) summary = 'A new record was created with these values.';
  else if (isDelete) summary = 'The record was removed. These were its last values.';
  else if (changedCount === 0) summary = 'No field values changed.';

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">{summary}</p>
        {changedCount > 0 && changedCount < rows.length ? (
          <Switch size="sm" checked={onlyChanged} onChange={setOnlyChanged} label="Only changed fields" />
        ) : null}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div
          className="hidden grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid"
          aria-hidden="true"
        >
          <span>Field</span>
          <span>Before</span>
          <span>After</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {visibleRows.map((row) => {
            const badge = CHANGE_BADGE[row.change];
            const isChanged = row.change === 'changed';
            return (
              <li
                key={row.key}
                className={cn(
                  'grid gap-2 px-4 py-3 md:grid-cols-[minmax(7rem,0.7fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4',
                  badge && 'bg-amber-50/40',
                )}
              >
                <div className="flex min-w-0 flex-wrap items-start gap-2">
                  <span className="break-all font-mono text-xs font-medium text-slate-900">{row.key}</span>
                  {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
                </div>
                <ValueCell
                  label="Before"
                  value={row.before}
                  present={row.hasBefore}
                  fieldKey={row.key}
                  tone={isChanged || row.change === 'removed' ? 'before' : undefined}
                />
                <ValueCell
                  label="After"
                  value={row.after}
                  present={row.hasAfter}
                  fieldKey={row.key}
                  tone={isChanged || row.change === 'added' ? 'after' : undefined}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default AuditDiff;
