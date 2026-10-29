import { useMemo } from 'react';
import { Badge, Button, DataTable, PageHeader, StatusBadge, Tooltip } from '@/shared/components/ui';
import { AlertTriangle, CreditCard, Flag } from '@/shared/icons';
import { PAGE_SIZE_OPTIONS } from '@/shared/constants';
import { queryKeys } from '@/services/queryKeys';
import { useDocumentTitle } from '@/shared/hooks';
import { formatDateTime, formatMoney, humanize } from '@/shared/utils/helpers';
import { ClearFiltersButton } from '../components/ClearFiltersButton';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { FilterSelect } from '../components/FilterSelect';
import { PaymentDrawer } from '../components/PaymentDrawer';
import { PersonCell } from '../components/PersonCell';
import { PAYMENT_STATUS_OPTIONS } from '../constants';
import { fetchAdminPayments } from '../hooks/useAdminPayments';
import { useUrlFilters } from '../hooks/useUrlFilters';

const FILTER_KEYS = ['status', 'flagged', 'from', 'to'];
const URL_KEYS = [...FILTER_KEYS, 'payment'];
const INITIAL_SORT = { key: 'createdAt', direction: 'desc' };

function FlagIndicator({ payment }) {
  if (!payment.flagged) return null;
  return (
    <Tooltip content={payment.flagReason || 'Flagged for review'}>
      <Badge variant="warning" icon={AlertTriangle} tabIndex={0} className="cursor-help">
        Flagged
      </Badge>
    </Tooltip>
  );
}

const COLUMNS = [
  {
    key: 'orderId',
    header: 'Order',
    cell: (payment) => (
      <div className="flex flex-col items-start gap-1">
        <span className="whitespace-nowrap font-mono text-xs text-slate-900">{payment.orderId || '—'}</span>
        <FlagIndicator payment={payment} />
      </div>
    ),
  },
  {
    key: 'user',
    header: 'Student',
    cell: (payment) => <PersonCell person={payment.user} avatarSize="xs" />,
  },
  {
    key: 'amount',
    header: 'Amount',
    align: 'right',
    sortable: true,
    cell: (payment) => (
      <span className="tabular whitespace-nowrap font-medium text-slate-900">
        {formatMoney(payment.amount, payment.currency)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    cell: (payment) => <StatusBadge status={payment.status} />,
  },
  {
    key: 'provider',
    header: 'Provider',
    cell: (payment) => <span className="text-slate-600">{payment.provider ? humanize(payment.provider) : '—'}</span>,
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: true,
    cell: (payment) => (
      <span className="whitespace-nowrap text-slate-600">{formatDateTime(payment.createdAt)}</span>
    ),
  },
];

/**
 * KD8 payment monitoring. Filters live in the URL (?status=FAILED, ?flagged=true) so the dashboard links
 * straight to them; ?payment=<id> opens the detail drawer.
 */
export function PaymentsPage() {
  useDocumentTitle('Payments');
  const { values, setValue, setValues, clear } = useUrlFilters(URL_KEYS);
  const flaggedOnly = values.flagged === 'true';

  const filters = useMemo(
    () => ({
      status: values.status,
      flagged: flaggedOnly ? 'true' : undefined,
      from: values.from,
      to: values.to,
    }),
    [values.status, flaggedOnly, values.from, values.to],
  );
  const activeFilterCount = FILTER_KEYS.filter((key) => values[key]).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Orders and their gateway status. Payments only count once the gateway confirms them; select a row for the full event history."
      />

      <DataTable
        fetcher={fetchAdminPayments}
        queryKey={queryKeys.admin.payments}
        filters={filters}
        columns={COLUMNS}
        initialSort={INITIAL_SORT}
        searchPlaceholder="Search order ID or student…"
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        caption="Payments"
        onRowClick={(payment) => setValue('payment', payment._id)}
        rowClassName={(payment) => (payment._id === values.payment ? 'bg-brand-50/60' : undefined)}
        toolbar={
          <>
            <FilterSelect
              label="Filter by payment status"
              allLabel="All statuses"
              value={values.status}
              onChange={(value) => setValue('status', value)}
              options={PAYMENT_STATUS_OPTIONS}
            />
            <Button
              variant={flaggedOnly ? 'secondary' : 'outline'}
              leftIcon={Flag}
              aria-pressed={flaggedOnly}
              onClick={() => setValue('flagged', flaggedOnly ? '' : 'true')}
              className="w-full sm:w-auto"
            >
              Flagged only
            </Button>
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
          icon: CreditCard,
          title: 'No payments yet',
          description: 'Payments appear here when students start checkout.',
        }}
      />

      <PaymentDrawer paymentId={values.payment || null} onClose={() => setValue('payment', '')} />
    </div>
  );
}

export default PaymentsPage;
