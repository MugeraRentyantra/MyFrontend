import { Link } from 'react-router-dom';
import { Card, CardHeader, EmptyState } from '@/shared/components/ui';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Flag,
  Hourglass,
  Mail,
  UserX,
} from '@/shared/icons';
import {
  EMAIL_STATUS,
  ENROLLMENT_STATUS,
  PAYMENT_STATUS,
  ROUTES,
  USER_STATUS,
} from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { pluralize } from '@/shared/utils/helpers';
import { adminLinks } from '../utils/format';

const TONES = {
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-rose-50 text-rose-600',
  neutral: 'bg-slate-100 text-slate-600',
};

const count = (value) => Math.max(0, Number(value) || 0);

/** The operational to-do list, most urgent first. Only items with something to do are returned. */
function buildAttentionItems(stats) {
  if (!stats) return [];
  const items = [
    {
      key: 'flagged',
      count: count(stats.payments?.flagged),
      title: (n) => `${pluralize(n, 'flagged payment')} to verify`,
      description: 'Check them against the gateway before you act on them.',
      to: adminLinks.payments({ flagged: 'true' }),
      icon: Flag,
      tone: 'warning',
    },
    {
      key: 'emails',
      count: count(stats.certificates?.emailFailed),
      title: (n) => `${pluralize(n, 'certificate email')} failed`,
      description: 'Resend them from the certificates page.',
      to: adminLinks.certificates({ emailStatus: EMAIL_STATUS.FAILED }),
      icon: Mail,
      tone: 'danger',
    },
    {
      key: 'pending-payments',
      count: count(stats.payments?.pending),
      title: (n) => `${pluralize(n, 'payment')} still pending`,
      description: 'The gateway has not confirmed them yet.',
      to: adminLinks.payments({ status: PAYMENT_STATUS.PENDING }),
      icon: Hourglass,
      tone: 'warning',
    },
    {
      key: 'reviews',
      count: count(stats.submissions?.pending),
      title: (n) => `${pluralize(n, 'submission')} waiting for review`,
      description: 'Make sure every active student and team has a trainer.',
      to: ROUTES.ADMIN_ASSIGNMENTS,
      icon: ClipboardCheck,
      tone: 'neutral',
    },
    {
      key: 'unpaid',
      count: count(stats.enrollments?.pendingPayment),
      title: (n) => `${pluralize(n, 'enrollment')} awaiting payment`,
      description: 'Students who enrolled but have not paid yet.',
      to: adminLinks.enrollments({ status: ENROLLMENT_STATUS.PENDING_PAYMENT }),
      icon: Clock,
      tone: 'neutral',
    },
    {
      key: 'suspended',
      count: count(stats.users?.suspended),
      title: (n) => `${pluralize(n, 'suspended account')}`,
      description: 'They cannot log in until an admin reactivates them.',
      to: adminLinks.users({ status: USER_STATUS.SUSPENDED }),
      icon: UserX,
      tone: 'neutral',
    },
  ];
  return items.filter((item) => item.count > 0);
}

/** KD1 "Needs attention": a short, linked to-do list built from /admin/stats. */
export function AttentionList({ stats, loading = false, className }) {
  const items = buildAttentionItems(stats);

  let body;
  if (loading) {
    body = (
      <div role="status" className="space-y-4 px-5 pb-5 pt-4">
        <span className="sr-only">Loading</span>
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3" aria-hidden="true">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (items.length === 0) {
    body = (
      <div className="px-5 pb-5 pt-2">
        <EmptyState
          compact
          variant="muted"
          icon={CheckCircle2}
          title="All clear"
          description="Nothing needs your attention right now."
        />
      </div>
    );
  } else {
    body = (
      <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                to={item.to}
                className="group flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
              >
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    TONES[item.tone] ?? TONES.neutral,
                  )}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-900">{item.title(item.count)}</span>
                  <span className="block text-sm text-slate-500">{item.description}</span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition-colors duration-150 group-hover:text-slate-600"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <CardHeader
        title="Needs attention"
        description={
          loading || items.length === 0
            ? 'Open items across payments, certificates and people.'
            : `${pluralize(items.length, 'thing')} to look at, most urgent first.`
        }
      />
      {body}
    </Card>
  );
}

export default AttentionList;
