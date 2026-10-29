import { Badge } from '@/shared/components/ui';
import { AlertCircle, Pencil } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { OPTION_LETTERS } from './QuestionCard';

/**
 * Review step (SN6): every question with the chosen answer or an amber "Not answered" chip.
 * Each row is a button that takes the student back to that question.
 */
export function ReviewList({ questions = [], answers = {}, onEdit, className }) {
  return (
    <ol
      className={cn(
        'divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card',
        className,
      )}
    >
      {questions.map((question, index) => {
        const selected = answers[question._id];
        const answered = selected !== undefined;
        return (
          <li key={question._id}>
            <button
              type="button"
              onClick={() => onEdit(index)}
              className="group flex w-full items-start gap-3 px-4 py-4 text-left transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:px-5"
            >
              <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                <span className="sr-only">Question </span>
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium text-slate-900">
                  {question.text}
                </span>
                <span className="mt-1.5 block">
                  {answered ? (
                    <span className="text-sm text-slate-600">
                      <span className="sr-only">Your answer: </span>
                      <span className="font-semibold text-brand-700">
                        {OPTION_LETTERS[selected] ?? selected + 1}.
                      </span>{' '}
                      {question.options?.[selected]}
                    </span>
                  ) : (
                    <Badge variant="warning" icon={AlertCircle}>
                      Not answered
                    </Badge>
                  )}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-sm font-medium text-brand-700 group-hover:text-brand-800">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Edit</span>
                <span className="sr-only sm:hidden">Edit</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default ReviewList;
