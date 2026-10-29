import { useMemo, useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Skeleton,
  StatusBadge,
  toast,
} from '@/shared/components/ui';
import { CheckCircle2, Circle, Clock, Send, Star, Users, X } from '@/shared/icons';
import { INVITE_EXPIRY_DAYS, MEMBER_STATUS, TEAM_MAX_MEMBERS } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatDateTime, formatRelativeTime, isPast } from '@/shared/utils/helpers';
import { useCancelInvite, useResendInvite } from '../hooks/useTeamMutations';
import {
  isMemberReady,
  memberDisplayName,
  sameEmail,
  seatsUsed,
  sortMembers,
} from '../utils/teamUtils';

const STEPS = [
  { key: 'invited', label: 'Invited' },
  { key: 'joined', label: 'Joined' },
  { key: 'assessed', label: 'Assessed' },
  { key: 'paid', label: 'Paid' },
];

/** One readiness step: icon + text label (never colour alone) + a screen-reader state. */
function StepChip({ label, done }) {
  return (
    <li
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        done
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
          : 'bg-slate-50 text-slate-500 ring-slate-300/70',
      )}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Circle className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {label}
      <span className="sr-only">{done ? ' (done)' : ' (not yet)'}</span>
    </li>
  );
}

function InviteExpiry({ expiresAt }) {
  if (!expiresAt) return null;
  const expired = isPast(expiresAt);
  return (
    <p
      className={cn(
        'mt-1 flex items-center gap-1 text-xs',
        expired ? 'font-medium text-rose-700' : 'text-amber-700',
      )}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <time dateTime={expiresAt} title={formatDateTime(expiresAt)}>
        {expired
          ? `Invite expired ${formatRelativeTime(expiresAt)}`
          : `Invite expires ${formatRelativeTime(expiresAt)}`}
      </time>
    </p>
  );
}

