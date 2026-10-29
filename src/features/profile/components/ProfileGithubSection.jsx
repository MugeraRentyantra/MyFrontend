import { Card, ErrorState, SkeletonCard } from '@/shared/components/ui';
import { useEnrollments } from '@/features/applications/hooks/useApplications';
import { useMyTeams } from '@/features/teams/hooks/useMyTeams';
import { GithubConnectCard } from '@/features/github/components/GithubConnectCard';
import { TeamRepoCard } from '@/features/github/components/TeamRepoCard';
import { useGithubConnection } from '@/features/github/hooks/useGithubConnection';
import { ENROLLMENT_TYPE, TEAM_STATUS } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

/**
 * Profile section id="github" (GP10, GP11). Individual enrollments link a personal GitHub
 * account (GithubConnectCard); team enrollments use the team's shared repository
 * (TeamRepoCard) and never get a Connect button.
 */
export function ProfileGithubSection({ className }) {
  const enrollmentsQuery = useEnrollments();
  const teamsQuery = useMyTeams();
  const connectionQuery = useGithubConnection();

  const isLoading = enrollmentsQuery.isLoading || teamsQuery.isLoading;
  const failedQuery = enrollmentsQuery.isError
    ? enrollmentsQuery
    : teamsQuery.isError
      ? teamsQuery
      : null;

  const enrollments = Array.isArray(enrollmentsQuery.data) ? enrollmentsQuery.data : [];
  const teams = (Array.isArray(teamsQuery.data) ? teamsQuery.data : []).filter(
    (team) => team && team.status !== TEAM_STATUS.DISBANDED,
  );
  const hasIndividualEnrollment = enrollments.some(
    (enrollment) => enrollment?.enrollmentType !== ENROLLMENT_TYPE.TEAM,
  );
  const isConnected = Boolean(connectionQuery.data?.connected);
  // Students who are only in team internships see the team repository instead; anyone with an
  // individual internship, no team yet, or an existing connection (to manage it) sees the card.
  const showConnectCard = hasIndividualEnrollment || teams.length === 0 || isConnected;
  const cardCount = (showConnectCard ? 1 : 0) + teams.length;

  let body;
  if (isLoading) {
    body = (
      <div role="status">
        <span className="sr-only">Loading your GitHub settings…</span>
        <SkeletonCard lines={4} />
      </div>
    );
  } else if (failedQuery) {
    body = (
      <Card>
        <ErrorState
          compact
          title="Couldn't load your GitHub settings"
          error={failedQuery.error}
          onRetry={() => {
            if (enrollmentsQuery.isError) enrollmentsQuery.refetch();
            if (teamsQuery.isError) teamsQuery.refetch();
          }}
        />
      </Card>
    );
  } else {
    body = (
      <div className={cn('grid gap-6', cardCount > 1 && 'xl:grid-cols-2')}>
        {showConnectCard ? <GithubConnectCard /> : null}
        {teams.map((team) => (
          <TeamRepoCard key={team._id} team={team} />
        ))}
      </div>
    );
  }

  return (
    <section
      id="github"
      tabIndex={-1}
      aria-labelledby="profile-github-heading"
      className={cn('scroll-mt-24 space-y-4 focus:outline-none', className)}
    >
      <div>
        <h2
          id="profile-github-heading"
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          GitHub
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          How your code reaches your trainer. Individual internships link your own GitHub
          account; team internships share one repository.
        </p>
      </div>
      {body}
    </section>
  );
}

export default ProfileGithubSection;
