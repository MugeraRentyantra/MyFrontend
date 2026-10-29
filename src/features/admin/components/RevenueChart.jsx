import { useMemo } from 'react';
import { BarChart, Card, CardBody, CardHeader, Skeleton } from '@/shared/components/ui';
import { formatCompactMoney, formatMoney } from '@/shared/utils/helpers';
import { formatMonthLong, formatMonthShort, monthYear } from '../utils/format';

/** [{ month: 'YYYY-MM', amount }] → BarChart rows, oldest month first. */
function toSeries(revenueByMonth) {
  const rows = (Array.isArray(revenueByMonth) ? revenueByMonth : [])
    .filter((row) => row && row.month)
    .sort((a, b) => String(a.month).localeCompare(String(b.month)));
  const years = new Set(rows.map((row) => monthYear(row.month)));
  const withYear = years.size > 1;
  return rows.map((row) => ({
    month: row.month,
    label: formatMonthShort(row.month, withYear),
    value: Math.max(0, Number(row.amount) || 0),
  }));
}

/** KD1 "Revenue by month": single-series column chart of captured payments (amounts in paise). */
export function RevenueChart({ revenueByMonth, currency, loading = false, className }) {
  const series = useMemo(() => toSeries(revenueByMonth), [revenueByMonth]);
  const hasRevenue = series.some((row) => row.value > 0);

  const summary = useMemo(() => {
    if (!hasRevenue) return 'No revenue recorded yet.';
    const best = series.reduce((top, row) => (row.value > top.value ? row : top), series[0]);
    const first = series[0];
    const last = series[series.length - 1];
    return `Revenue per month from ${formatMonthLong(first.month)} to ${formatMonthLong(
      last.month,
    )}. Highest month: ${formatMonthLong(best.month)} with ${formatMoney(best.value, currency)}.`;
  }, [series, hasRevenue, currency]);

  const formatValue = (value) => formatCompactMoney(value, currency);

  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Revenue by month"
        description="Captured payments, grouped by the month they were confirmed."
      />
      <CardBody>
        {loading ? (
          <div role="status">
            <span className="sr-only">Loading revenue chart</span>
            <Skeleton className="h-60 w-full" rounded="lg" />
          </div>
        ) : (
          <BarChart
            data={hasRevenue ? series : []}
            orientation="vertical"
            valueFormatter={formatValue}
            height={240}
            title="Revenue by month"
            description={summary}
            labelHeader="Month"
            valueHeader="Revenue"
            emptyMessage="No captured payments yet. Revenue appears here once students pay."
          />
        )}
      </CardBody>
    </Card>
  );
}

export default RevenueChart;
