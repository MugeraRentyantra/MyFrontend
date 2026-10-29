import { useId } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/shared/components/ui';
import {
  ArrowUpRight,
  Award,
  ClipboardCheck,
  Flag,
  GraduationCap,
  Hourglass,
  IndianRupee,
  Mail,
  XCircle,
} from '@/shared/icons';
import { EMAIL_STATUS, PAYMENT_STATUS } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatCompactMoney, formatMoney, formatNumber } from '@/shared/utils/helpers';
import { adminLinks } from '../utils/format';

const count = (value) => Math.max(0, Number(value) || 0);

/** Compact money for the tile, the exact amount for screen readers. */
function MoneyValue({ paise, currency }) {
  return (
    <>
      <span aria-hidden="true">{formatCompactMoney(paise ?? 0, currency)}</span>
      <span className="sr-only">{formatMoney(paise ?? 0, currency)}</span>
    </>
  );
}

const MINI_TONES = {
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
  brand: 'bg-brand-50 text-brand-600',
};

/** Smaller linked tile for the second row: a count that opens the matching filtered list. */
function MiniStat({ label, value, icon: Icon, tone = 'warning', to, loading }) {
  const amount = count(value);
  const chip = (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9',
        amount > 0 ? MINI_TONES[tone] : 'bg-slate-100 text-slate-500',
      )}
      aria-hidden="true"
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
    </span>
  );

  if (loading) {
    return (
      <div
        className="flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card"
        aria-busy="true"
      >
        {chip}
        <span className="min-w-0 flex-1">
          <span className="block h-6 w-10 animate-pulse rounded bg-slate-200" aria-hidden="true" />
          <span className="mt-1 block text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
        </span>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="group flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition duration-150 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {chip}
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-semibold tracking-tight text-slate-900">
          {formatNumber(amount)}
        </span>
        <span className="block text-xs font-medium text-slate-500 sm:text-sm">{label}</span>
      </span>
      <ArrowUpRight
        className="hidden h-4 w-4 shrink-0 text-slate-300 transition-colors duration-150 group-hover:text-slate-500 group-focus-visible:text-slate-500 sm:block"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * KD1 KPI rows. First row: the four headline numbers (StatCard). Second row: smaller tiles for payments
 * and emails that need a look, each linking to the filtered list.
 */
export function KpiRow({ stats, loading = false, className }) {
  const headingId = useId();
  const secondaryHeadingId = useId();

  const revenue = stats?.revenue ?? {};
  const enrollments = stats?.enrollments ?? {};
  const payments = stats?.payments ?? {};
  const certificates = stats?.certificates ?? {};
  const pendingReviews = count(stats?.submissions?.pending);
  const activeEnrollments = count(enrollments.active) + count(enrollments.inProgress);
  const revoked = count(certificates.revoked);

  return (
    <section aria-labelledby={headingId} className={cn('space-y-4', className)}>
      <h2 id={headingId} className="sr-only">
        Key numbers
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={<MoneyValue paise={revenue.total} currency={revenue.currency} />}
          hint={`${formatMoney(revenue.last30Days ?? 0, revenue.currency)} in the last 30 days`}
          icon={IndianRupee}
          tone="brand"
          loading={loading}
          to={adminLinks.payments({ status: PAYMENT_STATUS.SUCCESS })}
        />
        <StatCard
          label="Active enrollments"
          value={formatNumber(activeEnrollments)}
          hint={`${formatNumber(count(enrollments.inProgress))} in progress · ${formatNumber(
            count(enrollments.pendingPayment),
          )} awaiting payment`}
          icon={GraduationCap}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Certificates issued"
          value={formatNumber(count(certificates.issued))}
          hint={revoked > 0 ? `${formatNumber(revoked)} revoked` : 'None revoked'}
          icon={Award}
          tone="success"
          loading={loading}
          to={adminLinks.certificates()}
        />
        <StatCard
          label="Pending reviews"
          value={formatNumber(pendingReviews)}
          hint="Submissions waiting for a trainer"
          icon={ClipboardCheck}
          tone={pendingReviews > 0 ? 'warning' : 'default'}
          loading={loading}
        />
      </div>

      <div>
        <h3 id={secondaryHeadingId} className="mb-3 text-sm font-medium text-slate-500">
          Payments and emails to check
        </h3>
        <ul aria-labelledby={secondaryHeadingId} className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <li>
            <MiniStat
              label="Pending payments"
              value={payments.pending}
              icon={Hourglass}
              tone="warning"
              loading={loading}
              to={adminLinks.payments({ status: PAYMENT_STATUS.PENDING })}
            />
          </li>
          <li>
            <MiniStat
              label="Failed payments"
              value={payments.failed}
              icon={XCircle}
              tone="danger"
              loading={loading}
              to={adminLinks.payments({ status: PAYMENT_STATUS.FAILED })}
            />
          </li>
          <li>
            <MiniStat
              label="Flagged payments"
              value={payments.flagged}
              icon={Flag}
              tone="warning"
              loading={loading}
              to={adminLinks.payments({ flagged: 'true' })}
            />
          </li>
          <li>
            <MiniStat
              label="Certificate emails failed"
              value={certificates.emailFailed}
              icon={Mail}
              tone="danger"
              loading={loading}
              to={adminLinks.certificates({ emailStatus: EMAIL_STATUS.FAILED })}
            />
          </li>
        </ul>
      </div>
    </section>
  );
}

export default KpiRow;
