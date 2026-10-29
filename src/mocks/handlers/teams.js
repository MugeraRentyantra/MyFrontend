import {
  INVITE_EXPIRY_DAYS,
  MEMBER_STATUS,
  ROLES,
  TEAM_STATUS,
  paths,
} from '@/shared/constants';
import { isValidEmail } from '@/shared/utils/helpers';
import { db } from '../db';
import { daysFromNow, randomToken } from '../seed/helpers';
import {
  acceptInvite,
  createTeam,
  declineInvite,
  inviteDetailsDto,
  inviteToTeam,
  progressDto,
  queueEmail,
  refreshTeamStatus,
  teamDto,
  teamMemberDto,
  teamReadiness,
} from '../services';
import {
  conflict,
  created,
  forbidden,
  json,
  mock,
  noContent,
  notFound,
  readJson,
  requireAuth,
  validationError,
} from '../utils';

/**
 * Teams (SD10, SD11, SD12) — see docs/API_CONTRACT.md "Teams".
 * Static paths ('/teams/mine', '/teams/invites/:token…') are registered before '/teams/:id…'.
 * Team creation, invites, accept/decline and readiness use the shared domain logic in services.js;
 * resend/cancel and the progress view are small enough to live here.
 */

const TEAM_NAME_MIN = 3;
const TEAM_NAME_MAX = 60;
const MAX_INVITES_PER_REQUEST = 4;
const GITHUB_REPO_URL_RE =
  /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]+\/?$/;
const OPEN_STATUSES = [TEAM_STATUS.FORMING, TEAM_STATUS.READY];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const nowIso = () => new Date().toISOString();

function taskSequence(progress) {
  const task = db.taskDefinitions.find((candidate) => candidate._id === progress?.taskId);
  return Number(task?.sequence) || 0;
}

function userName(userId) {
  return db.users.find((candidate) => candidate._id === userId)?.name ?? 'Team member';
}

