import { Badge, DynamicRowEditor, Input, Textarea } from '@/shared/components/ui';
import { AlertCircle, CheckCircle2, ListOrdered } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import {
  createEmptyQuestion,
  OPTION_LETTERS,
  OPTION_TEXT_MAX,
  QUESTION_COUNT,
  QUESTION_TEXT_MAX,
} from '../utils/validation';

const getQuestionKey = (row) => row.key;

function QuestionStatus({ issues }) {
  if (!issues) return null;
  if (issues.isComplete) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        Complete
      </p>
    );
  }
  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-800">
      <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Needs {issues.summary.join(', ')}.</span>
    </p>
  );
}

function QuestionFields({ question, number, helpers, issues, disabled }) {
  // Named after the row's stable key (not its position) so moving rows never merges two radio groups.
  const groupName = `correct-answer-${question.key}`;

  const setOption = (optionIndex, value) =>
    helpers.update((row) => ({
      options: row.options.map((option, index) => (index === optionIndex ? value : option)),
    }));

  return (
    <div className="space-y-4">
      <Textarea
        label="Question text"
        required
        rows={2}
        value={question.text}
        onChange={(event) => helpers.update({ text: event.target.value })}
        placeholder="e.g. Which keyword stops a Java class from being extended?"
        disabled={disabled}
        error={
          issues?.textTooLong ? `Keep the question to ${QUESTION_TEXT_MAX} characters or fewer.` : undefined
        }
      />

      <fieldset className="min-w-0">
        <legend className="text-sm font-medium text-slate-700">Answer options</legend>
        <p className="mt-0.5 text-xs text-slate-500">Select the one correct answer.</p>
        <div className="mt-3 space-y-2">
          {OPTION_LETTERS.map((letter, optionIndex) => {
            const isCorrect = question.correctIndex === optionIndex;
            const radioId = `${helpers.id}-correct-${optionIndex}`;
            let optionError;
            if (issues?.duplicateOptions.includes(optionIndex)) optionError = 'Same text as another option.';
            else if (issues?.longOptions.includes(optionIndex)) {
              optionError = `Keep options to ${OPTION_TEXT_MAX} characters or fewer.`;
            }
            return (
              <div
                key={letter}
                className={cn(
                  'flex items-start gap-2 rounded-lg border py-1.5 pl-3 pr-1.5 transition-colors duration-150 sm:gap-3',
                  isCorrect ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200 bg-white',
                )}
              >
                <label
                  htmlFor={radioId}
                  className={cn('flex h-10 shrink-0 items-center gap-2', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
                >
                  <input
                    id={radioId}
                    type="radio"
                    name={groupName}
                    value={optionIndex}
                    checked={isCorrect}
                    onChange={() => helpers.update({ correctIndex: optionIndex })}
                    disabled={disabled}
                    className="h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                  />
                  <span
                    aria-hidden="true"
                    className={cn('w-4 text-sm font-semibold', isCorrect ? 'text-emerald-700' : 'text-slate-500')}
                  >
                    {letter}
                  </span>
                  <span className="sr-only">
                    Mark option {letter} as the correct answer for question {number}
                  </span>
                </label>
                <Input
                  aria-label={`Question ${number}, option ${letter}`}
                  value={question.options[optionIndex] ?? ''}
                  onChange={(event) => setOption(optionIndex, event.target.value)}
                  placeholder={`Option ${letter}`}
                  disabled={disabled}
                  error={optionError}
                  className="min-w-0 flex-1"
                />
                {isCorrect ? (
                  <span className="hidden h-10 shrink-0 items-center gap-1 pr-1.5 text-xs font-medium text-emerald-700 sm:inline-flex">
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Correct answer
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </fieldset>

      <QuestionStatus issues={issues} />
    </div>
  );
}

/**
 * QuestionEditor (KD5): up to 15 multiple-choice questions on DynamicRowEditor. Each question has
 * text, four options and exactly one correct answer (a radio group, so only one can be chosen).
 * `issues[index]` (from validateDraft().questionIssues) drives the per-question status line.
 */
export function QuestionEditor({ questions, onChange, issues = [], disabled = false }) {
  const count = questions.length;
  const isFull = count === QUESTION_COUNT;

  return (
    <section id="questions" aria-labelledby="questions-heading" className="scroll-mt-24 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 id="questions-heading" tabIndex={-1} className="text-base font-semibold text-slate-900 focus:outline-none">
            Questions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Students answer all {QUESTION_COUNT} questions in one sitting. Each correct answer scores one
            mark.
          </p>
        </div>
        <Badge
          variant={isFull ? 'success' : 'neutral'}
          size="md"
          icon={isFull ? CheckCircle2 : ListOrdered}
          className="self-start"
        >
          <span className="tabular-nums">
            {count} / {QUESTION_COUNT}
          </span>
          <span className="sr-only"> questions added</span>
        </Badge>
      </div>

      <DynamicRowEditor
        rows={questions}
        onChange={onChange}
        createRow={createEmptyQuestion}
        getRowKey={getQuestionKey}
        itemLabel="Question"
        addLabel="Add question"
        maxRows={QUESTION_COUNT}
        disabled={disabled}
        emptyState={
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">No questions yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Use “Add question” to write the first of {QUESTION_COUNT} questions.
            </p>
          </div>
        }
        renderRow={(row, index, helpers) => (
          <QuestionFields
            question={row}
            number={index + 1}
            helpers={helpers}
            issues={issues[index]}
            disabled={disabled}
          />
        )}
      />
    </section>
  );
}

export default QuestionEditor;
