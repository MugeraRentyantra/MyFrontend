import { Button, EmptyState, ErrorState, Modal, Skeleton, StatusBanner } from '@/shared/components/ui';
import { CalendarClock, Lock } from '@/shared/icons';
import { formatDuration, pluralize } from '@/shared/utils/helpers';
import { useSchedulePreview } from '../hooks/usePlans';

function PreviewSkeleton() {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">Loading schedule…</span>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
          aria-hidden="true"
        >
          <Skeleton className="h-6 w-14" rounded="md" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}

/**
 * Locked schedule preview for a plan (SN5): day titles only — the activities, SOPs and tasks
 * unlock after payment and are never sent by this endpoint.
 */
export function SchedulePreviewModal({ open, onClose, plan }) {
  const previewQuery = useSchedulePreview(plan?._id, { enabled: Boolean(open && plan?._id) });
  const preview = previewQuery.data;
  const days = Array.isArray(preview?.days) ? preview.days : [];

  const subtitle = plan
    ? [plan.designation?.name, plan.domain?.name, formatDuration(plan.durationMonths)]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  let body;
  if (previewQuery.isLoading) {
    body = <PreviewSkeleton />;
  } else if (previewQuery.isError) {
    body = (
      <ErrorState
        compact
        error={previewQuery.error}
        title="We couldn't load this schedule"
        onRetry={previewQuery.refetch}
      />
    );
  } else if (days.length === 0) {
    body = (
      <EmptyState
        compact
        icon={CalendarClock}
        title="The day-wise schedule is being finalised"
        description="Day titles appear here as soon as the training team publishes them."
      />
    );
  } else {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          {pluralize(preview?.totalDays ?? days.length, 'day')} of guided, hands-on work.
        </p>
        <ol className="grid gap-2 sm:grid-cols-2" aria-label="Day titles">
          {days.map((day) => (
            <li
              key={day.dayNumber}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
            >
              <span className="tabular shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                Day {day.dayNumber}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-800" title={day.title}>
                {day.title}
              </span>
              <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule preview"
      description={subtitle}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <StatusBanner variant="info" icon={Lock} title="Full schedule, SOPs and tasks unlock after payment">
          Here you can see the day titles only. Each day&apos;s instructions open once your enrollment is
          active.
        </StatusBanner>
        {body}
      </div>
    </Modal>
  );
}

export default SchedulePreviewModal;
