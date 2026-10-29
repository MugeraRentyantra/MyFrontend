import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  PageLoader,
  Skeleton,
  SkeletonCard,
  StatusBanner,
} from '@/shared/components/ui';
import { useDocumentTitle } from '@/shared/hooks';
import { ROUTES, paths } from '@/shared/constants';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  RefreshCw,
  Send,
} from '@/shared/icons';
import {
  getErrorMessage,
  getErrorStatus,
  isErrorCode,
  isNetworkError,
} from '@/shared/utils/errors';
import { pluralize } from '@/shared/utils/helpers';
import { useDesignation } from '@/features/internships/hooks/useDesignation';
import { AlreadyAttempted } from '../components/AlreadyAttempted';
import { AssessmentIntro } from '../components/AssessmentIntro';
import { AssessmentProgress } from '../components/AssessmentProgress';
import { QuestionCard } from '../components/QuestionCard';
import { QuestionNavigator } from '../components/QuestionNavigator';
import { ReviewList } from '../components/ReviewList';
import { useAssessment } from '../hooks/useAssessment';
import { useMyAttempt } from '../hooks/useMyAttempt';
import { useSubmitAssessment } from '../hooks/useSubmitAssessment';

const PHASE = Object.freeze({ INTRO: 'intro', QUESTIONS: 'questions', REVIEW: 'review' });

function AssessmentSkeleton({ label = 'Loading assessment…' }) {
  return (
    <div role="status" className="space-y-6">
      <span className="sr-only">{label}</span>
      <div className="space-y-2" aria-hidden="true">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <SkeletonCard lines={6} />
    </div>
  );
}

function NotAvailable({ title }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Skill assessment" title={title} />
      <EmptyState
        icon={ClipboardList}
        titleAs="h2"
        title="This assessment isn't available yet"
        description="The questions for this internship haven't been published. Please check back soon."
        action={
          <Button as={Link} to={ROUTES.CATALOG}>
            Browse internships
          </Button>
        }
      />
    </div>
  );
}

/**
 * Student assessment (SN6): intro -> one question per step -> review -> submit once.
 * Answers live only in React state. Leaving with unsent answers asks for confirmation
 * (router blocker + beforeunload). The server scores the attempt; no pass/fail anywhere.
 */
