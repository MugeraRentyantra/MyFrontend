import { MEMBER_STATUS, TEAM_MAX_MEMBERS, TEAM_STATUS } from '@/shared/constants';
import { formatDuration, isPast } from '@/shared/utils/helpers';

/** Pure helpers for the team screens (no JSX). */

/** Members in these states hold one of the TEAM_MAX_MEMBERS seats. */
export const SEAT_HOLDING_STATUSES = [MEMBER_STATUS.INVITED, MEMBER_STATUS.JOINED];

/** Teams that can still change their line-up (invite, resend, cancel). */
export const OPEN_TEAM_STATUSES = [TEAM_STATUS.FORMING, TEAM_STATUS.READY];

export function sameEmail(a, b) {
  if (!a || !b) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export function seatsUsed(members = []) {
  return (members ?? []).filter((member) => SEAT_HOLDING_STATUSES.includes(member?.status)).length;
}

export function seatsLeft(members = []) {
  return Math.max(0, TEAM_MAX_MEMBERS - seatsUsed(members));
}

export function isTeamOpen(team) {
  return OPEN_TEAM_STATUSES.includes(team?.status);
}

export function isTeamLeader(team, user) {
  if (!team || !user?._id) return false;
  return team.leaderId === user._id || team.leader?._id === user._id;
}

export function isInviteExpired(member, now = Date.now()) {
  return member?.status === MEMBER_STATUS.INVITED && isPast(member?.inviteExpiresAt, now);
}

/** Name when the person has an account, else their email. */
export function memberDisplayName(member) {
  const name = typeof member?.name === 'string' ? member.name.trim() : '';
  return name || member?.email || 'Invited member';
}

/** Ready = joined, assessed and paid (readiness member shape). */
export function isMemberReady(member) {
  return Boolean(member?.joined && member?.assessed && member?.paid);
}

/** The step a readiness member still has to finish, in plain words (null when ready). */
export function nextMissingStep(member) {
  if (!member?.joined) return 'accept the invite';
  if (!member?.assessed) return 'take the assessment';
  if (!member?.paid) return 'pay for their seat';
  return null;
}

/** The readiness row of the signed-in user (by user id, then by email). */
export function findMyMember(members = [], user) {
  if (!user) return null;
  const list = members ?? [];
  return (
    list.find((member) => member?.userId && member.userId === user._id) ??
    list.find((member) => sameEmail(member?.email, user.email)) ??
    null
  );
}

/** { [email]: reason } for people who cannot be invited again (already invited or joined). */
export function blockedInviteEmails(members = []) {
  const blocked = {};
  (members ?? []).forEach((member) => {
    if (!member?.email) return;
    const email = String(member.email).trim().toLowerCase();
    if (member.status === MEMBER_STATUS.JOINED) {
      blocked[email] = `${member.email} is already on the team.`;
    } else if (member.status === MEMBER_STATUS.INVITED) {
      blocked[email] = `${member.email} has already been invited. Resend their invite instead.`;
    }
  });
  return blocked;
}

/** "Domain · 3 months" (the designation is shown separately as the title). */
export function planDetailsLabel(plan) {
  if (!plan) return '';
  return [plan.domain?.name, plan.durationMonths ? formatDuration(plan.durationMonths) : null]
    .filter(Boolean)
    .join(' · ');
}

/** designationId of a Plan / PlanRef. */
export function planDesignationId(plan) {
  return plan?.designation?._id ?? plan?.designationId ?? null;
}

const MEMBER_ORDER = {
  [MEMBER_STATUS.JOINED]: 1,
  [MEMBER_STATUS.INVITED]: 2,
  [MEMBER_STATUS.DECLINED]: 3,
  [MEMBER_STATUS.REMOVED]: 4,
};

/** Leader first, then joined, invited and declined members, each alphabetically. */
export function sortMembers(members = []) {
  return [...(members ?? [])].sort((a, b) => {
    if (a.isLeader !== b.isLeader) return a.isLeader ? -1 : 1;
    const byStatus = (MEMBER_ORDER[a.status] ?? 9) - (MEMBER_ORDER[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    return memberDisplayName(a).localeCompare(memberDisplayName(b));
  });
}
