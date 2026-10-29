# API Contract (frontend ⇄ backend)

This is the contract the frontend is built against. The mock server (`src/mocks`, MSW) implements it
exactly, so the backend team can treat this file as the agreed response shapes (ticket GP1:
"the team agrees the endpoints and response shapes on Day 1 to 2"). Anything marked
**(frontend addition)** is not spelled out in the Jira tickets but is required by a screen; please
confirm it with the backend owner.

## Conventions

- Base path: `VITE_API_URL` (default `/api/v1`). JSON in and out, except `multipart/form-data` uploads.
- Auth: `Authorization: Bearer <accessToken>`. Access token lives **in memory only**. Refresh token is
  an httpOnly cookie, so every request is sent with `withCredentials: true`.
- Success responses are the plain resource (no wrapper). The client also tolerates `{ success: true, data }`.
- Errors: `{ success: false, error: { code, message, details: [{ field, message }] } }`.
- Lists: `{ items: [], page, limit, total }`. Query params: `page` (1-based), `limit`, `search`, filters.
- IDs are MongoDB ObjectIds exposed as `_id` (24-hex strings).
- Dates are ISO-8601 UTC strings. Money is an **integer in paise**, currency `INR`.
- Enum values are UPPER_CASE. Roles: `STUDENT`, `TRAINER`, `ADMIN`.

### Common error codes

| HTTP | code | meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` / `TOKEN_INVALID` / `TOKEN_EXPIRED` | bad input / bad token |
| 401 | `UNAUTHENTICATED` / `INVALID_CREDENTIALS` / `TOKEN_EXPIRED` | not logged in / wrong login |
| 403 | `FORBIDDEN` / `ACCOUNT_SUSPENDED` / `EMAIL_NOT_VERIFIED` / `ENROLLMENT_NOT_ACTIVE` / `TASK_LOCKED` | not allowed |
| 404 | `NOT_FOUND` | missing resource |
| 409 | `EMAIL_TAKEN` / `ALREADY_ATTEMPTED` / `DUPLICATE_PLAN` / `INVALID_TRANSITION` / `ALREADY_REVIEWED` / `TEMPLATE_PUBLISHED` / `DUPLICATE_INVITE` | conflict |
| 410 | `QUOTE_EXPIRED` / `INVITE_EXPIRED` | expired |
| 422 | `VALIDATION_ERROR` / `ASSESSMENT_REQUIRED` / `TERMS_NOT_ACCEPTED` / `TEAM_FULL` / `CIRCULAR_PREREQUISITE` / `CHECKS_FAILED` | business rule failed |
| 429 | `RATE_LIMITED` | too many attempts |

## Shared shapes

```text
User            { _id, name, email, roles[], status: PENDING_VERIFICATION|ACTIVE|SUSPENDED, emailVerified, createdAt, updatedAt }
DesignationRef  { _id, name, slug }
DomainRef       { _id, name, slug }
Designation     { _id, name, slug, description, status: DRAFT|PUBLISHED, createdAt, updatedAt }
Domain          (same shape as Designation)
Plan            { _id, designationId, domainId, durationMonths: 1|2|3|4|6, basePrice, currency, status: DRAFT|PUBLISHED,
                  designation: DesignationRef, domain: DomainRef, createdAt, updatedAt }
PlanRef         { _id, durationMonths, basePrice, currency, designation: DesignationRef, domain: DomainRef }
Attempt         { _id, designationId, configVersion, score, totalQuestions, discountPercent, submittedAt }
Quote           { quoteId, planId, enrollmentType: INDIVIDUAL|TEAM, teamId, attemptId, score, basePrice,
                  discountPercent, payableAmount, currency, expiresAt, createdAt }
PriceSnapshot   { basePrice, discountPercent, payableAmount, currency }
Enrollment      { _id, userId, teamId, team: {_id,name}|null, planId, plan: PlanRef, quoteId, enrollmentType,
                  scheduleTemplateId, scheduleVersion, priceSnapshot, status, paymentStatus, termsAcceptedVersion,
                  progress: { approved, total }, certificateId, createdAt, activatedAt, completedAt }
                  status: PENDING_PAYMENT|ACTIVE|IN_PROGRESS|COMPLETED|CANCELLED|SUSPENDED
                  paymentStatus: null|CREATED|PENDING|SUCCESS|FAILED|REFUND_PENDING|REFUNDED  (separate state machine)
