import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button, PageHeader, StatCard } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { AlertTriangle, Gauge, Inbox, Users } from '@/shared/icons';
import { formatNumber, formatPercent, pluralize } from '@/shared/utils/helpers';
import { ProgressReportTable } from '../components/ProgressReportTable';
import { useTrainerAssignments } from '../hooks/useTrainerAssignments';
import { INACTIVE_AFTER_DAYS, isTeamItem, toReportRow } from '../utils/reviewHelpers';

function summarise(rows) {
  const withTasks = rows.filter((row) => row.total > 0);
  const averageCompletion = withTasks.length
    ? withTasks.reduce((sum, row) => sum + row.completion, 0) / withTasks.length
    : null;
  const teams = rows.filter(isTeamItem).length;
  return {
    assigned: rows.length,
    students: rows.length - teams,
    teams,
    averageCompletion,
    inactive: rows.filter((row) => row.inactive === 'yes').length,
    pending: rows.reduce((sum, row) => sum + row.pending, 0),
  };
}

/** /trainer/reports (KD13): how every assigned student and team is progressing. */
export function TrainerReportsPage() {
  useDocumentTitle('Reports');
  const { data, isLoading, isError, error, refetch, isFetching } = useTrainerAssignments();
  const rows = useMemo(() => (data ? data.map(toReportRow) : undefined), [data]);
  const summary = useMemo(() => summarise(rows ?? []), [rows]);
  const tilesLoading = isLoading || (!rows && isFetching);
  const showTiles = !isError || Boolean(rows);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Progress of the students and teams assigned to you. Inactive ones are listed first."
        actions={
          <Button as={Link} to={ROUTES.TRAINER} variant="outline" leftIcon={Inbox}>
            Review queue
          </Button>
        }
      />

      {showTiles ? (
        <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Assigned to you"
            value={formatNumber(summary.assigned)}
            hint={`${pluralize(summary.students, 'student')} · ${pluralize(summary.teams, 'team')}`}
            icon={Users}
            loading={tilesLoading}
          />
          <StatCard
            label="Average completion"
            value={summary.averageCompletion === null ? '—' : formatPercent(summary.averageCompletion)}
            hint="Approved tasks out of all tasks"
            icon={Gauge}
            tone="brand"
            loading={tilesLoading}
          />
          <StatCard
            label="Inactive"
            value={formatNumber(summary.inactive)}
            hint={`No activity for ${INACTIVE_AFTER_DAYS}+ days`}
            icon={AlertTriangle}
            tone={summary.inactive > 0 ? 'warning' : 'default'}
            loading={tilesLoading}
          />
          <StatCard
            label="Waiting for review"
            value={formatNumber(summary.pending)}
            hint="Submissions in your queue"
            icon={Inbox}
            to={ROUTES.TRAINER}
            loading={tilesLoading}
          />
        </section>
      ) : null}

      <ProgressReportTable
        rows={rows}
        loading={isLoading || isFetching}
        error={isError ? error : null}
        onRetry={refetch}
      />
    </div>
  );
}

export default TrainerReportsPage;
