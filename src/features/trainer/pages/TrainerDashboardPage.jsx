import { Link } from 'react-router-dom';
import { Button, PageHeader } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { BarChart3 } from '@/shared/icons';
import { AssignmentList } from '../components/AssignmentList';
import { SubmissionQueue } from '../components/SubmissionQueue';
import { TrainerStatCards } from '../components/TrainerStatCards';

/** /trainer (KD9): KPI tiles, the oldest-first review queue and the trainer's assignments. */
export function TrainerDashboardPage() {
  useDocumentTitle('Review queue');
  const { user } = useAuth();
  const firstName = String(user?.name ?? '').trim().split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={firstName ? `Welcome back, ${firstName}` : undefined}
        title="Review queue"
        description="Review submitted work oldest first so nobody waits too long for feedback."
        actions={
          <Button as={Link} to={ROUTES.TRAINER_REPORTS} variant="outline" leftIcon={BarChart3}>
            View reports
          </Button>
        }
      />

      <TrainerStatCards />

      <section aria-labelledby="review-queue-heading" className="space-y-3">
        <div>
          <h2 id="review-queue-heading" className="text-base font-semibold text-slate-900">
            Waiting for review
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Oldest first. Select a submission to open it.
          </p>
        </div>
        <SubmissionQueue />
      </section>

      <AssignmentList />
    </div>
  );
}

export default TrainerDashboardPage;
