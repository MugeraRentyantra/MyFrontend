/**
 * Admin schedule builder (KD6 schedule templates, KD7 task definitions). Route pages live in
 * ./pages and are lazy-loaded by src/routes/lazyPages.js.
 */

// Components
export { CreateScheduleDialog } from './components/CreateScheduleDialog';
export { DayEditor } from './components/DayEditor';
export { MarkdownEditor } from './components/MarkdownEditor';
export { PrerequisitePicker } from './components/PrerequisitePicker';
export { ReadOnlyNotice } from './components/ReadOnlyNotice';
export { ScheduleFilters } from './components/ScheduleFilters';
export { ScheduleHeader } from './components/ScheduleHeader';
export { ScheduleTabs } from './components/ScheduleTabs';
export { TaskDetails } from './components/TaskDetails';
export { TaskForm } from './components/TaskForm';
export { TaskFormDrawer } from './components/TaskFormDrawer';
export { TaskList } from './components/TaskList';
export { UnsavedChangesDialog } from './components/UnsavedChangesDialog';
export { VersionList } from './components/VersionList';

// Hooks
export {
  useCloneSchedule,
  useCreateSchedule,
  useExistingDraft,
  useSchedule,
  useScheduleCatalogOptions,
  useScheduleListFilters,
  useScheduleVersions,
} from './hooks/useSchedules';
export { useScheduleEditor, useUnsavedChangesGuard } from './hooks/useScheduleEditor';
export {
  useDeleteTask,
  useReorderTasks,
  useSaveTask,
  useScheduleTasks,
} from './hooks/useScheduleTasks';

// Schemas and helpers
export {
  DAY_LIMITS,
  TASK_LIMITS,
  createScheduleSchema,
  scheduleDaysSchema,
  taskSchema,
  validateDays,
} from './schemas/scheduleValidation';
export {
  buildPrerequisiteMap,
  dependsOn,
  findOrderViolation,
  getDependents,
  moveItem,
  wouldCreateCycle,
} from './utils/graph';
export { scheduleName } from './utils/format';
