/**
 * Student assessment feature (SN6). The page is lazy-loaded from src/routes/lazyPages.js;
 * ScoreCard and the attempt hooks are shared with the result page (SN7) and the dashboard.
 */
export { ScoreCard } from './components/ScoreCard';
export { AlreadyAttempted } from './components/AlreadyAttempted';
export { AssessmentIntro } from './components/AssessmentIntro';
export { AssessmentProgress } from './components/AssessmentProgress';
export { QuestionCard, OPTION_LETTERS } from './components/QuestionCard';
export { QuestionNavigator } from './components/QuestionNavigator';
export { ReviewList } from './components/ReviewList';

export { useAssessment } from './hooks/useAssessment';
export { useMyAttempt } from './hooks/useMyAttempt';
export { useSubmitAssessment } from './hooks/useSubmitAssessment';
