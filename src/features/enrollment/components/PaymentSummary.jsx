import { Card, CardBody, CardHeader, DescriptionList, StatusBadge } from '@/shared/components/ui';
import { ENROLLMENT_TYPE } from '@/shared/constants';
import { GraduationCap, Receipt } from '@/shared/icons';
import { formatDuration, shortId } from '@/shared/utils/helpers';
import { PriceLines } from './PriceBreakdown';

/**
 * Order summary on /payment/:enrollmentId (SN9): what is being bought (designation, domain,
 * duration, enrollment type), the accepted terms version, who is billed, and the locked price from
 * `enrollment.priceSnapshot`. Display only — the amount charged is always the server's.
 */
export function PaymentSummary({ enrollment, user, className }) {
  const plan = enrollment?.plan ?? {};
  const snapshot = enrollment?.priceSnapshot ?? null;
  const isTeam = enrollment?.enrollmentType === ENROLLMENT_TYPE.TEAM;
  const planMeta = [plan.domain?.name, plan.durationMonths ? formatDuration(plan.durationMonths) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={Receipt}
        title="Order summary"
        description={
          <>
            Enrollment reference{' '}
            <span className="font-mono text-xs text-slate-700">{shortId(enrollment?._id)}</span>
          </>
        }
        action={<StatusBadge status={enrollment?.status} />}
      />
      <CardBody className="space-y-6">
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-slate-200"
            aria-hidden="true"
          >
            <GraduationCap className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">
              {plan.designation?.name ?? 'Internship'}
            </p>
            {planMeta ? <p className="mt-0.5 text-sm text-slate-600">{planMeta}</p> : null}
          </div>
        </div>

        <DescriptionList
          items={[
            {
              label: 'Enrollment type',
              value: <StatusBadge status={enrollment?.enrollmentType} dot={false} />,
            },
            isTeam && { label: 'Team', value: enrollment?.team?.name },
            {
              label: 'Terms accepted',
              value: enrollment?.termsAcceptedVersion ? (
                `Version ${enrollment.termsAcceptedVersion}`
              ) : (
                <span className="font-medium text-amber-700">Not accepted yet</span>
              ),
            },
            {
              label: 'Billed to',
              value: (
                <>
                  <span className="block font-medium">{user?.name ?? '—'}</span>
                  <span className="block break-all text-slate-500">{user?.email}</span>
                </>
              ),
            },
          ]}
        />

        {snapshot ? (
          <section aria-label="Price" className="border-t border-slate-100 pt-5">
            <PriceLines
              basePrice={snapshot.basePrice}
              discountPercent={snapshot.discountPercent}
              payableAmount={snapshot.payableAmount}
              currency={snapshot.currency}
              enrollmentType={enrollment?.enrollmentType}
              payableLabel="Total payable"
            />
          </section>
        ) : null}
      </CardBody>
    </Card>
  );
}

export default PaymentSummary;
