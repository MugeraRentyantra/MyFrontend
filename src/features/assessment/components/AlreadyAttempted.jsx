import { Link } from 'react-router-dom';
import { Button, PageHeader, StatusBanner } from '@/shared/components/ui';
import { paths } from '@/shared/constants';
import { ArrowRight, ClipboardCheck } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { ScoreCard } from './ScoreCard';

/**
 * Shown instead of the questions when the student already has an attempt (SN6, 409
 * ALREADY_ATTEMPTED). Renders the page's <h1>, the earlier score and the next steps.
 */
export function AlreadyAttempted({ attempt, designationId, designationName, className }) {
  return (
    <div className={cn('space-y-6', className)}>
      <PageHeader
        eyebrow={designationName ? `${designationName} assessment` : 'Skill assessment'}
        title="You've already taken this assessment"
        description="Each assessment can be taken once. Your score is saved and decides your individual discount when you enroll."
      />

      {attempt ? (
        <ScoreCard
          score={attempt.score}
          totalQuestions={attempt.totalQuestions}
          discountPercent={attempt.discountPercent}
          submittedAt={attempt.submittedAt}
        />
      ) : (
        <StatusBanner variant="info" title="Your answers were submitted">
          Open your result to see your score and discount.
        </StatusBanner>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          as={Link}
          to={paths.assessmentResult(designationId)}
          variant="outline"
          leftIcon={ClipboardCheck}
        >
          View result
        </Button>
        <Button as={Link} to={paths.enroll({ designationId })} rightIcon={ArrowRight}>
          Choose your plan
        </Button>
      </div>
    </div>
  );
}

export default AlreadyAttempted;
