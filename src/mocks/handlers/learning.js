import {
  ACTIVE_ENROLLMENT_STATUSES,
  MEMBER_STATUS,
  PAYMENT_STATUS,
  TASK_STATUS,
} from '@/shared/constants';
import { renderMarkdown } from '@/shared/utils/markdown';
import { db, oid } from '../db';
import {
  getLatestPublishedTemplate,
  latestPaymentFor,
  listProgressForEnrollment,
} from '../services';
import { forbidden, json, mock, notFound, requireAuth } from '../utils';

/**
 * Learning endpoints (MM9, MM15, GP3, GP4): the day-wise schedule of a paid enrollment and its
 * protected per-day SOP. Task lists/content live in handlers/tasks.js.
 */

const NOT_ACTIVE_MESSAGE = 'Complete payment to unlock the schedule, SOPs and tasks.';

// ---------------------------------------------------------------------------
// Access rules shared by both endpoints
// ---------------------------------------------------------------------------

/** Owner of the enrollment, or (team enrollments) the team leader or a JOINED member. */
function canAccessEnrollment(user, enrollment) {
  if (enrollment.userId === user._id) return true;
  if (!enrollment.teamId) return false;
  const team = db.teams.find((item) => item._id === enrollment.teamId);
  if (team && team.leaderId === user._id) return true;
  return db.teamMembers.some(
    (member) =>
      member.teamId === enrollment.teamId &&
      member.userId === user._id &&
      member.status === MEMBER_STATUS.JOINED,
  );
}

/** Paid content needs an active enrollment status AND a successful latest payment. */
function isUnlocked(enrollment) {
  if (!ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.status)) return false;
  return latestPaymentFor(enrollment._id)?.status === PAYMENT_STATUS.SUCCESS;
}

/** Returns { user, enrollment } or { error: Response } (401 / 404 / 403 / 403 ENROLLMENT_NOT_ACTIVE). */
function loadUnlockedEnrollment(request, enrollmentId) {
  const auth = requireAuth(request);
  if (auth.error) return { error: auth.error };
  const enrollment = db.enrollments.find((item) => item._id === enrollmentId);
  if (!enrollment) return { error: notFound('Enrollment') };
  if (!canAccessEnrollment(auth.user, enrollment)) return { error: forbidden() };
  if (!isUnlocked(enrollment)) {
    return { error: forbidden(NOT_ACTIVE_MESSAGE, 'ENROLLMENT_NOT_ACTIVE') };
  }
  return { user: auth.user, enrollment };
}

// ---------------------------------------------------------------------------
// Schedule building
// ---------------------------------------------------------------------------

/** The template version the enrollment is pinned to, else the latest published one for its plan. */
function resolveTemplate(enrollment) {
  const pinned = enrollment.scheduleTemplateId
    ? db.scheduleTemplates.find((template) => template._id === enrollment.scheduleTemplateId)
    : null;
  if (pinned) return pinned;
  const plan = db.internshipPlans.find((item) => item._id === enrollment.planId);
  if (!plan) return null;
  return (
    getLatestPublishedTemplate({
      designationId: plan.designationId,
      domainId: plan.domainId,
      durationMonths: plan.durationMonths,
    }) ?? null
  );
}

/** The enrollment's task progress (team-scoped by services) joined with each task's day. */
function datedTasks(enrollment) {
  const entries = [];
  for (const progress of listProgressForEnrollment(enrollment) ?? []) {
    const definition = db.taskDefinitions.find((item) => item._id === progress.taskId);
    const dayNumber = Number(definition?.dayNumber);
    if (!definition || !Number.isInteger(dayNumber) || dayNumber < 1) continue;
    entries.push({
      dayNumber,
      sequence: Number(definition.sequence ?? 0),
      progressId: progress._id,
      title: definition.title,
      status: progress.status,
    });
  }
  return entries.sort((a, b) => a.dayNumber - b.dayNumber || a.sequence - b.sequence);
}

function scheduleResponse(enrollment, template) {
  const days = [...(template?.days ?? [])].sort(
    (a, b) => Number(a.dayNumber) - Number(b.dayNumber),
  );
  const tasks = datedTasks(enrollment);

  return {
    enrollmentId: enrollment._id,
    scheduleTemplateId: template?._id ?? null,
    version: template?.version ?? enrollment.scheduleVersion ?? null,
    totalDays: days.length,
    days: days.map((day) => {
      const dayNumber = Number(day.dayNumber);
      const dayTasks = tasks.filter((entry) => entry.dayNumber === dayNumber);
      const task = dayTasks[0] ?? null;
      // A day with a task is complete once it is approved; a day without one once every task
      // scheduled before it is approved.
      const completed = task
        ? dayTasks.every((entry) => entry.status === TASK_STATUS.APPROVED)
        : tasks
            .filter((entry) => entry.dayNumber < dayNumber)
            .every((entry) => entry.status === TASK_STATUS.APPROVED);
      return {
        dayNumber,
        title: day.title || `Day ${dayNumber}`,
        activity: day.activity ?? '',
        requiredEvidence: day.requiredEvidence ?? '',
        hasSop: Boolean(day.sopContent && String(day.sopContent).trim()),
        task: task ? { progressId: task.progressId, title: task.title, status: task.status } : null,
        completed,
      };
    }),
  };
}

function watermarkFor(user) {
  return `${user.name} · ID ${String(user._id).slice(-6).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const learningHandlers = [
  mock.get('/enrollments/:id/schedule', ({ request, params }) => {
    const access = loadUnlockedEnrollment(request, params.id);
    if (access.error) return access.error;
    const { enrollment } = access;
    return json(scheduleResponse(enrollment, resolveTemplate(enrollment)));
  }),

  mock.get('/enrollments/:id/schedule/days/:dayNumber/sop', ({ request, params }) => {
    const access = loadUnlockedEnrollment(request, params.id);
    if (access.error) return access.error;
    const { user, enrollment } = access;

    const raw = String(params.dayNumber ?? '');
    const dayNumber = /^\d{1,4}$/.test(raw) ? Number.parseInt(raw, 10) : null;
    const template = resolveTemplate(enrollment);
    const day =
      dayNumber === null
        ? null
        : (template?.days ?? []).find((item) => Number(item.dayNumber) === dayNumber);
    if (!day) return notFound('Schedule day');

    // Every SOP view is logged (MM15) so leaked content can be traced back.
    db.sopAccessLogs.push({
      _id: oid(),
      userId: user._id,
      enrollmentId: enrollment._id,
      dayNumber,
      ip: '127.0.0.1',
      accessedAt: new Date().toISOString(),
    });

    return json(
      {
        dayNumber,
        title: day.title || `Day ${dayNumber}`,
        contentHtml: renderMarkdown(day.sopContent ?? ''),
        watermarkText: watermarkFor(user),
      },
      200,
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }),
];

export default learningHandlers;
