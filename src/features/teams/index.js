/** Teams feature (SN10, SN11): public API. Pages are lazy-loaded from src/routes/lazyPages.js. */

// Components
export { TeamForm } from './components/TeamForm';
export { EmailChipsInput } from './components/EmailChipsInput';
export { PlanPicker } from './components/PlanPicker';
export { MemberStatusTable } from './components/MemberStatusTable';
export { InvitePanel } from './components/InvitePanel';
export { RepoUrlForm } from './components/RepoUrlForm';
export { TeamActiveBanner } from './components/TeamActiveBanner';
export { TeamProgressCard } from './components/TeamProgressCard';
export { TeamPlanSummary } from './components/TeamPlanSummary';
export { TeamPricingNotice } from './components/TeamPricingNotice';
export { NextStepCard } from './components/NextStepCard';
export { HowTeamsWork } from './components/HowTeamsWork';

// Hooks
export { useMyTeams } from './hooks/useMyTeams';
export { useTeam, useTeamReadiness, useTeamProgress, useTeamInvite } from './hooks/useTeam';
export {
  useCreateTeam,
  useInviteMembers,
  useResendInvite,
  useCancelInvite,
  useUpdateRepo,
  useAcceptInvite,
  useDeclineInvite,
} from './hooks/useTeamMutations';
export { usePublishedDesignations, useDesignationPlans, usePlanById } from './hooks/useTeamPlans';

// Schemas and helpers
export {
  teamFormSchema,
  teamNameSchema,
  repoUrlSchema,
  normalizeRepoUrl,
  normalizeEmail,
  splitEmailText,
  getInviteEmailProblem,
  GITHUB_REPO_URL_RE,
  TEAM_NAME_MIN_LENGTH,
  TEAM_NAME_MAX_LENGTH,
} from './schemas/teamValidation';
export {
  seatsUsed,
  seatsLeft,
  isTeamOpen,
  isTeamLeader,
  isMemberReady,
  findMyMember,
  memberDisplayName,
} from './utils/teamUtils';