TaskSummary     { _id, title, sequence, estimatedHours, requiresTrainerReview, prerequisiteTaskIds[] }
TaskProgress    { _id, enrollmentId, teamId, taskId, status, startedAt, submittedAt, approvedAt, attempts,
                  lastReviewStatus, task: TaskSummary, prerequisites: [{ taskId, progressId, title, status }] }
                  status: LOCKED|AVAILABLE|IN_PROGRESS|SUBMITTED|CHANGES_REQUESTED|APPROVED
Review          { _id, decision: APPROVED|CHANGES_REQUESTED|REJECTED, feedback, reviewedAt, trainer: {_id,name} }
Submission      { _id, taskProgressId, enrollmentId, attemptNumber, description, githubUrl, submittedAt,
                  screenshots: [{ storageKey, name, mimeType, sizeBytes, url }], submittedBy: {_id,name},
                  reviewStatus: PENDING|APPROVED|CHANGES_REQUESTED|REJECTED, review: Review|null }
TeamMember      { _id, teamId, userId, name, email, status: INVITED|JOINED|DECLINED|REMOVED, isLeader,
                  invitedAt, joinedAt, inviteExpiresAt }
Team            { _id, name, leaderId, leader: {_id,name,email}, planId, plan: PlanRef, repoUrl,
                  status: FORMING|READY|ACTIVE|DISBANDED, members: TeamMember[], createdAt }
Certificate     { _id, certificateNo, userId, enrollmentId, status: ISSUED|REVOKED, issuedAt, emailStatus: PENDING|SENT|FAILED,
                  revokedAt, revokeReason, studentName, designation: DesignationRef, domain: DomainRef, durationMonths, verifyUrl }
```

## Auth (MM2, MM3, SD3)

| Method | Path | Body / query | Response |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ name, email, password }` | `201 { user }` · 409 `EMAIL_TAKEN` (details field `email`) · 422 |
| POST | `/auth/login` | `{ email, password }` | `{ accessToken, user }` + refresh cookie · 401 `INVALID_CREDENTIALS` · 403 `ACCOUNT_SUSPENDED` · 429 |
| POST | `/auth/refresh` | – (cookie) | `{ accessToken, user }` · 401 |
| POST | `/auth/logout` | – | `204` |
| GET | `/auth/me` | – | `User` |
| PATCH | `/auth/me` | `{ name }` | `User` |
| POST | `/auth/verify-email` | `{ token }` | `{ message }` · 400 `TOKEN_EXPIRED` / `TOKEN_INVALID` |
| POST | `/auth/resend-verification` | `{ email }` | `{ message }` |
| POST | `/auth/forgot-password` | `{ email }` | `{ message }` (always the same) |
| POST | `/auth/reset-password` | `{ token, password }` | `{ message }` · 400 `TOKEN_EXPIRED` / `TOKEN_INVALID` |

## Catalog (MM4, MM5, MM9) — public

| Method | Path | Query | Response |
| --- | --- | --- | --- |
| GET | `/designations` | `search, page, limit` | list of `Designation` (published only) |
| GET | `/designations/:idOrSlug` | – | `Designation` (accepts id **or slug**) · 404 |
| GET | `/domains` | `page, limit` | list of `Domain` (published only) |
| GET | `/internship-plans` | `designationId?, domainId?, durationMonths?, page, limit` | list of `Plan` (published only) |
| GET | `/internship-plans/:id/schedule-preview` | – | `{ planId, totalDays, days: [{ dayNumber, title }] }` (titles only, never SOP) |

