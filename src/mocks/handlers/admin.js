import {
  CERTIFICATE_STATUS,
  EMAIL_STATUS,
  ROLE_LIST,
  ROLES,
  USER_STATUS,
  paths,
} from '@/shared/constants';
import { db, persist } from '../db';
import {
  addAudit,
  auditDto,
  certificateDto,
  computeAdminStats,
  enrollmentDto,
  paymentDto,
  paymentEventDto,
  publicUser,
  queueEmail,
} from '../services';
import {
  applySort,
  conflict,
  getQuery,
  inDateRange,
  json,
  matchesSearch,
  mock,
  notFound,
  paginate,
  readJson,
  requireAuth,
  unprocessable,
  validationError,
} from '../utils';

/**
 * Admin operations (MM16, MM18, SD15; screens KD1, GP7, KD8, KD12, GP13). Every route is ADMIN only.
 *  GET   /admin/stats                         dashboard numbers (computeAdminStats)
 *  GET   /admin/users                         search name/email, role, status; newest first
 *  PATCH /admin/users/:id/roles               { roles } non-empty subset; never your own ADMIN → audit
 *  PATCH /admin/users/:id/status              { status: ACTIVE|SUSPENDED }; never yourself → audit
 *  GET   /admin/enrollments                   search student, status, designationId, from, to
 *  GET   /admin/enrollments/:id               + student, payments[] (+ events), trainer
 *  GET   /admin/payments                      search order id / student, status, flagged, from, to
 *  GET   /admin/payments/:id                  + events
 *  GET   /admin/certificates                  search number / student, emailStatus, status
 *  POST  /admin/certificates/:id/resend       re-queues the email (never a new certificate) → audit
 *  GET   /admin/audit-logs                    actorId, action, entityType, from, to, search; newest first
 */

const ADMIN_ONLY = [ROLES.ADMIN];
const CERTIFICATE_EMAIL_DELAY_MS = 3000;
const SUSPENDABLE_STATUSES = [USER_STATUS.ACTIVE, USER_STATUS.SUSPENDED];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const nowIso = () => new Date().toISOString();

function decodeParam(value) {
  try {
    return decodeURIComponent(String(value ?? ''));
  } catch {
    return String(value ?? '');
  }
}

function usersById() {
  return new Map(db.users.map((user) => [user._id, user]));
}

/** { _id, name, email } — the person shape every admin list uses (never password or tokens). */
function personRef(user) {
  return user ? { _id: user._id, name: user.name, email: user.email } : null;
}

