import { PageHeader } from '@/shared/components/ui';
import { formatDate, toISODate } from '@/shared/utils/helpers';
import { getFirstName, getGreeting } from '../utils/dashboardHelpers';

/**
 * Dashboard page title (the page's single <h1>): a time-of-day greeting with the student's first
 * name and today's date. `actions` sit on the right (e.g. the enrollment switcher).
 */
export function WelcomeHeader({ name, description, actions, className }) {
  const now = new Date();
  const today = formatDate(now, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <PageHeader
      className={className}
      eyebrow={<time dateTime={toISODate(now)}>{today}</time>}
      title={`${getGreeting(now)}, ${getFirstName(name)}`}
      description={description}
      actions={actions}
    />
  );
}

export default WelcomeHeader;