## Assessment (MM7) — student

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/assessments/:designationId` | – | `{ designation: DesignationRef, configVersion, totalQuestions, questions: [{ _id, text, options[4] }] }` (no answer keys) · 409 `ALREADY_ATTEMPTED` |
| POST | `/assessments/:designationId/submit` | `{ answers: [{ questionId, selectedIndex }] }` | `201 Attempt` · 409 `ALREADY_ATTEMPTED`. Score is computed on the server; unanswered = wrong |
| GET | `/assessments/:designationId/attempt` **(frontend addition)** | – | `Attempt` · 404 when none |
| GET | `/assessments/attempts/mine` **(frontend addition)** | – | list of `Attempt & { designation: DesignationRef }` |

There is no pass mark: every score 0–15 can continue to enrollment.

## Enrollment, terms, payment (MM8, SD5–SD8)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/enrollments/quote` | `{ planId, teamId? }` | `Quote` · 422 `ASSESSMENT_REQUIRED`. Team quotes always have `discountPercent: 0` |
| POST | `/enrollments` | `{ quoteId }` | `201 Enrollment` (`PENDING_PAYMENT`) · 410 `QUOTE_EXPIRED` |
| GET | `/enrollments` | – | list of my `Enrollment` |
| GET | `/enrollments/:id` | – | `Enrollment` (owner only) |
| GET | `/terms/latest` | – | `{ version, content (markdown), publishedAt }` |
| POST | `/terms/accept` | `{ enrollmentId, termsVersion }` | `201 { _id, enrollmentId, termsVersion, acceptedAt }` |
| POST | `/payments/orders` | `{ enrollmentId }` | `201 { paymentId, orderId, provider, amount, currency, status, checkoutData }` · 422 `TERMS_NOT_ACCEPTED` · 403 `EMAIL_NOT_VERIFIED` |
| POST | `/payments/webhooks/:provider` | signed gateway event | `200` (server-to-server only) |
| POST | `/payments/mock/complete` **(mock gateway only)** | `{ orderId, outcome: success|failure|pending }` | `{ status }` — simulates the signed webhook |

Amounts always come from the server. The browser redirect after checkout is never treated as proof of
payment: `/payment/status` polls `GET /enrollments/:id` until `status` is `ACTIVE` or `paymentStatus` is `FAILED`.

## Learning (MM9–MM12, MM15, SD12)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| GET | `/enrollments/:id/schedule` | – | `{ enrollmentId, scheduleTemplateId, version, totalDays, days: [{ dayNumber, title, activity, requiredEvidence, hasSop, task: { progressId, title, status }|null, completed }] }` · 403 `ENROLLMENT_NOT_ACTIVE` |
| GET | `/enrollments/:id/schedule/days/:dayNumber/sop` | – | `{ dayNumber, title, contentHtml, watermarkText }` (sanitised, `Cache-Control: no-store`) · 403 |
| GET | `/enrollments/:id/tasks` | – | list of `TaskProgress` (ordered by `task.sequence`) |
| GET | `/tasks/:progressId/content` | – | `{ locked, progress: TaskProgress, task: { _id, title, sequence, estimatedHours, requiresTrainerReview, problemStatement?, expectedOutcome?, acceptanceCriteria?, starterRepoUrl? }, enrollment: { _id, enrollmentType, teamId }, team: { _id, name, repoUrl }|null }` — locked tasks omit the instruction fields |
| POST | `/tasks/:progressId/start` | – | `TaskProgress` (`IN_PROGRESS`) · 409 `INVALID_TRANSITION` |
| POST | `/tasks/:progressId/submissions` | multipart: `screenshots` (1–5 files), `description` (≥ 50 chars), `githubUrl` (`https://github.com/…`) | `201 Submission` · 422 with field `details` |
| GET | `/tasks/:progressId/submissions` | – | list of `Submission`, newest first |

Task URLs use the **task-progress id** (`TaskProgress._id`), so ownership is checked from the progress record.

