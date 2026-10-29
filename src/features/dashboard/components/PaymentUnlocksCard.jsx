import { Card, CardBody, CardHeader } from '@/shared/components/ui';
import { Award, BookOpen, CalendarDays, ClipboardCheck, Unlock } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const UNLOCKS = [
  {
    icon: CalendarDays,
    title: 'Day-by-day schedule',
    description: 'Activities and the evidence to submit for each day.',
  },
  {
    icon: BookOpen,
    title: 'Daily SOPs',
    description: 'Step-by-step guides written for your domain.',
  },
  {
    icon: ClipboardCheck,
    title: 'Tasks and trainer reviews',
    description: 'Submit your work and get feedback from your trainer.',
  },
  {
    icon: Award,
    title: 'Verifiable certificate',
    description: 'Issued once every task is approved.',
  },
];

/** What a student gets once the payment is confirmed (shown beside the locked schedule). */
export function PaymentUnlocksCard({ className }) {
  return (
    <Card padding="none" className={cn('flex flex-col', className)}>
      <CardHeader title="What payment unlocks" icon={Unlock} />
      <CardBody>
        <ul className="space-y-4">
          {UNLOCKS.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex items-start gap-3">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

export default PaymentUnlocksCard;