/** Accepts ?status=A, ?status=A&status=B, ?status[]=A and ?status=A,B. Empty array = no filter. */
function listParam(query, name) {
  return [...query.getAll(name), ...query.getAll(`${name}[]`)]
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

/** 'true' / 'false' → boolean; missing, '' or 'all' → null (no filter). */
function boolParam(query, name) {
  const value = query.get(name);
  if (value === null || value === '' || value === 'all') return null;
  return value === 'true' || value === '1';
}

function time(iso) {
  const value = new Date(iso ?? 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

/** Filters → applySort (DataTable's ?sort=key:dir, else the default) → page → DTOs. */
function pageOf(items, request, defaultSort, toDto) {
  const sorted = applySort(items, request, defaultSort);
  const page = paginate(sorted, request, 10);
  return { ...page, items: page.items.map(toDto) };
}

// ---------------------------------------------------------------------------
// Admin DTOs (contract: docs/API_CONTRACT.md "Admin")
// ---------------------------------------------------------------------------

function adminEnrollmentDto(enrollment, users) {
  return { ...enrollmentDto(enrollment), student: personRef(users.get(enrollment.userId)) };
}

function paymentEventsFor(payment) {
  return db.paymentEvents
    .filter((event) => event.paymentId === payment._id)
    .sort((a, b) => time(a.processedAt) - time(b.processedAt))
    .map((event) => {
      const dto = paymentEventDto(event) ?? {};
      return {
        _id: event._id,
        eventId: event.eventId ?? null,
        type: event.type,
        processedAt: event.processedAt ?? null,
        note: event.note ?? event.payload?.note ?? null,
        ...dto,
      };
    });
}

/**
 * { _id, orderId, provider, amount, currency, status, gatewayReference, flagged, flagReason, createdAt,
 *   user: { _id, name, email }, enrollment: { _id, status, plan } }
 */
function adminPaymentDto(payment, users) {
  const dto = paymentDto(payment) ?? {};
  const enrollment = db.enrollments.find((item) => item._id === payment.enrollmentId);
  const user = (users ?? usersById()).get(payment.userId ?? enrollment?.userId);
  return {
    _id: payment._id,
    orderId: payment.orderId ?? null,
    provider: payment.provider ?? null,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    gatewayReference: payment.gatewayReference ?? null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt ?? null,
    ...dto,
    flagged: Boolean(payment.flagged),
    flagReason: payment.flagReason ?? null,
    user: personRef(user) ?? dto.user ?? null,
    enrollment: enrollment
      ? {
          _id: enrollment._id,
          status: enrollment.status,
          plan: dto.enrollment?.plan ?? enrollmentDto(enrollment)?.plan ?? null,
        }
      : (dto.enrollment ?? null),
  };
}

function adminCertificateDto(certificate, users) {
  return { ...certificateDto(certificate), student: personRef(users.get(certificate.userId)) };
}

function adminAuditDto(log, users) {
  const dto = auditDto(log) ?? {};
  return {
    _id: log._id,
    action: log.action,
    entityType: log.entityType ?? null,
    entityId: log.entityId ?? null,
    before: log.before ?? null,
    after: log.after ?? null,
    ip: log.ip ?? null,
    createdAt: log.createdAt,
    ...dto,
    actor: dto.actor ?? personRef(users.get(log.actorId)),
  };
}

/** The enrollment's active trainer: a direct assignment first, else the team's. */
function findActiveAssignment(enrollment) {
  const active = db.trainerAssignments.filter(
    (assignment) => assignment.active !== false && !assignment.unassignedAt,
  );
  return (
    active.find((assignment) => assignment.enrollmentId === enrollment._id) ??
    (enrollment.teamId ? active.find((assignment) => assignment.teamId === enrollment.teamId) : null) ??
    null
  );
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const adminHandlers = [
  // ----- Dashboard (KD1) -----
  mock.get('/admin/stats', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;
    return json(computeAdminStats());
  }),

  // ----- Users and roles (GP7, MM16) -----
  mock.get('/admin/users', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const query = getQuery(request);
    const search = query.get('search');
    const roles = listParam(query, 'role');
    const statuses = listParam(query, 'status');

    const filtered = db.users.filter(
      (user) =>
        matchesSearch(search, user.name, user.email) &&
        (roles.length === 0 || roles.some((role) => (user.roles ?? []).includes(role))) &&
        (statuses.length === 0 || statuses.includes(user.status)),
    );
    return json(pageOf(filtered, request, 'createdAt:desc', publicUser));
  }),

  mock.patch('/admin/users/:id/roles', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const user = db.users.find((candidate) => candidate._id === decodeParam(params.id));
    if (!user) return notFound('User');

    const body = await readJson(request);
    if (!Array.isArray(body.roles)) {
      return validationError([{ field: 'roles', message: 'Send the roles as a list.' }]);
    }
    const unknown = body.roles.filter((role) => !ROLE_LIST.includes(role));
    if (unknown.length > 0) {
      return validationError([{ field: 'roles', message: `Unknown role: ${unknown.join(', ')}.` }]);
    }
    const roles = ROLE_LIST.filter((role) => body.roles.includes(role));
    if (roles.length === 0) {
      return validationError([{ field: 'roles', message: 'Choose at least one role.' }]);
    }
    if (user._id === auth.user._id && !roles.includes(ROLES.ADMIN)) {
      const message = "You can't remove your own admin role.";
      return unprocessable('VALIDATION_ERROR', message, [{ field: 'roles', message }]);
    }

    const before = ROLE_LIST.filter((role) => (user.roles ?? []).includes(role));
    if (before.join('|') === roles.join('|')) return json(publicUser(user));

    user.roles = roles;
    user.updatedAt = nowIso();
    addAudit({
      actorId: auth.user._id,
      action: 'USER_ROLES_CHANGED',
      entityType: 'USER',
      entityId: user._id,
      before: { roles: before },
      after: { roles },
    });
    return json(publicUser(user));
  }),

  mock.patch('/admin/users/:id/status', async ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const user = db.users.find((candidate) => candidate._id === decodeParam(params.id));
    if (!user) return notFound('User');

    const { status } = await readJson(request);
    if (!SUSPENDABLE_STATUSES.includes(status)) {
      return validationError([{ field: 'status', message: 'Status must be ACTIVE or SUSPENDED.' }]);
    }
    if (user._id === auth.user._id) {
      const message = "You can't change the status of your own account.";
      return unprocessable('VALIDATION_ERROR', message, [{ field: 'status', message }]);
    }

    // Reactivating restores the normal state: an account that never verified its email goes back to
    // PENDING_VERIFICATION rather than skipping verification.
    let nextStatus = USER_STATUS.SUSPENDED;
    if (status === USER_STATUS.ACTIVE) {
      nextStatus = user.emailVerified ? USER_STATUS.ACTIVE : USER_STATUS.PENDING_VERIFICATION;
    }
    if (user.status === nextStatus) return json(publicUser(user));

    const before = { status: user.status };
    user.status = nextStatus;
    user.updatedAt = nowIso();
    addAudit({
      actorId: auth.user._id,
      action: status === USER_STATUS.SUSPENDED ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
      entityType: 'USER',
      entityId: user._id,
      before,
      after: { status: nextStatus },
    });
    return json(publicUser(user));
  }),

  // ----- Enrollments (KD8, MM18) -----
  mock.get('/admin/enrollments', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const query = getQuery(request);
    const search = query.get('search');
    const statuses = listParam(query, 'status');
    const designationId = query.get('designationId');
    const from = query.get('from');
    const to = query.get('to');
    const users = usersById();
    const plans = new Map(db.internshipPlans.map((plan) => [plan._id, plan]));
    const teams = new Map(db.teams.map((team) => [team._id, team]));

    const filtered = db.enrollments.filter((enrollment) => {
      if (statuses.length > 0 && !statuses.includes(enrollment.status)) return false;
      if (designationId && plans.get(enrollment.planId)?.designationId !== designationId) return false;
      if ((from || to) && !inDateRange(enrollment.createdAt, from, to)) return false;
      if (search) {
        const student = users.get(enrollment.userId);
        const team = enrollment.teamId ? teams.get(enrollment.teamId) : null;
        if (!matchesSearch(search, student?.name, student?.email, team?.name, enrollment._id)) return false;
      }
      return true;
    });
    return json(
      pageOf(filtered, request, 'createdAt:desc', (enrollment) => adminEnrollmentDto(enrollment, users)),
    );
  }),

  mock.get('/admin/enrollments/:id', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const enrollment = db.enrollments.find((item) => item._id === decodeParam(params.id));
    if (!enrollment) return notFound('Enrollment');

    const users = usersById();
    const payments = db.payments
      .filter((payment) => payment.enrollmentId === enrollment._id)
      .sort((a, b) => time(b.createdAt) - time(a.createdAt))
      .map((payment) => ({ ...adminPaymentDto(payment, users), events: paymentEventsFor(payment) }));
    const assignment = findActiveAssignment(enrollment);

    return json({
      ...adminEnrollmentDto(enrollment, users),
      payments,
      trainer: assignment ? personRef(users.get(assignment.trainerId)) : null,
    });
  }),

  // ----- Payments (KD8, MM18) -----
  mock.get('/admin/payments', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const query = getQuery(request);
    const search = query.get('search');
    const statuses = listParam(query, 'status');
    const flagged = boolParam(query, 'flagged');
    const from = query.get('from');
    const to = query.get('to');
    const users = usersById();

    const filtered = db.payments.filter((payment) => {
      if (statuses.length > 0 && !statuses.includes(payment.status)) return false;
      if (flagged !== null && Boolean(payment.flagged) !== flagged) return false;
      if ((from || to) && !inDateRange(payment.createdAt, from, to)) return false;
      if (search) {
        const student = users.get(payment.userId);
        if (
          !matchesSearch(
            search,
            payment.orderId,
            payment.gatewayReference,
            payment._id,
            student?.name,
            student?.email,
          )
        ) {
          return false;
        }
      }
      return true;
    });
    return json(pageOf(filtered, request, 'createdAt:desc', (payment) => adminPaymentDto(payment, users)));
  }),

  mock.get('/admin/payments/:id', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const payment = db.payments.find((item) => item._id === decodeParam(params.id));
    if (!payment) return notFound('Payment');
    return json({ ...adminPaymentDto(payment), events: paymentEventsFor(payment) });
  }),

  // ----- Certificates (KD12, SD15) -----
  mock.get('/admin/certificates', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const query = getQuery(request);
    const search = query.get('search');
    const emailStatuses = listParam(query, 'emailStatus');
    const statuses = listParam(query, 'status');
    const users = usersById();

    const filtered = db.certificates.filter((certificate) => {
      if (emailStatuses.length > 0 && !emailStatuses.includes(certificate.emailStatus)) return false;
      if (statuses.length > 0 && !statuses.includes(certificate.status)) return false;
      if (search) {
        const student = users.get(certificate.userId);
        if (!matchesSearch(search, certificate.certificateNo, student?.name, student?.email)) return false;
      }
      return true;
    });
    return json(
      pageOf(filtered, request, 'issuedAt:desc', (certificate) => adminCertificateDto(certificate, users)),
    );
  }),

  mock.post('/admin/certificates/:id/resend', ({ request, params }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const key = decodeParam(params.id);
    const certificate = db.certificates.find(
      (item) => item._id === key || String(item.certificateNo).toUpperCase() === key.toUpperCase(),
    );
    if (!certificate) return notFound('Certificate');
    if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
      return conflict('INVALID_TRANSITION', 'This certificate has been revoked, so it cannot be emailed.');
    }
    const student = db.users.find((user) => user._id === certificate.userId);
    if (!student) return notFound('Student');

    const before = { emailStatus: certificate.emailStatus ?? null };
    certificate.emailStatus = EMAIL_STATUS.PENDING;
    const job = queueEmail({
      to: student.email,
      template: 'certificate',
      subject: `Your internship certificate ${certificate.certificateNo}`,
      link: paths.verifyCertificate(certificate.certificateNo),
      payload: { name: student.name, certificateNo: certificate.certificateNo, resent: true },
    });
    addAudit({
      actorId: auth.user._id,
      action: 'CERTIFICATE_EMAIL_RESENT',
      entityType: 'CERTIFICATE',
      entityId: certificate._id,
      before,
      after: { emailStatus: EMAIL_STATUS.PENDING },
    });

    // The mock "mail provider" confirms delivery a few seconds later.
    setTimeout(() => {
      if (certificate.emailStatus === EMAIL_STATUS.PENDING) certificate.emailStatus = EMAIL_STATUS.SENT;
      if (job && typeof job === 'object' && job.status !== 'SENT') {
        job.status = 'SENT';
        job.sentAt = nowIso();
      }
      persist();
    }, CERTIFICATE_EMAIL_DELAY_MS);

    return json({ message: 'Certificate email queued.', emailStatus: EMAIL_STATUS.PENDING });
  }),

  // ----- Audit log (GP13, append-only) -----
  mock.get('/admin/audit-logs', ({ request }) => {
    const auth = requireAuth(request, ADMIN_ONLY);
    if (auth.error) return auth.error;

    const query = getQuery(request);
    const search = query.get('search');
    const actorIds = listParam(query, 'actorId');
    const actions = listParam(query, 'action');
    const entityTypes = listParam(query, 'entityType');
    const from = query.get('from');
    const to = query.get('to');
    const users = usersById();

    const filtered = db.auditLogs.filter((log) => {
      if (actorIds.length > 0 && !actorIds.includes(log.actorId)) return false;
      if (actions.length > 0 && !actions.includes(log.action)) return false;
      if (entityTypes.length > 0 && !entityTypes.includes(log.entityType)) return false;
      if ((from || to) && !inDateRange(log.createdAt, from, to)) return false;
      if (search) {
        const actor = users.get(log.actorId);
        const readableAction = String(log.action ?? '').replace(/_/g, ' ');
        if (
          !matchesSearch(
            search,
            log.action,
            readableAction,
            log.entityType,
            log.entityId,
            actor?.name,
            actor?.email,
          )
        ) {
          return false;
        }
      }
      return true;
    });
    return json(pageOf(filtered, request, 'createdAt:desc', (log) => adminAuditDto(log, users)));
  }),
];

export default adminHandlers;