## Teams (SD10–SD12)

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| POST | `/teams` | `{ name, planId }` | `201 Team` |
| GET | `/teams/mine` **(frontend addition)** | – | list of `Team` I lead or joined |
| GET | `/teams/:id` | – | `Team` · 403 for non-members |
| POST | `/teams/:id/invites` | `{ emails: [] }` | `201 { items: TeamMember[] }` · 422 `TEAM_FULL` (max 5 incl. leader) · 409 `DUPLICATE_INVITE` |
| POST | `/teams/:id/invites/:inviteId/resend` **(frontend addition)** | – | `TeamMember` |
| DELETE | `/teams/:id/invites/:inviteId` | – | `204` |
| GET | `/teams/invites/:token` **(frontend addition)** | – | `{ token, email, status, expiresAt, expired, team: { _id, name, leader: { name }, plan: PlanRef, membersCount } }` |
| POST | `/teams/invites/:token/accept` | – | `Team` · 410 `INVITE_EXPIRED` · 403 `FORBIDDEN` (email mismatch) |
| POST | `/teams/invites/:token/decline` | – | `{ message }` |
| GET | `/teams/:id/readiness` | – | `{ teamId, status, ready, members: [{ memberId, userId, name, email, isLeader, status, joined, assessed, paid }] }` |
| PUT | `/teams/:id/repo` | `{ repoUrl }` | `Team` (leader only) |
| GET | `/teams/:id/progress` | – | `{ teamId, tasks: TaskProgress[], contributions: [{ userId, name, submissions, lastSubmittedAt }] }` |

## GitHub (SD9)

| Method | Path | Response |
| --- | --- | --- |
| POST | `/github/connect` | `{ authorizationUrl, state }` |
| GET | `/github/callback?code&state` | `{ connected: true, githubUsername }` (real backend redirects to `/github/callback?status=connected`) |
| GET | `/github/connection` | `{ connected, githubUsername, scopes[], connectedAt }` (never a token) |
| DELETE | `/github/connection` | `204` |

## Certificates (SD13–SD15)

| Method | Path | Response |
| --- | --- | --- |
| GET | `/certificates/mine` | list of `Certificate` |
| GET | `/certificates/:id/download` | `{ url, expiresAt }` short-lived signed URL (owner only) |
| GET | `/certificates/:certificateNo/verify` | public, minimal: `{ certificateNo, status, designation, domain, durationMonths, issuedAt, revokedAt }` · 404 |

