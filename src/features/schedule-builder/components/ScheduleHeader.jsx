import { Badge, PageHeader, StatusBadge } from '@/shared/components/ui';
import { ROUTES, SCHEDULE_STATUS } from '@/shared/constants';
import { CalendarClock, Layers } from '@/shared/icons';
import { formatDate, formatDateTime, formatDuration, formatRelativeTime } from '@/shared/utils/helpers';
import { scheduleName } from '../utils/format';

function DateLine({ schedule }) {
  if (schedule.status !== SCHEDULE_STATUS.DRAFT && schedule.publishedAt) {
    return (
      <span>
        Published{' '}
        <time dateTime={schedule.publishedAt} title={formatDateTime(schedule.publishedAt)}>
          {formatDate(schedule.publishedAt)}
        </time>
      </span>
    );
  }
  if (!schedule.updatedAt) return null;
  return (
    <span>
      Last saved{' '}
      <time dateTime={schedule.updatedAt} title={formatDateTime(schedule.updatedAt)}>
        {formatRelativeTime(schedule.updatedAt)}
      </time>
    </span>
  );
}

/**
 * Page header for one schedule version (KD6/KD7): designation · domain as the h1, then duration,
 * "Version N" and its status. `children` (the section tabs) render underneath.
 */
export function ScheduleHeader({ schedule, actions, children }) {
  const name = scheduleName(schedule);

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Schedules', to: ROUTES.ADMIN_SCHEDULES },
        { label: `${name} · v${schedule.version}` },
      ]}
      eyebrow="Schedule"
      title={name}
      description={
        <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            {formatDuration(schedule.durationMonths)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Badge variant="brand" icon={Layers}>
              Version {schedule.version}
            </Badge>
            <StatusBadge status={schedule.status} />
          </span>
          <DateLine schedule={schedule} />
        </span>
      }
      actions={actions}
    >
      {children}
    </PageHeader>
  );
}

export default ScheduleHeader;
