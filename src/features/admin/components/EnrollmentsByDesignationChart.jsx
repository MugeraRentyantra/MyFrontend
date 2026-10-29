import { useMemo } from 'react';
import { BarChart, Card, CardBody, CardHeader, Skeleton } from '@/shared/components/ui';
import { formatNumber, pluralize } from '@/shared/utils/helpers';
import { designationName } from '../utils/format';

const MAX_BARS = 8;

/** Sorted by count (largest first); beyond 8 designations the tail is folded into one "Other" bar. */
function toSeries(rows) {
  const sorted = (Array.isArray(rows) ? rows : [])
    .filter(Boolean)
    .map((row) => ({
      label: designationName(row.designation),
      value: Math.max(0, Number(row.count) || 0),
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  if (sorted.length <= MAX_BARS) return sorted;
  const head = sorted.slice(0, MAX_BARS - 1);
  const tail = sorted.slice(MAX_BARS - 1);
  return [
    ...head,
    {
      label: `Other (${pluralize(tail.length, 'designation')})`,
      value: tail.reduce((sum, row) => sum + row.value, 0),
    },
  ];
}

/** KD1 "Enrollments by designation": horizontal bars, one per designation, largest first. */
export function EnrollmentsByDesignationChart({ data, loading = false, className }) {
  const series = useMemo(() => toSeries(data), [data]);
  const hasData = series.some((row) => row.value > 0);
  const total = series.reduce((sum, row) => sum + row.value, 0);

  const summary = hasData
    ? `${pluralize(total, 'enrollment')} across ${pluralize(series.length, 'designation')}. Most popular: ${series[0].label} with ${formatNumber(series[0].value)}.`
    : 'No enrollments yet.';

  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Enrollments by designation"
        description="How many enrollments each designation has, largest first."
      />
      <CardBody>
        {loading ? (
          <div role="status" className="space-y-3">
            <span className="sr-only">Loading enrollments chart</span>
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <BarChart
            data={hasData ? series : []}
            orientation="horizontal"
            valueFormatter={formatNumber}
            title="Enrollments by designation"
            description={summary}
            labelHeader="Designation"
            valueHeader="Enrollments"
            emptyMessage="No enrollments yet."
          />
        )}
      </CardBody>
    </Card>
  );
}

export default EnrollmentsByDesignationChart;
