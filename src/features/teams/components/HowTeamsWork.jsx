import { Card, CardBody, CardHeader } from '@/shared/components/ui';
import { Lightbulb } from '@/shared/icons';
import { INVITE_EXPIRY_DAYS, TEAM_MAX_MEMBERS } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const STEPS = [
  {
    title: 'Create the team',
    text: `Pick the plan and invite up to ${TEAM_MAX_MEMBERS - 1} classmates. Invites expire after ${INVITE_EXPIRY_DAYS} days.`,
  },
  {
    title: 'Everyone gets ready',
    text: 'Each member accepts, takes the assessment and pays the full plan price for their seat.',
  },
  {
    title: 'Build together',
    text: 'When everyone is ready the team starts: one shared schedule, task board and GitHub repository.',
  },
];

/** Side panel on the create-team page explaining the team flow. */
export function HowTeamsWork({ className }) {
  return (
    <Card padding="none" className={cn('bg-white', className)}>
      <CardHeader icon={Lightbulb} title="How teams work" />
      <CardBody>
        <ol className="space-y-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{step.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export default HowTeamsWork;
