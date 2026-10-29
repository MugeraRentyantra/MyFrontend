import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  SkeletonCard,
  StatusBadge,
  StatusBanner,
} from '@/shared/components/ui';
import { Lock, Users } from '@/shared/icons';
import { ROUTES, TEAM_MAX_MEMBERS, TEAM_STATUS } from '@/shared/constants';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { queryKeys } from '@/services/queryKeys';
import { getErrorStatus } from '@/shared/utils/errors';
import { formatDate } from '@/shared/utils/helpers';
import { InvitePanel } from '../components/InvitePanel';
import { MemberStatusTable } from '../components/MemberStatusTable';
import { NextStepCard } from '../components/NextStepCard';
import { RepoUrlForm } from '../components/RepoUrlForm';
import { TeamActiveBanner } from '../components/TeamActiveBanner';
import { TeamPlanSummary } from '../components/TeamPlanSummary';
import { TeamProgressCard } from '../components/TeamProgressCard';
import { useTeam, useTeamProgress, useTeamReadiness } from '../hooks/useTeam';
import { findMyMember, isTeamLeader, isTeamOpen, seatsLeft } from '../utils/teamUtils';

const BREADCRUMB_ROOT = { label: 'Dashboard', to: ROUTES.DASHBOARD };

function TeamDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[BREADCRUMB_ROOT, { label: 'Team' }]} eyebrow="Team" title="Team" />
      <p role="status" className="sr-only">
        Loading your team…
      </p>
      <Skeleton className="h-24 w-full" rounded="lg" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SkeletonCard lines={6} />
        </div>
        <div className="space-y-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={3} />
        </div>
      </div>
    </div>
  );
}

/** 403 (not a member), 404 and other load failures, each with one clear next step. */
function TeamUnavailable({ error, onRetry }) {
  const status = getErrorStatus(error);
  const homeAction = (
    <Button as={Link} to={ROUTES.DASHBOARD}>
      Go to dashboard
    </Button>
  );

  let content;
  if (status === 403) {
    content = (
      <EmptyState
        titleAs="h2"
        variant="locked"
        icon={Lock}
        title="You're not a member of this team"
        description="Only the team leader and invited members can see this page. If you were invited, open the link in your invite email first."
        action={homeAction}
      />
    );
  } else if (status === 404) {
    content = (
      <EmptyState
        titleAs="h2"
        icon={Users}
        title="Team not found"
        description="This team doesn't exist any more, or the link is incomplete."
        action={homeAction}
      />
    );
  } else {
    content = <ErrorState error={error} onRetry={onRetry} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[BREADCRUMB_ROOT, { label: 'Team' }]} title="Team" />
      {content}
    </div>
  );
}

function TeamFullNote() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
          aria-hidden="true"
        >
          <Users className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">Your team is full</h2>
          <p className="mt-1 text-sm text-slate-600">
            All {TEAM_MAX_MEMBERS} seats are taken. Cancel a pending invite to free a seat.
          </p>
        </div>
      </div>
    </Card>
  );
}

/** /team/:id — team dashboard: readiness, next step, invites, shared repo and progress (SN11). */
export function TeamDashboardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const teamQuery = useTeam(id);
  const readinessQuery = useTeamReadiness(id);
  const team = teamQuery.data;
  const isActive = team?.status === TEAM_STATUS.ACTIVE;
  const progressQuery = useTeamProgress(id, { enabled: isActive });

  useDocumentTitle(team?.name ? `${team.name} · Team` : 'Team');

  // Readiness polls while the team forms: when it reports a new status, refresh the team itself
  // (and enrollments, which unlock once the team is active).
  const readinessStatus = readinessQuery.data?.status;
  const teamStatus = team?.status;
  useEffect(() => {
    if (!teamStatus || !readinessStatus || teamStatus === readinessStatus) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.mine });
    if (readinessStatus === TEAM_STATUS.ACTIVE) {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    }
  }, [id, queryClient, readinessStatus, teamStatus]);

  if (teamQuery.isLoading) return <TeamDashboardSkeleton />;
  if (teamQuery.isError || !team) {
    return <TeamUnavailable error={teamQuery.error} onRetry={() => teamQuery.refetch()} />;
  }

  const isLeader = isTeamLeader(team, user);
  const isDisbanded = team.status === TEAM_STATUS.DISBANDED;
  const canManage = isLeader && isTeamOpen(team);
  const readinessMembers = readinessQuery.data?.members;
  // Readiness is refreshed in the background, so prefer it for seats and blocked emails.
  const memberSource = readinessMembers ?? team.members ?? [];
  const freeSeats = seatsLeft(memberSource);
  const me = findMyMember(readinessMembers, user);
  const leaderName = team.leader?.name || 'your team leader';

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[BREADCRUMB_ROOT, { label: team.name }]}
        eyebrow="Team"
        title={team.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <StatusBadge status={team.status} />
            <span>
              Led by <span className="font-medium text-slate-700">{leaderName}</span>
              {isLeader ? ' (you)' : ''}
            </span>
            {team.createdAt ? <span>Created {formatDate(team.createdAt)}</span> : null}
          </span>
        }
      />

      <TeamPlanSummary plan={team.plan} />

      {isActive ? <TeamActiveBanner /> : null}

      {isDisbanded ? (
        <StatusBanner variant="warning" title="This team was disbanded">
          It can no longer take members or start. Contact support if you have a question about a
          payment.
        </StatusBanner>
      ) : null}

      {!isActive && !isDisbanded && !readinessQuery.isError ? (
        <NextStepCard
          team={team}
          me={me}
          members={readinessMembers}
          isLoading={readinessQuery.isLoading}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <MemberStatusTable
            teamId={team._id}
            members={readinessMembers}
            teamMembers={team.members}
            currentUserId={user?._id}
            currentUserEmail={user?.email}
            canManage={canManage}
            isLoading={readinessQuery.isLoading}
            error={readinessQuery.isError ? readinessQuery.error : null}
            onRetry={() => readinessQuery.refetch()}
          />
          {isActive ? (
            <TeamProgressCard
              data={progressQuery.data}
              isLoading={progressQuery.isLoading}
              error={progressQuery.isError ? progressQuery.error : null}
              onRetry={() => progressQuery.refetch()}
              currentUserId={user?._id}
            />
          ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          {canManage && freeSeats > 0 ? (
            <InvitePanel teamId={team._id} members={memberSource} ownEmail={user?.email} />
          ) : null}
          {canManage && freeSeats === 0 ? <TeamFullNote /> : null}
          <RepoUrlForm team={team} canEdit={isLeader && !isDisbanded} />
        </div>
      </div>
    </div>
  );
}

export default TeamDashboardPage;