export function AssessmentPage() {
  const { designationId } = useParams();
  const navigate = useNavigate();

  const attemptQuery = useMyAttempt(designationId);
  const designationQuery = useDesignation(designationId);

  const [phase, setPhase] = useState(PHASE.INTRO);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const guardRef = useRef(false);
  const focusPendingRef = useRef(false);
  const questionHeadingRef = useRef(null);
  const reviewHeadingRef = useRef(null);

  const existingAttempt = attemptQuery.data ?? null;
  const canLoadQuestions = attemptQuery.isSuccess && !existingAttempt && !alreadySubmitted;
  const assessmentQuery = useAssessment(designationId, { enabled: canLoadQuestions });
  const submitMutation = useSubmitAssessment(designationId);

  const assessment = assessmentQuery.data;
  const questions = useMemo(
    () => (Array.isArray(assessment?.questions) ? assessment.questions : []),
    [assessment],
  );
  const total = questions.length;
  const designationName = assessment?.designation?.name ?? designationQuery.data?.name ?? '';
  const pageTitle = designationName ? `${designationName} assessment` : 'Skill assessment';

  const answeredCount = useMemo(
    () => questions.reduce((count, question) => (answers[question._id] !== undefined ? count + 1 : count), 0),
    [questions, answers],
  );
  const unansweredCount = Math.max(0, total - answeredCount);
  const isDirty =
    phase !== PHASE.INTRO &&
    !isSubmitted &&
    !alreadySubmitted &&
    !existingAttempt &&
    answeredCount > 0;

  useDocumentTitle(designationName ? `${designationName} assessment` : 'Assessment');

  // ---- Navigation guard -------------------------------------------------------------------
  useEffect(() => {
    guardRef.current = isDirty;
  }, [isDirty]);

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }) =>
      guardRef.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  );
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (!isDirty) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Legacy browsers need returnValue set to show the native prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ---- 409 on the question set: the attempt exists after all ------------------------------
  const questionsConflict = isErrorCode(assessmentQuery.error, 'ALREADY_ATTEMPTED');
  const { refetch: refetchAttempt } = attemptQuery;
  useEffect(() => {
    if (!questionsConflict) return;
    setAlreadySubmitted(true);
    refetchAttempt();
  }, [questionsConflict, refetchAttempt]);

  // ---- Focus management: move focus to the new step's heading -----------------------------
  useEffect(() => {
    if (!focusPendingRef.current) return;
    focusPendingRef.current = false;
    const target = phase === PHASE.REVIEW ? reviewHeadingRef.current : questionHeadingRef.current;
    target?.focus();
  }, [phase, currentIndex]);

  const startAssessment = () => {
    focusPendingRef.current = true;
    setCurrentIndex(0);
    setPhase(PHASE.QUESTIONS);
  };

  const goToQuestion = (index) => {
    const nextIndex = Math.min(Math.max(index, 0), Math.max(total - 1, 0));
    if (phase === PHASE.QUESTIONS && nextIndex === currentIndex) {
      questionHeadingRef.current?.focus();
      return;
    }
    focusPendingRef.current = true;
    setCurrentIndex(nextIndex);
    setPhase(PHASE.QUESTIONS);
  };

  const openReview = () => {
    focusPendingRef.current = true;
    setPhase(PHASE.REVIEW);
  };

  const selectAnswer = useCallback((questionId, optionIndex) => {
    setAnswers((previous) =>
      previous[questionId] === optionIndex ? previous : { ...previous, [questionId]: optionIndex },
    );
  }, []);

  const submitAnswers = async () => {
    if (submitMutation.isPending) return;
    setSubmitError(null);
    const payload = questions
      .filter((question) => answers[question._id] !== undefined)
      .map((question) => ({ questionId: question._id, selectedIndex: answers[question._id] }));

    try {
      const attempt = await submitMutation.mutateAsync(payload);
      guardRef.current = false;
      setIsSubmitted(true);
      setConfirmOpen(false);
      navigate(paths.assessmentResult(designationId), { replace: true, state: { attempt } });
    } catch (error) {
      setConfirmOpen(false);
      if (isErrorCode(error, 'ALREADY_ATTEMPTED')) {
        guardRef.current = false;
        setAlreadySubmitted(true);
        refetchAttempt();
        return;
      }
      setSubmitError(error);
    }
  };

  // ---- Render -------------------------------------------------------------------------------
  if (isSubmitted) return <PageLoader label="Opening your result…" />;

  if (attemptQuery.isLoading) return <AssessmentSkeleton />;

  if (attemptQuery.isError) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Skill assessment" title={pageTitle} />
        <ErrorState
          error={attemptQuery.error}
          title="We couldn't load your assessment"
          onRetry={attemptQuery.refetch}
        />
      </div>
    );
  }

  if (existingAttempt || alreadySubmitted) {
    if (!existingAttempt && attemptQuery.isFetching) {
      return <AssessmentSkeleton label="Checking your attempt…" />;
    }
    return (
      <AlreadyAttempted
        attempt={existingAttempt}
        designationId={designationId}
        designationName={designationName}
      />
    );
  }

  if (assessmentQuery.isError) {
    if (questionsConflict) return <AssessmentSkeleton label="Checking your attempt…" />;
    if (getErrorStatus(assessmentQuery.error) === 404) return <NotAvailable title={pageTitle} />;
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Skill assessment" title={pageTitle} />
        <ErrorState
          error={assessmentQuery.error}
          title="We couldn't load the questions"
          onRetry={assessmentQuery.refetch}
        />
      </div>
    );
  }

  if (assessmentQuery.isPending) return <AssessmentSkeleton />;

  if (total === 0) return <NotAvailable title={pageTitle} />;

  const safeIndex = Math.min(currentIndex, total - 1);
  const currentQuestion = questions[safeIndex];
  const isLastQuestion = safeIndex >= total - 1;

  let content;
  if (phase === PHASE.INTRO) {
    content = (
      <AssessmentIntro
        designation={assessment?.designation}
        totalQuestions={total}
        onStart={startAssessment}
      />
    );
  } else if (phase === PHASE.QUESTIONS) {
    content = (
      <div className="space-y-6">
        <PageHeader eyebrow="Skill assessment" title={pageTitle} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <div className="min-w-0 space-y-4">
            <AssessmentProgress current={safeIndex} total={total} answeredCount={answeredCount} />
            <QuestionCard
              ref={questionHeadingRef}
              question={currentQuestion}
              index={safeIndex}
              total={total}
              selectedIndex={answers[currentQuestion._id]}
              onSelect={(optionIndex) => selectAnswer(currentQuestion._id, optionIndex)}
            />
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                leftIcon={ArrowLeft}
                onClick={() => goToQuestion(safeIndex - 1)}
                disabled={safeIndex === 0}
              >
                Back
              </Button>
              {isLastQuestion ? (
                <Button rightIcon={ClipboardCheck} onClick={openReview}>
                  Review answers
                </Button>
              ) : (
                <Button rightIcon={ArrowRight} onClick={() => goToQuestion(safeIndex + 1)}>
                  Next
                </Button>
              )}
            </div>
          </div>

          <aside aria-label="Question overview" className="lg:sticky lg:top-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-sm font-semibold text-slate-900">All questions</h2>
              <p className="mt-1 text-xs text-slate-500">
                Jump to any question. You can change answers until you submit.
              </p>
              <QuestionNavigator
                className="mt-4"
                questions={questions}
                answers={answers}
                current={safeIndex}
                onSelect={goToQuestion}
              />
              <Button
                className="mt-5"
                variant="secondary"
                fullWidth
                leftIcon={ClipboardCheck}
                onClick={openReview}
              >
                Review answers
              </Button>
            </div>
          </aside>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="space-y-6">
        <PageHeader eyebrow="Skill assessment" title={pageTitle} />

        <section aria-labelledby="review-heading" className="space-y-4">
          <div>
            <h2
              id="review-heading"
              ref={reviewHeadingRef}
              tabIndex={-1}
              className="text-lg font-semibold text-slate-900 focus:outline-none focus-visible:outline-none"
            >
              Review your answers
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {answeredCount} of {total} answered. Select a question to change your answer.
            </p>
          </div>

          {submitError ? (
            <StatusBanner
              variant="error"
              title="We couldn't submit your answers"
              action={
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={RefreshCw}
                  loading={submitMutation.isPending}
                  onClick={submitAnswers}
                >
                  Retry submit
                </Button>
              }
            >
              {isNetworkError(submitError)
                ? "We couldn't reach the server. Check your connection and try again — your answers are still here."
                : `${getErrorMessage(submitError)} Your answers are still here.`}
            </StatusBanner>
          ) : null}

          {unansweredCount > 0 ? (
            <StatusBanner
              variant="warning"
              title={`${pluralize(unansweredCount, 'question')} not answered`}
            >
              Unanswered questions count as wrong. You can still answer them before you submit.
            </StatusBanner>
          ) : (
            <StatusBanner variant="info" title="All questions answered">
              Check your answers, then submit when you&apos;re ready.
            </StatusBanner>
          )}

          <ReviewList questions={questions} answers={answers} onEdit={goToQuestion} />
        </section>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" leftIcon={ArrowLeft} onClick={() => goToQuestion(safeIndex)}>
              Back to questions
            </Button>
            <Button
              leftIcon={Send}
              loading={submitMutation.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Submit assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!submitMutation.isPending) setConfirmOpen(false);
        }}
        onConfirm={submitAnswers}
        title="Submit your assessment?"
        message="You can submit only once. After that, your score is final for this internship."
        confirmLabel="Submit assessment"
        cancelLabel="Keep reviewing"
        loading={submitMutation.isPending}
      >
        {unansweredCount > 0 ? (
          <p className="text-sm font-medium text-amber-800">
            You have {pluralize(unansweredCount, 'unanswered question')} — they will count as wrong.
          </p>
        ) : (
          <p className="text-sm text-slate-600">You&apos;ve answered all {total} questions.</p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title="Leave the assessment?"
        message="Your answers will be lost. Nothing is saved until you submit."
        confirmLabel="Leave assessment"
        cancelLabel="Stay"
        variant="danger"
      />
    </>
  );
}

export default AssessmentPage;
