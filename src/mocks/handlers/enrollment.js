import { ROLES } from '@/shared/constants';
import {
  acceptTerms,
  createEnrollmentFromQuote,
  createQuote,
  enrollmentDto,
  enrollmentsForUser,
  findEnrollment,
  getLatestTerms,
  quoteDto,
  settleOverduePendingPayments,
  termsAcceptanceDto,
  termsDto,
} from '../services';
import {
  created,
  forbidden,
  getQuery,
  json,
  mock,
  notFound,
  paginate,
  readJson,
  requireAuth,
  validationError,
} from '../utils';

/**
 * Enrollment, quotes and terms (MM8, SD5, SD6) — docs/API_CONTRACT.md "Enrollment, terms, payment".
 * Prices, discounts and expiry are decided in services.js (createQuote / createEnrollmentFromQuote),
 * which throw MockHttpError for business rules (422 ASSESSMENT_REQUIRED, 410 QUOTE_EXPIRED, …);
 * the mock.* wrapper turns those into the standard error envelope.
 */

const STUDENT_ONLY = [ROLES.STUDENT];

function readId(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export const enrollmentHandlers = [
  // Static paths before '/enrollments/:id'.
  mock.post('/enrollments/quote', async ({ request }) => {
    const auth = requireAuth(request, STUDENT_ONLY);
    if (auth.error) return auth.error;

    const body = await readJson(request);
    const planId = readId(body.planId);
    const hasTeam = body.teamId !== undefined && body.teamId !== null && body.teamId !== '';
    const teamId = readId(body.teamId);
    const details = [];
    if (!planId) details.push({ field: 'planId', message: 'Choose a plan.' });
    if (hasTeam && !teamId) details.push({ field: 'teamId', message: 'Team id is not valid.' });
    if (details.length) return validationError(details);

    const quote = createQuote({ user: auth.user, planId, teamId: teamId || null });
    return created(quoteDto(quote));
  }),

  mock.get('/enrollments', ({ request }) => {
    const auth = requireAuth(request, STUDENT_ONLY);
    if (auth.error) return auth.error;

    const status = getQuery(request).get('status');
    const mine = enrollmentsForUser(auth.user._id);
    // Mock gateway: "slow" payments settle after a delay; apply any that are due before reading.
    mine.forEach((enrollment) => settleOverduePendingPayments(enrollment._id));
    const items = mine
      .filter((enrollment) => !status || enrollment.status === status)
      .map((enrollment) => enrollmentDto(enrollment));
    return json(paginate(items, request, 50));
  }),

  mock.post('/enrollments', async ({ request }) => {
    const auth = requireAuth(request, STUDENT_ONLY);
    if (auth.error) return auth.error;

    const body = await readJson(request);
    const quoteId = readId(body.quoteId);
    if (!quoteId) {
      return validationError([{ field: 'quoteId', message: 'Get a price quote first.' }]);
    }

    const enrollment = createEnrollmentFromQuote({ user: auth.user, quoteId });
    return created(enrollmentDto(enrollment));
  }),

  mock.get('/enrollments/:id', ({ request, params }) => {
    const auth = requireAuth(request, STUDENT_ONLY);
    if (auth.error) return auth.error;

    const enrollment = findEnrollment(params.id);
    if (!enrollment) return notFound('Enrollment');
    if (enrollment.userId !== auth.user._id) {
      return forbidden('You can only view your own enrollments.');
    }
    settleOverduePendingPayments(enrollment._id);
    return json(enrollmentDto(enrollment));
  }),

  // Public: the terms page and the enrollment flow both read the latest version.
  mock.get('/terms/latest', () => {
    const terms = getLatestTerms();
    if (!terms) return notFound('Terms and conditions');
    return json(termsDto(terms));
  }),

  mock.post('/terms/accept', async ({ request }) => {
    const auth = requireAuth(request, STUDENT_ONLY);
    if (auth.error) return auth.error;

    const body = await readJson(request);
    const enrollmentId = readId(body.enrollmentId);
    const termsVersion = Number(body.termsVersion);
    const details = [];
    if (!enrollmentId) details.push({ field: 'enrollmentId', message: 'Enrollment is required.' });
    if (!Number.isInteger(termsVersion) || termsVersion < 1) {
      details.push({ field: 'termsVersion', message: 'Accept the terms to continue.' });
    }
    if (details.length) return validationError(details);

    const enrollment = findEnrollment(enrollmentId);
    if (!enrollment) return notFound('Enrollment');
    if (enrollment.userId !== auth.user._id) {
      return forbidden('You can only accept terms for your own enrollments.');
    }

    // 409 TERMS_OUTDATED when a newer version was published meanwhile.
    const acceptance = acceptTerms({ user: auth.user, enrollmentId, termsVersion });
    return created(termsAcceptanceDto(acceptance));
  }),
];

export default enrollmentHandlers;
