import { Button, Card, ErrorState, PageHeader, StatusBanner } from '@/shared/components/ui';
import { RefreshCw } from '@/shared/icons';
import { useDocumentTitle } from '@/shared/hooks';
import { formatTime } from '@/shared/utils/helpers';
import { AttentionList } from '../components/AttentionList';
import { EnrollmentsByDesignationChart } from '../components/EnrollmentsByDesignationChart';
import { KpiRow } from '../components/KpiRow';
import { QuickLinks } from '../components/QuickLinks';
import { RevenueChart } from '../components/RevenueChart';
import { VerificationTable } from '../components/VerificationTable';
import { useAdminDashboard } from '../hooks/useAdminDashboard';

/** KD1 admin overview: KPIs, revenue and enrollment charts, payments to verify and open items. */
export function AdminDashboardPage() {
  useDocumentTitle('Admin overview');
  const { stats, attention, refresh, isRefreshing } = useAdminDashboard();

  const data = stats.data;
  const isLoading = stats.isPending;
  const showError = stats.isError && !data;
  const showRefreshError = stats.isError && Boolean(data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Revenue, enrollments and the work that needs your attention."
        actions={
          <>
            {stats.dataUpdatedAt ? (
              <span className="text-xs text-slate-500">Updated {formatTime(stats.dataUpdatedAt)}</span>
            ) : null}
            <Button
              variant="outline"
              leftIcon={RefreshCw}
              loading={isRefreshing}
              onClick={() => {
                refresh();
              }}
            >
              Refresh
            </Button>
          </>
        }
      />

      {showError ? (
        <Card>
          <ErrorState
            error={stats.error}
            title="We couldn't load the overview"
            onRetry={() => {
              refresh();
            }}
          />
        </Card>
      ) : (
        <>
          {showRefreshError ? (
            <StatusBanner
              variant="warning"
              title="These numbers may be out of date"
              action={
                <Button variant="outline" size="sm" onClick={() => stats.refetch()}>
                  Try again
                </Button>
              }
            >
              We couldn't refresh the overview. Showing the last loaded numbers.
            </StatusBanner>
          ) : null}

          <KpiRow stats={data} loading={isLoading} />

          <div className="grid gap-6 xl:grid-cols-5">
            <RevenueChart
              className="xl:col-span-3"
              revenueByMonth={data?.revenueByMonth}
              currency={data?.revenue?.currency}
              loading={isLoading}
            />
            <EnrollmentsByDesignationChart
              className="xl:col-span-2"
              data={data?.enrollmentsByDesignation}
              loading={isLoading}
            />
          </div>

          <VerificationTable
            items={attention.items}
            totals={attention.totals}
            isLoading={attention.isLoading}
            error={attention.error}
            onRetry={() => {
              attention.refetch();
            }}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <AttentionList stats={data} loading={isLoading} />
            <QuickLinks />
          </div>
        </>
      )}
    </div>
  );
}

export default AdminDashboardPage;
