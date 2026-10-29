import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@/shared/components/ui';
import {
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  IndianRupee,
  UserCog,
} from '@/shared/icons';
import { ROUTES } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const LINKS = [
  {
    label: 'Designations',
    description: 'Roles students can apply for',
    to: ROUTES.ADMIN_DESIGNATIONS,
    icon: Briefcase,
  },
  {
    label: 'Domains',
    description: 'Industries the internships are set in',
    to: ROUTES.ADMIN_DOMAINS,
    icon: Building2,
  },
  {
    label: 'Plans & pricing',
    description: 'Durations and base prices',
    to: ROUTES.ADMIN_PLANS,
    icon: IndianRupee,
  },
  {
    label: 'Assessments',
    description: 'Questions and discount slabs',
    to: ROUTES.ADMIN_ASSESSMENTS,
    icon: ClipboardCheck,
  },
  {
    label: 'Schedules',
    description: 'Day-by-day plans, SOPs and tasks',
    to: ROUTES.ADMIN_SCHEDULES,
    icon: CalendarDays,
  },
  {
    label: 'Trainer assignments',
    description: 'Who reviews whose work',
    to: ROUTES.ADMIN_ASSIGNMENTS,
    icon: UserCog,
  },
];

/** KD1 shortcuts to the configuration screens. */
export function QuickLinks({ className }) {
  return (
    <Card padding="none" className={className}>
      <CardHeader title="Configuration" description="Set up what students see and how they are reviewed." />
      <CardBody>
        <ul className="grid gap-3 sm:grid-cols-2">
          {LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={cn(
                    'flex h-full items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors duration-150',
                    'hover:border-slate-300 hover:bg-slate-50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  )}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900">{link.label}</span>
                    <span className="block text-xs text-slate-500">{link.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

export default QuickLinks;
