import { z } from 'zod';
import { TEAM_MAX_INVITES } from '@/shared/constants';
import { isValidEmail, pluralize } from '@/shared/utils/helpers';

/**
 * Team forms (SN10, SN11). Client-side checks give fast feedback only: the server re-validates
 * everything (name length, published plan, invite limits, duplicates, repository URL).
 */

export const TEAM_NAME_MIN_LENGTH = 3;
export const TEAM_NAME_MAX_LENGTH = 60;

/** https://github.com/<owner>/<repo> with an optional trailing slash (".git" is part of the repo name). */
export const GITHUB_REPO_URL_RE =
  /^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]+\/?$/;

export const teamNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a team name.')
  .min(TEAM_NAME_MIN_LENGTH, `Use at least ${TEAM_NAME_MIN_LENGTH} characters.`)
  .max(TEAM_NAME_MAX_LENGTH, `Use ${TEAM_NAME_MAX_LENGTH} characters or fewer.`);

export const teamFormSchema = z.object({
  name: teamNameSchema,
  planId: z.string().min(1, 'Choose a designation, domain and duration for your team.'),
  // Each entry is checked as it is added (EmailChipsInput + getInviteEmailProblem).
  emails: z
    .array(z.string())
    .max(TEAM_MAX_INVITES, `You can invite up to ${pluralize(TEAM_MAX_INVITES, 'teammate')}.`),
});

export const repoUrlSchema = z.object({
  repoUrl: z
    .string()
    .trim()
    .min(1, 'Enter the repository URL.')
    .regex(GITHUB_REPO_URL_RE, 'Use a repository URL like https://github.com/owner/repository.'),
});

/** Trims and drops a trailing slash so the stored URL is canonical. */
export function normalizeRepoUrl(value) {
  return String(value ?? '')
    .trim()
    .replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------
// Invite email list helpers (used by EmailChipsInput)
// ---------------------------------------------------------------------------

const SEPARATOR_RE = /[\s,;]+/;
const EMAIL_IN_TEXT_RE = /[^\s,;<>"'()[\]]+@[^\s,;<>"'()[\]]+/g;

/** Lower-cases and strips wrapping punctuation: "<Asha@Example.com>," -> "asha@example.com". */
export function normalizeEmail(value) {
  return String(value ?? '')
    .trim()
    .replace(/^[<("'[]+/, '')
    .replace(/[>)"'\].]+$/, '')
    .toLowerCase();
}

/**
 * Splits typed or pasted text into candidate emails. Address-book text such as
 * "Asha Rao <asha@example.com>, Ravi <ravi@example.com>" yields just the addresses.
 */
export function splitEmailText(text) {
  const value = String(text ?? '');
  if (value.includes('<') && value.includes('@')) {
    const found = value.match(EMAIL_IN_TEXT_RE);
    if (found && found.length > 0) return found;
  }
  return value.split(SEPARATOR_RE).filter(Boolean);
}

/**
 * Why `email` (already normalised) cannot be added to the invite list, or null when it can.
 * Returns { code, message, keep } — `keep` says whether the text should stay in the input so the
 * person can fix it (bad format, list full) or be dropped (duplicate, own email, already on the team).
 *
 * options: current (emails already in the list), ownEmail (the leader's email),
 *          blocked ({ [email]: reason } for people already invited or joined), max (list size limit).
 */
export function getInviteEmailProblem(
  email,
  { current = [], ownEmail = '', blocked = {}, max = TEAM_MAX_INVITES } = {},
) {
  if (!isValidEmail(email)) {
    return { code: 'format', keep: true, message: `"${email}" doesn't look like an email address.` };
  }
  if (current.includes(email)) {
    return { code: 'duplicate', keep: false, message: `${email} is already in the list.` };
  }
  if (ownEmail && email === normalizeEmail(ownEmail)) {
    return {
      code: 'self',
      keep: false,
      message: "That's your own email. As the team leader you're already on the team.",
    };
  }
  if (blocked && blocked[email]) {
    return { code: 'member', keep: false, message: blocked[email] };
  }
  if (current.length >= max) {
    return {
      code: 'limit',
      keep: true,
      message:
        max > 0
          ? `You can add up to ${pluralize(max, 'email')}. Remove one to add another.`
          : 'Your team has no free seats left.',
    };
  }
  return null;
}
