import { Button, StatCard, StatusBanner } from '@/shared/components/ui';
import { CheckCheck, Inbox, RefreshCw, RotateCcw, Users } from '@/shared/icons';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatNumber, pluralize } from '@/shared/utils/helpers';
import { useTrainerStats } from '../hooks/useTrainerStats';

/** KD9 KPI row: pending, changes requested, reviewed today and assigned students + teams. */
export function TrainerStatCards() {
  const { data, isLoading, isError, error, refetch, isFetching } = useTrainerStats();

  if (isError && !data) {
    return (
      <StatusBanner
        variant="error"
        title="We couldn't load your review summary"
        action={
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            loading={isFetching}
            onClick={() => refetch()}
          >
            Try again
          </Button>
        }
      >
        {getErrorMessage(error)}
      </StatusBanner>
    );
  }

  const students = Number(data?.assignedStudents ?? 0) || 0;
  const teams = Number(data?.assignedTeams ?? 0) || 0;

  return (
    <section aria-label="Review summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Pending reviews"
        value={formatNumber(data?.pending ?? 0)}
        hint="Waiting for your decision"
        icon={Inbox}
        tone="brand"
        loading={isLoading}
      />
      <StatCard
        label="Changes requested"
        value={formatNumber(data?.changesRequested ?? 0)}
        hint="Waiting for the student to resubmit"
        icon={RotateCcw}
        tone="warning"
        loading={isLoading}
      />
      <StatCard
        label="Reviewed today"
        value={formatNumber(data?.reviewedToday ?? 0)}
        hint="Decisions you made today"
        icon={CheckCheck}
        tone="success"
        loading={isLoading}
      />
      <StatCard
        label="Assigned to you"
        value={formatNumber(students + teams)}
        hint={`${pluralize(students, 'student')} · ${pluralize(teams, 'team')}`}
        icon={Users}
        loading={isLoading}
      />
    </section>
  );
}

export default TrainerStatCards;
