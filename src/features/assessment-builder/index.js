/**
 * Admin assessment builder (KD5): 15 questions + discount slabs per designation, saved as drafts
 * and published as versions. Pages are lazy-loaded by the router (src/routes/lazyPages.js).
 */
export { AssessmentBuilder } from './components/AssessmentBuilder';
export { QuestionEditor } from './components/QuestionEditor';
export { SlabTable, TEAM_PRICING_NOTE, NO_PASS_MARK_NOTE } from './components/SlabTable';
export { SlabCoverageBar } from './components/SlabCoverageBar';
export { BuilderSummary } from './components/BuilderSummary';
export { PublishBar } from './components/PublishBar';
export { VersionBadges } from './components/VersionBadges';
export {
  isAssessmentConfig,
  useAssessmentConfig,
  useAssessmentConfigs,
  usePublishAssessment,
  useSaveAssessmentDraft,
  useUnsavedChangesGuard,
} from './hooks/useAssessmentBuilder';
export {
  analyseSlabs,
  createDefaultSlabRows,
  createEmptyQuestion,
  createInitialDraft,
  getQuestionIssues,
  serializeDraft,
  toPayload,
  validateDraft,
} from './utils/validation';
export { getVersionInfo } from './utils/versions';
