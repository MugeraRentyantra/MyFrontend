/**
 * Admin trainer assignment (KD11). The page (pages/AssignmentsPage) is lazy-loaded by
 * src/routes/lazyPages.js, so it is not re-exported here.
 */
export { AssignTrainerDialog } from './components/AssignTrainerDialog';
export { AssignmentHistory } from './components/AssignmentHistory';
export { TargetPicker } from './components/TargetPicker';
export { TargetTypeToggle } from './components/TargetTypeToggle';
export {
  useAssignmentTargets,
  useAssignmentsTable,
  useCreateAssignment,
  useRemoveAssignment,
  useTargetAssignments,
  useTrainerOptions,
} from './hooks/useAssignments';
export * from './utils/assignmentHelpers';
