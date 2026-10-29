import { cn } from '@/shared/utils/cn';

/**
 * Numbered buttons for every question (SN6): filled = answered, outlined = not answered,
 * ring = the current question. Lets the student jump to any question.
 */
export function QuestionNavigator({ questions = [], answers = {}, current, onSelect, className }) {
  return (
    <nav aria-label="Questions" className={className}>
      <ol className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          const answered = answers[question._id] !== undefined;
          const isCurrent = index === current;
          return (
            <li key={question._id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Question ${index + 1}, ${answered ? 'answered' : 'not answered'}`}
                className={cn(
                  'tabular flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  answered
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
                  isCurrent && 'ring-2 ring-brand-600 ring-offset-2',
                )}
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500" aria-hidden="true">
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand-600" />
          Answered
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-slate-300 bg-white" />
          Not answered
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-white ring-2 ring-brand-600 ring-offset-1" />
          Current
        </li>
      </ul>
    </nav>
  );
}

export default QuestionNavigator;
