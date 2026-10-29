import { ProgressBar } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';

/** "Question 3 of 15" plus a meter of how many questions are answered. */
export function AssessmentProgress({ current, total, answeredCount, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <p className="font-medium text-slate-900">
          Question {current + 1} of {total}
        </p>
        <p className="text-slate-500">
          {answeredCount} of {total} answered
        </p>
      </div>
      <ProgressBar
        value={answeredCount}
        max={total}
        size="sm"
        aria-label="Questions answered"
        aria-valuetext={`${answeredCount} of ${total} answered`}
      />
    </div>
  );
}

export default AssessmentProgress;
