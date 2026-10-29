import { formatDateTime, formatDuration, formatRelativeTime } from '@/shared/utils/helpers';

/** Designation (bold) over domain · duration — the compact "which schedule" cell. */
export function ScheduleNameCell({ schedule }) {
  return (
    <div className="min-w-[11rem]">
      <p className="font-medium text-slate-900">{schedule.designation?.name ?? 'Unknown designation'}</p>
      <p className="text-xs text-slate-500">
        {schedule.domain?.name ?? 'Unknown domain'} · {formatDuration(schedule.durationMonths)}
      </p>
    </div>
  );
}

/** Relative time with the full date on hover and for assistive tech. */
export function UpdatedCell({ value }) {
  if (!value) return <span className="text-slate-500">—</span>;
  return (
    <time dateTime={value} title={formatDateTime(value)} className="whitespace-nowrap">
      {formatRelativeTime(value)}
    </time>
  );
}