function sameEmail(a, b) {
  return Boolean(a && b) && String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function membersOf(teamId) {
  return db.teamMembers.filter((member) => member.teamId === teamId);
}

function isLeaderOf(team, user) {
  return team.leaderId === user._id;
}

/** The viewer's member record when they lead, joined or were invited (by user id or email). */
function viewerMembership(team, user) {
  if (isLeaderOf(team, user)) return { kind: 'leader' };
  const member = membersOf(team._id).find(
    (candidate) =>
      (candidate.userId === user._id || sameEmail(candidate.email, user.email)) &&
      (candidate.status === MEMBER_STATUS.JOINED || candidate.status === MEMBER_STATUS.INVITED),
  );
  if (!member) return null;
  return { kind: member.status === MEMBER_STATUS.JOINED ? 'member' : 'invited', member };
}

function isAdmin(user) {
  return Array.isArray(user?.roles) && user.roles.includes(ROLES.ADMIN);
}

/** Accepts whatever acceptInvite returns (Team, TeamMember or { team }) and resolves the team. */
function asTeam(result) {
  if (!result) return null;
  if (result.leaderId) return result;
  if (result.team?.leaderId) return result.team;
  const teamId = result.teamId ?? result.team?._id;
  return teamId ? db.teams.find((team) => team._id === teamId) ?? null : null;
}

/** Raw member documents have no `name`; DTOs do. */
function toMemberDto(member) {
  if (!member) return member;
  return 'name' in member ? member : teamMemberDto(member);
}

function memberUserId(submission) {
  const by = submission?.submittedBy;
  return by && typeof by === 'object' ? by._id : by;
}

/** Shared lookup + auth for '/teams/:id/…' routes. Returns { user, team } or { error }. */
function loadTeamFor(request, params, { leaderOnly = false, joinedOnly = false } = {}) {
  const auth = requireAuth(request);
  if (auth.error) return { error: auth.error };
  const { user } = auth;
  const team = db.teams.find((candidate) => candidate._id === params.id);
  if (!team) return { error: notFound('Team') };

  if (leaderOnly) {
    if (!isLeaderOf(team, user)) {
      return { error: forbidden('Only the team leader can do this.') };
    }
    return { user, team };
  }

  const membership = viewerMembership(team, user);
  const allowed = isAdmin(user) || (membership && (!joinedOnly || membership.kind !== 'invited'));
  if (!allowed) {
    return { error: forbidden("You're not a member of this team.") };
  }
  return { user, team };
}

function requireOpenTeam(team) {
  if (!OPEN_STATUSES.includes(team.status)) {
    return conflict(
      'INVALID_TRANSITION',
      team.status === TEAM_STATUS.ACTIVE
        ? 'This team has already started, so its members can no longer change.'
        : 'This team can no longer change its members.',
    );
  }
  return null;
}

function findInvite(team, inviteId) {
  return membersOf(team._id).find((member) => member._id === inviteId) ?? null;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const teamHandlers = [
  // Teams I lead or have joined (frontend addition).
  mock.get('/teams/mine', ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    const { user } = auth;
    const joinedTeamIds = new Set(
      db.teamMembers
        .filter((member) => member.userId === user._id && member.status === MEMBER_STATUS.JOINED)
        .map((member) => member.teamId),
    );
    const teams = db.teams
      .filter((team) => team.leaderId === user._id || joinedTeamIds.has(team._id))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    const items = teams.map((team) => teamDto(team));
    return json({ items, page: 1, limit: items.length, total: items.length });
  }),

  // Public invite details (works signed out).
  mock.get('/teams/invites/:token', ({ params }) => {
    const member = db.teamMembers.find((candidate) => candidate.inviteToken === params.token);
    if (!member) return notFound('Invite');
    return json(inviteDetailsDto(member));
  }),

  mock.post('/teams/invites/:token/accept', ({ request, params }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    const team = asTeam(acceptInvite({ user: auth.user, token: params.token }));
    if (!team) return notFound('Team');
    return json(teamDto(team));
  }),

  mock.post('/teams/invites/:token/decline', ({ request, params }) => {
    const auth = requireAuth(request);
    if (auth.error) return auth.error;
    const result = declineInvite({ user: auth.user, token: params.token });
    return json({ message: result?.message || 'You declined the invite.' });
  }),

  // Create a team (the creator becomes its leader).
  mock.post('/teams', async ({ request }) => {
    const auth = requireAuth(request, [ROLES.STUDENT]);
    if (auth.error) return auth.error;
    const body = await readJson(request);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const planId = typeof body.planId === 'string' ? body.planId : '';

    const details = [];
    if (name.length < TEAM_NAME_MIN || name.length > TEAM_NAME_MAX) {
      details.push({
        field: 'name',
        message: `Team name must be ${TEAM_NAME_MIN} to ${TEAM_NAME_MAX} characters.`,
      });
    }
    const plan = planId ? db.internshipPlans.find((candidate) => candidate._id === planId) : null;
    if (!plan || plan.status !== 'PUBLISHED') {
      details.push({ field: 'planId', message: 'Choose a published internship plan.' });
    }
    if (details.length > 0) return validationError(details);

    const team = createTeam({ user: auth.user, name, planId: plan._id });
    return created(teamDto(team));
  }),

  mock.get('/teams/:id', ({ request, params }) => {
    const result = loadTeamFor(request, params);
    if (result.error) return result.error;
    return json(teamDto(result.team));
  }),

  mock.post('/teams/:id/invites', async ({ request, params }) => {
    const result = loadTeamFor(request, params, { leaderOnly: true });
    if (result.error) return result.error;
    const { user, team } = result;
    const closed = requireOpenTeam(team);
    if (closed) return closed;

    const body = await readJson(request);
    const emails = Array.isArray(body.emails)
      ? [...new Set(body.emails.map((email) => String(email ?? '').trim().toLowerCase()).filter(Boolean))]
      : [];
    if (emails.length === 0) {
      return validationError([{ field: 'emails', message: 'Add at least one email address.' }]);
    }
    if (emails.length > MAX_INVITES_PER_REQUEST) {
      return validationError([
        { field: 'emails', message: `You can invite up to ${MAX_INVITES_PER_REQUEST} people.` },
      ]);
    }
    const invalid = emails.find((email) => !isValidEmail(email));
    if (invalid) {
      return validationError([{ field: 'emails', message: `${invalid} isn't a valid email address.` }]);
    }
    if (emails.some((email) => sameEmail(email, user.email))) {
      return validationError([
        { field: 'emails', message: "You're the team leader, so you don't need an invite." },
      ]);
    }

    const invited = inviteToTeam({ user, team, emails });
    const members = Array.isArray(invited) ? invited : (invited?.items ?? invited?.members ?? []);
    return created({ items: members.map(toMemberDto) });
  }),

  // Re-sends an invite with a fresh link and expiry (frontend addition).
  mock.post('/teams/:id/invites/:inviteId/resend', ({ request, params }) => {
    const result = loadTeamFor(request, params, { leaderOnly: true });
    if (result.error) return result.error;
    const { user, team } = result;
    const closed = requireOpenTeam(team);
    if (closed) return closed;

    const member = findInvite(team, params.inviteId);
    if (!member || member.isLeader) return notFound('Invite');
    if (member.status !== MEMBER_STATUS.INVITED) {
      return conflict('INVALID_TRANSITION', 'Only pending invites can be sent again.');
    }

    member.inviteToken = randomToken('invite');
    member.invitedAt = nowIso();
    member.inviteExpiresAt = daysFromNow(INVITE_EXPIRY_DAYS);
    team.updatedAt = nowIso();

    queueEmail({
      to: member.email,
      template: 'team-invite',
      subject: `${user.name} invited you to join ${team.name}`,
      link: paths.teamInvite(member.inviteToken),
      payload: { teamId: team._id, teamName: team.name, leaderName: user.name, resent: true },
    });

    return json(teamMemberDto(member));
  }),

  mock.delete('/teams/:id/invites/:inviteId', ({ request, params }) => {
    const result = loadTeamFor(request, params, { leaderOnly: true });
    if (result.error) return result.error;
    const { team } = result;
    const closed = requireOpenTeam(team);
    if (closed) return closed;

    const member = findInvite(team, params.inviteId);
    if (!member || member.isLeader) return notFound('Invite');
    if (member.status !== MEMBER_STATUS.INVITED) {
      return conflict('INVALID_TRANSITION', 'Only pending invites can be cancelled.');
    }

    // Kept (as REMOVED) so the old link explains that the invite was cancelled.
    member.status = MEMBER_STATUS.REMOVED;
    team.updatedAt = nowIso();
    refreshTeamStatus(team);
    return noContent();
  }),

  mock.get('/teams/:id/readiness', ({ request, params }) => {
    const result = loadTeamFor(request, params);
    if (result.error) return result.error;
    return json(teamReadiness(result.team));
  }),

  mock.put('/teams/:id/repo', async ({ request, params }) => {
    const result = loadTeamFor(request, params, { leaderOnly: true });
    if (result.error) return result.error;
    const { team } = result;
    if (team.status === TEAM_STATUS.DISBANDED) {
      return conflict('INVALID_TRANSITION', 'This team was disbanded.');
    }

    const body = await readJson(request);
    const repoUrl = typeof body.repoUrl === 'string' ? body.repoUrl.trim().replace(/\/+$/, '') : '';
    if (!GITHUB_REPO_URL_RE.test(repoUrl)) {
      return validationError([
        {
          field: 'repoUrl',
          message: 'Use a repository URL like https://github.com/owner/repository.',
        },
      ]);
    }

    team.repoUrl = repoUrl;
    team.updatedAt = nowIso();
    return json(teamDto(team));
  }),

  mock.get('/teams/:id/progress', ({ request, params }) => {
    const result = loadTeamFor(request, params, { joinedOnly: true });
    if (result.error) return result.error;
    const { team } = result;

    const progress = db.taskProgress
      .filter((item) => item.teamId === team._id)
      .sort((a, b) => taskSequence(a) - taskSequence(b));
    const progressIds = new Set(progress.map((item) => item._id));
    const submissions = db.taskSubmissions.filter((item) => progressIds.has(item.taskProgressId));

    const memberIds = [
      team.leaderId,
      ...membersOf(team._id)
        .filter((member) => member.status === MEMBER_STATUS.JOINED && member.userId)
        .map((member) => member.userId),
    ];
    const contributions = [...new Set(memberIds)].map((userId) => {
      const mine = submissions.filter((item) => memberUserId(item) === userId);
      const lastSubmittedAt =
        mine
          .map((item) => item.submittedAt)
          .filter(Boolean)
          .sort()
          .pop() ?? null;
      return {
        userId,
        name: userName(userId),
        submissions: mine.length,
        lastSubmittedAt,
      };
    });

    return json({ teamId: team._id, tasks: progress.map((item) => progressDto(item)), contributions });
  }),
];

export default teamHandlers;
