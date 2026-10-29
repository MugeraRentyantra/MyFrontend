import { Badge, Card, CardBody, CardHeader, StatusBadge } from '@/shared/components/ui';
import { CHECK_STATUS } from '@/shared/constants';
import { CheckCircle2, Clock, XCircle } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const STATUS_ICON = {
  [CHECK_STATUS.PASSED]: { icon: CheckCircle2, className: 'text-emerald-600' },
  [CHECK_STATUS.FAILED]: { icon: XCircle, className: 'text-rose-600' },
  [CHECK_STATUS.PENDING]: { icon: Clock, className: 'text-slate-400' },
};

/**
 * KD10: automated checks run on the submission. Each row has a status icon AND a text status;
 * required checks are labelled. A failed required check blocks approval (see DecisionForm).
 */
export function AutomatedChecks({ checks }) {
  const list = Array.isArray(checks) ? checks.filter(Boolean) : [];
  const passed = list.filter((check) => check.status === CHECK_STATUS.PASSED).length;
  const failedRequired = list.filter(
    (check) => check.required && check.status === CHECK_STATUS.FAILED,
  ).length;

  let summary = 'No automated checks ran for this submission.';
  if (list.length) {
    summary = `${passed} of ${list.length} passed`;
    if (failedRequired) {
      summary += ` · ${failedRequired} required ${failedRequired === 1 ? 'check' : 'checks'} failed`;
    }
  }

  return (
    <Card as="section" padding="none" aria-label="Automated checks">
      <CardHeader title="Automated checks" description={summary} />
      {list.length ? (
        <CardBody>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {list.map((check, index) => {
              const meta = STATUS_ICON[check.status] ?? STATUS_ICON[CHECK_STATUS.PENDING];
              const Icon = meta.icon;
              return (
                <li
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${check.name}-${index}`}
                  className={cn(
                    'flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5',
                    check.required && check.status === CHECK_STATUS.FAILED && 'bg-rose-50/50',
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', meta.className)} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm text-slate-800">{check.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    {check.required ? <Badge variant="neutral">Required</Badge> : null}
                    <StatusBadge status={check.status} dot={false} />
                  </span>
                </li>
              );
            })}
          </ul>
        </CardBody>
      ) : null}
    </Card>
  );
}

export default AutomatedChecks;
