import { Link } from 'react-router-dom';
import { Button, PageHeader } from '@/shared/components/ui';
import { ASSESSMENT_OPTION_COUNT, ASSESSMENT_QUESTION_COUNT, paths } from '@/shared/constants';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Fingerprint,
  ListChecks,
  Percent,
  RefreshCw,
} from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

function buildRules(totalQuestions) {
  return [
    {
      icon: ListChecks,
      title: `${totalQuestions} multiple-choice questions`,
      text: `Each question has ${ASSESSMENT_OPTION_COUNT} options. Pick the one you think is right.`,
    },
    {
      icon: Percent,
      title: 'No pass or fail',
      text: 'Your score only decides your individual discount. Every score can continue to enrollment.',
    },
    {
      icon: Fingerprint,
      title: 'One attempt only',
      text: 'You can submit once. Your score is final for this internship.',
    },
    {
      icon: AlertCircle,
      title: 'Unanswered counts as wrong',
      text: 'Skip and come back any time — you review every answer before you submit.',
    },
    {
      icon: Clock,
      title: 'No timer',
      text: 'Take the time you need. There is no time limit.',
    },
    {
      icon: RefreshCw,
      title: "Don't refresh the page",
      text: 'Your answers are kept on this page until you submit. Refreshing or leaving loses them.',
    },
  ];
}

/** Start screen of the assessment (SN6). Renders the page's <h1>. */
export function AssessmentIntro({
  designation,
  totalQuestions = ASSESSMENT_QUESTION_COUNT,
  onStart,
  className,
}) {
  const name = designation?.name;
  const rules = buildRules(totalQuestions);

  return (
    <div className={cn('space-y-6', className)}>
      <PageHeader
        eyebrow="Skill assessment"
        title={name ? `${name} assessment` : 'Skill assessment'}
        description="Show what you know. A higher score unlocks a bigger discount on individual plans."
      />

      <section
        aria-labelledby="assessment-rules-heading"
        className="rounded-xl border border-slate-200 bg-white shadow-card"
      >
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <h2 id="assessment-rules-heading" className="text-base font-semibold text-slate-900">
            Before you start
          </h2>
        </div>
        <ul className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
          {rules.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
                aria-hidden="true"
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col-reverse gap-3 rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {designation?.slug ? (
            <Button
              as={Link}
              to={paths.designation(designation.slug)}
              variant="ghost"
              leftIcon={ArrowLeft}
            >
              Back to internship
            </Button>
          ) : (
            <span className="hidden sm:block" />
          )}
          <Button size="lg" rightIcon={ArrowRight} onClick={onStart}>
            Start assessment
          </Button>
        </div>
      </section>
    </div>
  );
}

export default AssessmentIntro;
