import { useMemo } from 'react';
import { DataTable, PageHeader, StatusBadge } from '@/shared/components/ui';
import { GraduationCap } from '@/shared/icons';
import { ENROLLMENT_TYPE, PAGE_SIZE_OPTIONS } from '@/shared/constants';
import { queryKeys } from '@/services/queryKeys';
import { useDocumentTitle } from '@/shared/hooks';
import { formatDate, formatMoney, formatPercent } from '@/shared/utils/helpers';
import { ClearFiltersButton } from '../components/ClearFiltersButton';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { EnrollmentDrawer } from '../components/EnrollmentDrawer';
import { FilterSelect } from '../components/FilterSelect';
import { PersonCell } from '../components/PersonCell';
import { PlanCell } from '../components/PlanCell';
import { ENROLLMENT_STATUS_OPTIONS } from '../constants';
import { fetchAdminEnrollments, useDesignationOptions } from '../hooks/useAdminEnrollments';
import { useUrlFilters } from '../hooks/useUrlFilters';

const FILTER_KEYS = ['status', 'designationId', 'from', 'to'];
const URL_KEYS = [...FILTER_KEYS, 'enrollment'];
const INITIAL_SORT = { key: 'createdAt', direction: 'desc' };

const COLUMNS = [
  {
    key: 'student',
    header: 'Student',
    cell: (enrollment) => <PersonCell person={enrollment.student} avatarSize="xs" />,
  },
  {
    key: 'plan',
    header: 'Plan',
    cell: (enrollment) => <PlanCell plan={enrollment.plan} />,
  },
  {
    key: 'enrollmentType',
    header: 'Type',
    cell: (enrollment) => (
      <div className="min-w-0">
        <StatusBadge status={enrollment.enrollmentType} dot={false} />
        {enrollment.enrollmentType === ENROLLMENT_TYPE.TEAM && enrollment.team?.name ? (
          <p className="mt-1 max-w-[10rem] truncate text-xs text-slate-500" title={enrollment.team.name}>
            {enrollment.team.name}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'priceSnapshot.payableAmount',
    header: 'Payable',
    align: 'right',
    sortable: true,
    cell: (enrollment) => {
      const snapshot = enrollment.priceSnapshot ?? {};
      return (
        <div className="whitespace-nowrap">
          <span className="tabular font-medium text-slate-900">
            {formatMoney(snapshot.payableAmount, snapshot.currency)}
          </span>
          {Number(snapshot.discountPercent) > 0 ? (
            <span className="block text-xs text-slate-500">{formatPercent(snapshot.discountPercent)} off</span>
          ) : null}
        </div>
      );
    },
  },
  {
    key: 'paymentStatus',
    header: 'Payment',
    cell: (enrollment) =>
      enrollment.paymentStatus ? (
        <StatusBadge status={enrollment.paymentStatus} />
      ) : (
        <span className="text-sm text-slate-500">Not started</span>
      ),
  },
  {
    key: 'status',
    header: 'Enrollment',
    cell: (enrollment) => <StatusBadge status={enrollment.status} />,
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: true,
    cell: (enrollment) => (
      <span className="whitespace-nowrap text-slate-600">{formatDate(enrollment.createdAt)}</span>
    ),
  },
];

/** KD8 enrollment monitoring: payment and enrollment status side by side; a row opens the detail drawer. */
export function EnrollmentsPage() {
  useDocumentTitle('Enrollments');
  const { values, setValue, setValues, clear } = useUrlFilters(URL_KEYS);
  const designations = useDesignationOptions();

  const filters = useMemo(
    () => ({
      status: values.status,
      designationId: values.designationId,
      from: values.from,
      to: values.to,
    }),
    [values.status, values.designationId, values.from, values.to],
  );
  const activeFilterCount = FILTER_KEYS.filter((key) => values[key]).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        description="Every enrollment with its price snapshot, payment status and enrollment status. Select a row to see payments and their gateway events."
      />

      <DataTable
        fetcher={fetchAdminEnrollments}
        queryKey={queryKeys.admin.enrollments}
        filters={filters}
        columns={COLUMNS}
        initialSort={INITIAL_SORT}
        searchPlaceholder="Search student name or email…"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        caption="Enrollments"
        onRowClick={(enrollment) => setValue('enrollment', enrollment._id)}
        rowClassName={(enrollment) => (enrollment._id === values.enrollment ? 'bg-brand-50/60' : undefined)}
        toolbar={
          <>
            <FilterSelect
              label="Filter by enrollment status"
              allLabel="All statuses"
              value={values.status}
              onChange={(value) => setValue('status', value)}
              options={ENROLLMENT_STATUS_OPTIONS}
            />
            <FilterSelect
              label="Filter by designation"
              allLabel={designations.isLoading ? 'Loading designations…' : 'All designations'}
              value={values.designationId}
              onChange={(value) => setValue('designationId', value)}
              options={designations.data ?? []}
              className="sm:w-52"
            />
            <DateRangeFilter
              label="Created date"
              from={values.from}
              to={values.to}
              onChange={({ from, to }) => setValues({ from, to })}
            />
            <ClearFiltersButton count={activeFilterCount} onClear={() => clear(FILTER_KEYS)} />
          </>
        }
        emptyState={{
          icon: GraduationCap,
          title: 'No enrollments yet',
          description: 'Enrollments appear here as soon as a student accepts a quote.',
        }}
      />

      <EnrollmentDrawer
        enrollmentId={values.enrollment || null}
        onClose={() => setValue('enrollment', '')}
      />
    </div>
  );
}

export default EnrollmentsPage;
