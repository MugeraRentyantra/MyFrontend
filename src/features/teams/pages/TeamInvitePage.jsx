import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  DescriptionList,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  StatusBanner,
  toast,
} from '@/shared/components/ui';
import {
  Clock,
  LinkIcon,
  LogIn,
  LogOut,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from '@/shared/icons';
import { MEMBER_STATUS, ROLES, ROUTES, TEAM_MAX_MEMBERS, paths } from '@/shared/constants';
import { useAuth, useDocumentTitle } from '@/shared/hooks';
import { getErrorMessage, getErrorStatus, isErrorCode } from '@/shared/utils/errors';
import { formatDate, formatRelativeTime, isPast } from '@/shared/utils/helpers';
import { TeamPlanSummary } from '../components/TeamPlanSummary';
import { TeamPricingNotice } from '../components/TeamPricingNotice';
import { useTeamInvite } from '../hooks/useTeam';
import { useAcceptInvite, useDeclineInvite } from '../hooks/useTeamMutations';
import { sameEmail } from '../utils/teamUtils';

const EYEBROW = 'Team invitation';

function InviteShell({ children }) {
  return (
    <div className="min-h-[60vh] bg-slate-50">
      <div className="container-page py-10 sm:py-14">
        <div className="mx-auto max-w-2xl space-y-6">{children}</div>
      </div>
    </div>
  );
}

/** A finished / unusable invite: page title plus one designed empty state (as a solid card). */
function InviteState(props) {
  return (
    <InviteShell>
      <PageHeader eyebrow={EYEBROW} title="Team invitation" />
      <EmptyState titleAs="h2" className="border-solid border-slate-200 shadow-card" {...props} />
    </InviteShell>
  );
}

const browseAction = (
  <Button as={Link} to={ROUTES.CATALOG} variant="outline">
    Browse internships
  </Button>
);

/** /team/invite/:token — public: review a team invite, then accept or decline it (SN10, SD10). */
export function TeamInvitePage() {
  const { token } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, status: authStatus, isAuthenticated, hasRole, logout } = useAuth();
  const inviteQuery = useTeamInvite(token);
  const accept = useAcceptInvite(token);
  const decline = useDeclineInvite(token);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [switching, setSwitching] = useState(false);

  const invite = inviteQuery.data;
  const team = invite?.team ?? {};
  useDocumentTitle(team.name ? `Join ${team.name}` : 'Team invitation');

  const currentPath = `${location.pathname}${location.search}`;

  if (inviteQuery.isLoading || authStatus === 'loading') {
    return (
      <InviteShell>
        <PageHeader eyebrow={EYEBROW} title="Team invitation" description="Loading the invite…" />
        <p role="status" className="sr-only">
          Loading the invite…
        </p>
        <SkeletonCard lines={6} />
      </InviteShell>
    );
  }

  if (inviteQuery.isError || !invite) {
    if (!inviteQuery.isError || getErrorStatus(inviteQuery.error) === 404) {
      return (
        <InviteState
          icon={LinkIcon}
          title="This invite link isn't valid"
          description="It may be incomplete or it was replaced by a newer invite. Ask your team leader to send it again."
          action={browseAction}
        />
      );
    }
    return (
      <InviteShell>
        <PageHeader eyebrow={EYEBROW} title="Team invitation" />
        <ErrorState error={inviteQuery.error} onRetry={() => inviteQuery.refetch()} />
      </InviteShell>
    );
  }

  const leaderName = team.leader?.name || 'Your team leader';
  const teamName = team.name || 'the team';
  const emailMatches = isAuthenticated && sameEmail(user?.email, invite.email);
  const expired =
    Boolean(invite.expired) ||
    (invite.status === MEMBER_STATUS.INVITED && isPast(invite.expiresAt));

  const switchAccount = async () => {
    setSwitching(true);
    try {
      await logout();
    } finally {
      navigate(paths.login(currentPath), { replace: true });
    }
  };

  if (declined || invite.status === MEMBER_STATUS.DECLINED) {
    return (
      <InviteState
        icon={UserX}
        title="You declined this invite"
        description={`You won't be added to ${teamName}. If you change your mind, ask ${leaderName} to invite you again.`}
        action={browseAction}
      />
    );
  }

  if (invite.status === MEMBER_STATUS.JOINED) {
    if (emailMatches && team._id) {
      return (
        <InviteState
          icon={Users}
          title={`You're already on ${teamName}`}
          description="You accepted this invite. Open your team page to see what to do next."
          action={
            <Button as={Link} to={paths.team(team._id)}>
              Open team
            </Button>
          }
        />
      );
    }
    return (
      <InviteState
        icon={Users}
        title="This invite has already been accepted"
        description={`It was accepted with ${invite.email}. If that's you, log in with that account to open the team.`}
        action={
          isAuthenticated ? (
            <Button onClick={switchAccount} loading={switching} leftIcon={LogOut}>
              Switch account
            </Button>
          ) : (
            <Button as={Link} to={paths.login(team._id ? paths.team(team._id) : undefined)} leftIcon={LogIn}>
              Log in
            </Button>
          )
        }
      />
    );
  }

  if (invite.status === MEMBER_STATUS.REMOVED) {
    return (
      <InviteState
        icon={UserX}
        title="This invite was cancelled"
        description={`${leaderName} cancelled this invite. Ask them to invite you again if you'd still like to join ${teamName}.`}
        action={browseAction}
      />
    );
  }

  if (expired) {
    return (
      <InviteState
        icon={Clock}
        title="This invite has expired — ask your team leader to resend it."
        description={
          invite.expiresAt
            ? `The invite to join ${teamName} expired on ${formatDate(invite.expiresAt)}. ${leaderName} can send you a fresh link from the team page.`
            : `${leaderName} can send you a fresh link from the team page.`
        }
        action={browseAction}
      />
    );
  }

  const handleAccept = () => {
    accept.mutate(undefined, {
      onSuccess: (joinedTeam) => {
        const teamId = joinedTeam?._id ?? team._id;
        toast.success(`You joined ${joinedTeam?.name ?? teamName}`, {
          description: 'Next, take the assessment and pay for your seat.',
        });
        if (teamId) navigate(paths.team(teamId), { replace: true });
        else navigate(ROUTES.DASHBOARD, { replace: true });
      },
      onError: (error) => {
        if (isErrorCode(error, 'INVITE_EXPIRED')) {
          toast.error('This invite has expired', { description: 'Ask your team leader to resend it.' });
          inviteQuery.refetch();
          return;
        }
        toast.error("Couldn't accept the invite", { description: getErrorMessage(error) });
      },
    });
  };

  const confirmDecline = async () => {
    try {
      await decline.mutateAsync();
      setDeclineOpen(false);
      setDeclined(true);
      toast.success('Invite declined');
    } catch (error) {
      toast.error("Couldn't decline the invite", { description: getErrorMessage(error) });
    }
  };

  let actions;
  if (!isAuthenticated) {
    actions = (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Log in or create an account with{' '}
          <span className="break-all font-medium text-slate-900">{invite.email}</span> to accept this
          invite.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button as={Link} to={paths.login(currentPath)} leftIcon={LogIn} className="sm:flex-1">
            Log in to accept
          </Button>
          <Button
            as={Link}
            to={paths.register(currentPath)}
            variant="outline"
            leftIcon={UserPlus}
            className="sm:flex-1"
          >
            Create an account
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          New here? Use <span className="break-all font-medium">{invite.email}</span> when you sign up
          so the invite matches your account.
        </p>
      </div>
    );
  } else if (!emailMatches || !hasRole(ROLES.STUDENT)) {
    const wrongRole = emailMatches && !hasRole(ROLES.STUDENT);
    actions = (
      <div className="space-y-4">
        <StatusBanner
          variant="warning"
          title={wrongRole ? 'Only student accounts can join a team' : 'This invite is for a different account'}
        >
          {wrongRole
            ? `You're signed in as ${user?.email}, which isn't a student account.`
            : `It was sent to ${invite.email}, but you're signed in as ${user?.email}. Switch accounts to accept it.`}
        </StatusBanner>
        <div className="flex justify-end">
          <Button onClick={switchAccount} loading={switching} leftIcon={LogOut}>
            Switch account
          </Button>
        </div>
      </div>
    );
  } else {
    actions = (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          leftIcon={UserX}
          onClick={() => setDeclineOpen(true)}
          disabled={accept.isPending}
        >
          Decline
        </Button>
        <Button
          leftIcon={UserCheck}
          onClick={handleAccept}
          loading={accept.isPending}
          disabled={decline.isPending}
        >
          Accept and join team
        </Button>
      </div>
    );
  }

  return (
    <InviteShell>
      <PageHeader
        eyebrow={EYEBROW}
        title={`Join ${teamName}`}
        description={`${leaderName} invited you to do your internship together as a team.`}
      />

      <Card padding="none">
        <CardBody className="space-y-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={team.leader?.name || leaderName} size="lg" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Team leader</p>
              <p className="truncate font-medium text-slate-900">{leaderName}</p>
            </div>
          </div>

          <TeamPlanSummary plan={team.plan} />

          <DescriptionList
            items={[
              { label: 'Invited email', value: <span className="break-all">{invite.email}</span> },
              {
                label: 'Team size',
                value:
                  typeof team.membersCount === 'number'
                    ? `${team.membersCount} of ${TEAM_MAX_MEMBERS}`
                    : `Up to ${TEAM_MAX_MEMBERS}`,
              },
              invite.expiresAt && {
                label: 'Invite expires',
                span: 2,
                value: (
                  <time dateTime={invite.expiresAt}>
                    {formatDate(invite.expiresAt)} ({formatRelativeTime(invite.expiresAt)})
                  </time>
                ),
              },
            ]}
          />

          <TeamPricingNotice />
        </CardBody>
        <div className="rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-5 py-5">{actions}</div>
      </Card>

      <ConfirmDialog
        open={declineOpen}
        onClose={() => {
          if (!decline.isPending) setDeclineOpen(false);
        }}
        onConfirm={confirmDecline}
        title="Decline this invite?"
        message={`You won't join ${teamName}. If you change your mind later, ${leaderName} will need to invite you again.`}
        confirmLabel="Decline invite"
        cancelLabel="Go back"
        variant="danger"
        loading={decline.isPending}
      />
    </InviteShell>
  );
}

export default TeamInvitePage;