function LoadingRows() {
  return (
    <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <li key={key} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="h-10 w-10" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="hidden h-6 w-64 md:block" rounded="full" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Team members with their readiness (SN11): Invited / Joined / Assessed / Paid per member,
 * the invite expiry for pending invites and, for the leader of an open team, Resend / Cancel.
 *
 * members      readiness members [{ memberId, userId, name, email, isLeader, status, joined, assessed, paid }]
 * teamMembers  Team.members (adds inviteExpiresAt)
 */
export function MemberStatusTable({
  teamId,
  members,
  teamMembers,
  currentUserId,
  currentUserEmail,
  canManage = false,
  isLoading = false,
  error = null,
  onRetry,
  className,
}) {
  const resend = useResendInvite(teamId);
  const cancel = useCancelInvite(teamId);
  const [cancelTarget, setCancelTarget] = useState(null);

  const rows = useMemo(() => {
    const records = Array.isArray(teamMembers) ? teamMembers : [];
    const byId = new Map(records.map((record) => [record._id, record]));
    const list = (Array.isArray(members) ? members : [])
      .filter((member) => member?.status !== MEMBER_STATUS.REMOVED)
      .map((member) => {
        const record =
          byId.get(member.memberId) ??
          records.find((candidate) => sameEmail(candidate.email, member.email)) ??
          {};
        return {
          ...member,
          memberId: member.memberId ?? record._id,
          inviteExpiresAt: member.inviteExpiresAt ?? record.inviteExpiresAt ?? null,
        };
      });
    return sortMembers(list);
  }, [members, teamMembers]);

  const activeRows = rows.filter((row) => row.status !== MEMBER_STATUS.DECLINED);
  const readyCount = activeRows.filter(isMemberReady).length;
  const used = seatsUsed(rows);

  const handleResend = (row) => {
    resend.mutate(row.memberId, {
      onSuccess: () =>
        toast.success('Invite sent again', {
          description: `A new link is on its way to ${row.email}. It's valid for ${INVITE_EXPIRY_DAYS} days.`,
        }),
      onError: (mutationError) =>
        toast.error("Couldn't resend the invite", { description: getErrorMessage(mutationError) }),
    });
  };

  const closeCancel = () => {
    if (!cancel.isPending) setCancelTarget(null);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancel.mutateAsync(cancelTarget.memberId);
      toast.success('Invite cancelled', {
        description: `${cancelTarget.email} can no longer join with that link.`,
      });
      setCancelTarget(null);
    } catch (mutationError) {
      toast.error("Couldn't cancel the invite", { description: getErrorMessage(mutationError) });
    }
  };

  let body;
  if (isLoading) {
    body = <LoadingRows />;
  } else if (error) {
    body = (
      <div className="px-5 pb-5 pt-4">
        <ErrorState compact error={error} title="Couldn't load member status" onRetry={onRetry} />
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="px-5 pb-5 pt-4">
        <EmptyState
          compact
          icon={Users}
          title="No members yet"
          description="Invite teammates to start building your team."
        />
      </div>
    );
  } else {
    body = (
      <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
        {rows.map((row) => {
          const displayName = memberDisplayName(row);
          const isInvited = row.status === MEMBER_STATUS.INVITED;
          const isDeclined = row.status === MEMBER_STATUS.DECLINED;
          const isYou =
            (currentUserId && row.userId === currentUserId) ||
            (!row.userId && sameEmail(row.email, currentUserEmail));
          const resendingThis = resend.isPending && resend.variables === row.memberId;
          const cancellingThis = cancel.isPending && cancel.variables === row.memberId;
          const showActions = canManage && isInvited && !row.isLeader && Boolean(row.memberId);

          return (
            <li
              key={row.memberId ?? row.email}
              className={cn(
                'flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between',
                isDeclined && 'bg-slate-50/60',
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <Avatar name={displayName} size="md" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 truncate text-sm font-medium text-slate-900">
                      {displayName}
                    </p>
                    {row.isLeader ? (
                      <Badge variant="brand" icon={Star}>
                        Leader
                      </Badge>
                    ) : null}
                    {isYou ? <Badge>You</Badge> : null}
                  </div>
                  {row.name && row.email ? (
                    <p className="truncate text-sm text-slate-500">{row.email}</p>
                  ) : null}
                  {isInvited ? <InviteExpiry expiresAt={row.inviteExpiresAt} /> : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
                {isDeclined ? (
                  <StatusBadge status={MEMBER_STATUS.DECLINED} label="Declined the invite" />
                ) : (
                  <ul aria-label={`${displayName}: progress`} className="flex flex-wrap gap-1.5">
                    {STEPS.map((step) => (
                      <StepChip
                        key={step.key}
                        label={step.label}
                        done={step.key === 'invited' ? true : Boolean(row[step.key])}
                      />
                    ))}
                  </ul>
                )}

                {showActions ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={Send}
                      className="h-10 md:h-8"
                      loading={resendingThis}
                      disabled={cancellingThis}
                      onClick={() => handleResend(row)}
                      aria-label={`Resend invite to ${row.email}`}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={X}
                      className="h-10 text-rose-700 hover:bg-rose-50 hover:text-rose-800 md:h-8"
                      disabled={resendingThis || cancellingThis}
                      onClick={() => setCancelTarget(row)}
                      aria-label={`Cancel invite for ${row.email}`}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  const summary =
    !isLoading && !error && rows.length > 0
      ? `${readyCount} of ${activeRows.length} ready · ${used} of ${TEAM_MAX_MEMBERS} seats used`
      : 'Everyone joins, takes the assessment and pays before the team starts.';

  return (
    <Card padding="none" className={className}>
      <CardHeader icon={Users} title="Members" description={summary} />
      {body}
      {!isLoading && !error && rows.length > 0 ? (
        <p className="rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
          A member is ready once they've joined, taken the assessment and paid. The team starts when
          everyone is ready.
        </p>
      ) : null}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={closeCancel}
        onConfirm={confirmCancel}
        title="Cancel this invite?"
        message={
          cancelTarget
            ? `${cancelTarget.email} won't be able to join with their current link. You can invite them again later.`
            : ''
        }
        confirmLabel="Cancel invite"
        cancelLabel="Keep invite"
        variant="danger"
        loading={cancel.isPending}
      />
    </Card>
  );
}

export default MemberStatusTable;
