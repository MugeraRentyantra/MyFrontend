/**
 * Tasks feature (GP5, GP6, GP8, GP9): task board, task page, submission form and history.
 * Pages are lazy-loaded from routes/lazyPages.js; this barrel is the public API for other features.
 */
export { TaskCard } from './components/TaskCard';
export { TaskActions } from './components/TaskActions';
export { TaskSummary } from './components/TaskSummary';
export { TaskBoard, TaskList } from './components/TaskBoard';
export { TaskMeta } from './components/TaskMeta';
export { PrerequisiteList } from './components/PrerequisiteList';
export { DecisionChip } from './components/DecisionChip';
export { FeedbackBox } from './components/FeedbackBox';
export { AttemptCard } from './components/AttemptCard';
export { ScreenshotLightbox } from './components/ScreenshotLightbox';

export { useTasks } from './hooks/useTasks';
export { useTaskContent } from './hooks/useTaskContent';
export { useStartTask } from './hooks/useStartTask';
export { useSubmitTask } from './hooks/useSubmitTask';
export { useSubmissions } from './hooks/useSubmissions';

export {
  TASK_TABS,
  BOARD_COLUMNS,
  STATUS_FILTERS,
  canSubmitStatus,
  countByStatus,
  getMissingPrerequisites,
  getTaskActions,
  pickNextTask,
  sortBySequence,
  taskLabel,
} from './utils/taskActions';

export {
  submissionSchema,
  validateScreenshotFile,
  getSubmissionChecklist,
} from './schemas/submissionValidation';
