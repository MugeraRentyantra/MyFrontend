import { Badge } from '@/shared/components/ui';
import { ASSESSMENT_QUESTION_COUNT } from '@/shared/constants';
import { Percent, Users } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatDateTime } from '@/shared/utils/helpers';

const RADIUS = 52;
const STROKE_WIDTH = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Circular meter in the brand ramp. The visible numbers are repeated in the accessible name. */
function ScoreRing({ score, total }) {
  const ratio = total > 0 ? Math.min(Math.max(score / total, 0), 1) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div
      role="img"
      aria-label={`Score: ${score} out of ${total}`}
      className="relative h-36 w-36 shrink-0"
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          className="stroke-brand-100"
        />
        {ratio > 0 ? (
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-brand-600 transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        ) : null}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <span className="text-4xl font-semibold tracking-tight text-slate-900">
          {score}
          <span className="text-xl font-medium text-slate-400"> / {total}</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Assessment score card (SN6/SN7) — shared with the result page.
 * Shows the server's score and discount only: never pass/fail wording, never client math on price.
 */
export function ScoreCard({
  score,
  totalQuestions = ASSESSMENT_QUESTION_COUNT,
  discountPercent,
  isTeam = false,
  submittedAt,
  className,
}) {
  const numericScore = Number(score);
  const safeScore = Number.isFinite(numericScore) ? numericScore : 0;
  const total = Number(totalQuestions) > 0 ? Number(totalQuestions) : ASSESSMENT_QUESTION_COUNT;
  const numericDiscount = Number(discountPercent);
  const discount = Number.isFinite(numericDiscount) ? numericDiscount : 0;

  let discountContent;
  if (isTeam) {
    discountContent = (
      <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <p>Team enrollments pay the full plan price — no discount applies.</p>
      </div>
    );
  } else if (discount > 0) {
    discountContent = (
      <Badge variant="brand" size="md" icon={Percent}>
        {discount}% individual discount
      </Badge>
    );
  } else {
    discountContent = (
      <div className="space-y-2">
        <Badge variant="neutral" size="md">
          No individual discount at this score
        </Badge>
        <p className="text-sm text-slate-500">You can still enroll in any plan at its listed price.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-6 shadow-card',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
        <ScoreRing score={safeScore} total={total} />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Your score</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {safeScore} of {total} answers correct
          </p>
          <p className="mt-1 text-sm text-slate-600">Your score decides your individual discount.</p>
          <div className="mt-4 flex justify-center sm:justify-start">{discountContent}</div>
          {submittedAt ? (
            <p className="mt-4 text-xs text-slate-500">Submitted {formatDateTime(submittedAt)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default ScoreCard;