## Admin (MM4–MM6, MM9, MM10, MM13, MM16, MM18, SD15) — role ADMIN

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/stats` | `{ users: {total, students, trainers, admins, suspended}, enrollments: {total, pendingPayment, active, inProgress, completed, cancelled}, revenue: {total, last30Days, currency}, payments: {success, failed, pending, flagged}, certificates: {issued, revoked, emailFailed}, submissions: {pending}, revenueByMonth: [{month:'YYYY-MM', amount}], enrollmentsByDesignation: [{designation, count}] }` |
| GET | `/admin/users` | `search, role, status, page, limit` → list of `User` |
| PATCH | `/admin/users/:id/roles` | `{ roles[] }` → `User` |
| PATCH | `/admin/users/:id/status` | `{ status: ACTIVE|SUSPENDED }` → `User` |
| GET/POST | `/admin/designations` | list (`search, status`) / create `{ name, description }` (DRAFT) |
| PUT | `/admin/designations/:id` | `{ name, description }` |
| PATCH | `/admin/designations/:id/status` | `{ status: PUBLISHED|DRAFT }` (no hard delete) |
| GET/POST/PUT/PATCH | `/admin/domains…` | same as designations |
| GET/POST | `/admin/internship-plans` | list (`designationId, domainId, status`) / create `{ designationId, domainId, durationMonths, basePrice, status? }` · 409 `DUPLICATE_PLAN` |
| PUT | `/admin/internship-plans/:id` | `{ basePrice, durationMonths?, domainId? }` (applies to new quotes only) |
| PATCH | `/admin/internship-plans/:id/status` | `{ status }` |
| GET | `/admin/assessments` | list of `{ designationId, designation, configId, version, status, questionCount, publishedVersion, updatedAt }` |
| GET | `/admin/assessments/:designationId` | `{ _id, designationId, designation, version, status, publishedVersion, questions: [{ _id, text, options[4], correctIndex, marks }], discountSlabs: [{ minScore, maxScore, discountPercent }], updatedAt }` · 404 when none yet |
| PUT | `/admin/assessments/:designationId` | `{ questions, discountSlabs }` → saved DRAFT |
| PATCH | `/admin/assessments/:designationId/publish` | publishes a new version · 422 unless 15 questions and slabs cover 0–15 without overlap |
| GET/POST | `/admin/schedules` | list (`designationId, domainId, durationMonths, status`) of `{ _id, designation, domain, durationMonths, version, status, daysCount, tasksCount, updatedAt, publishedAt }` / create `{ designationId, domainId, durationMonths, days[] }` |
| GET/PUT | `/admin/schedules/:id` | template with `days: [{ dayNumber, title, activity, sopContent, requiredEvidence }]` / update days (409 `TEMPLATE_PUBLISHED` if published) |
| PATCH | `/admin/schedules/:id/publish` | locks it as the next version |
| GET | `/admin/schedules/:id/versions` **(frontend addition)** | all versions for the same designation/domain/duration |
| POST | `/admin/schedules/:id/clone` **(frontend addition)** | new DRAFT copied from this version (tasks copied too) |
| GET | `/admin/schedules/:id/tasks` | list of task definitions |
| POST/PUT/DELETE | `/admin/tasks`, `/admin/tasks/:id` | `{ templateId, title, problemStatement, expectedOutcome, acceptanceCriteria[], starterRepoUrl, prerequisiteTaskIds[], requiresTrainerReview, estimatedHours, sequence }` · 422 `CIRCULAR_PREREQUISITE` · 409 `TEMPLATE_PUBLISHED` |
| PATCH | `/admin/schedules/:id/tasks/reorder` **(frontend addition)** | `{ orderedIds[] }` |
| GET | `/admin/enrollments` | `search, status, designationId, from, to` → list of `Enrollment & { student: {_id,name,email} }` |
| GET | `/admin/enrollments/:id` | enrollment + `student` + `payments: [Payment & { events[] }]` + `trainer` |
| GET | `/admin/payments` | `search, status, from, to` → list of `{ _id, orderId, provider, amount, currency, status, gatewayReference, flagged, flagReason, createdAt, user, enrollment: { _id, status, plan } }` |
| GET | `/admin/payments/:id` | payment + `events: [{ _id, eventId, type, processedAt, note }]` |
| GET | `/admin/teams` **(frontend addition)** | `search` → list of `{ _id, name, status, leader, membersCount, plan }` |
| GET/POST | `/admin/trainer-assignments` | list (`search, active`) / create `{ trainerId, enrollmentId? , teamId? }` (previous active assignment is closed, history kept) |
| DELETE | `/admin/trainer-assignments/:id` | unassign (sets `active:false`) |
| GET | `/admin/certificates` | `search, emailStatus, status` → list of `Certificate` |
| POST | `/admin/certificates/:id/resend` | `{ message, emailStatus: 'PENDING' }` (never a new certificate) |
| GET | `/admin/audit-logs` | `actorId, action, entityType, from, to` → list of `{ _id, actor: {_id,name,email}, action, entityType, entityId, before, after, ip, createdAt }` |

## Trainer (MM13, MM14) — role TRAINER

| Method | Path | Response |
| --- | --- | --- |
| GET | `/trainer/stats` **(frontend addition)** | `{ pending, changesRequested, reviewedToday, assignedStudents, assignedTeams }` |
| GET | `/trainer/assignments` | list of `{ _id, type: INDIVIDUAL|TEAM, enrollmentId, teamId, student, team, plan, approvedTasks, totalTasks, pendingSubmissions, lastActivityAt }` |
| GET | `/trainer/submissions` | `status, page, limit` → oldest first: `{ _id, attemptNumber, submittedAt, reviewStatus, submittedBy, student, team, task: { _id, title, sequence }, enrollmentId, taskProgressId }` |
| GET | `/trainer/submissions/:id` | `Submission` + `task` (with acceptance criteria) + `student`/`team` + `plan` + `previousAttempts[]` + `automatedChecks: [{ name, status: PASSED|FAILED|PENDING, required }]` + `nextPendingId` · 403 if not assigned |
| POST | `/trainer/submissions/:id/review` | `{ decision, feedback }` → `{ review, submission, nextPendingId }` · 422 feedback required unless APPROVED · 422 `CHECKS_FAILED` · 409 `ALREADY_REVIEWED` |
