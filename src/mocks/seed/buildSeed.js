import {
  DEMO_ACCOUNTS,
  DEMO_CERTIFICATES,
  DEMO_PASSWORD,
  SUSPENDED_ACCOUNT,
} from '../demoAccounts';
import {
  BASE_PRICE_BY_DURATION,
  DESIGNATIONS,
  DOMAINS,
  PLAN_MATRIX,
  PRICE_ADJUSTMENT_BY_DESIGNATION,
} from './content/catalog';
import { QUESTION_BANK } from './content/questions';
import { SCHEDULE_TEMPLATES } from './content/schedules';
import { TASK_TEMPLATES } from './content/tasks';
import { TERMS_VERSIONS } from './content/terms';
import { EXTRA_STUDENTS, EXTRA_TRAINERS } from './content/people';
import { REVIEW_FEEDBACK, SUBMISSION_DESCRIPTIONS } from './content/feedback';
import {
  COLLECTIONS,
  DEFAULT_SLABS,
  addDays,
  addHours,
  addMinutes,
  computePayable,
  createIdFactory,
  daysAgo,
  daysFromNow,
  discountForScore,
  hoursAgo,
  hoursFromNow,
  placeholderScreenshot,
} from './helpers';

/**
 * Builds the complete demo database (ticket GP1). Deterministic ids, every foreign key valid,
 * and statuses consistent with the business rules (a task is LOCKED unless all of its
 * prerequisites are APPROVED; prices = computePayable(base, discount); one certificate per
 * completed enrollment). Must not import ../services or ../utils.
 */
export function buildSeed() {
  const nextId = createIdFactory('internship-portal-seed');
  const data = {};
  for (const name of COLLECTIONS) data[name] = [];

  // ---------------------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------------------
  const userByEmail = {};

  function makeUser({ name, email, roles, status = 'ACTIVE', emailVerified = true, createdAt }) {
    const created = createdAt ?? daysAgo(150);
    const user = {
      _id: nextId(),
      name,
      email: email.toLowerCase(),
      password: DEMO_PASSWORD,
      roles,
      status,
      emailVerified,
      createdAt: created,
      updatedAt: created,
    };
    data.users.push(user);
    userByEmail[user.email] = user;
    return user;
  }

  DEMO_ACCOUNTS.forEach((account, index) => {
    const unverified = account.key === 'unverified';
    makeUser({
      name: account.name,
      email: account.email,
      roles: [account.role],
      status: unverified ? 'PENDING_VERIFICATION' : 'ACTIVE',
      emailVerified: !unverified,
      createdAt: account.key === 'admin' ? daysAgo(400) : daysAgo(200 - index * 12),
    });
  });
  makeUser({
    name: SUSPENDED_ACCOUNT.name,
    email: SUSPENDED_ACCOUNT.email,
    roles: [SUSPENDED_ACCOUNT.role],
    status: 'SUSPENDED',
    createdAt: daysAgo(90),
  });
  EXTRA_TRAINERS.forEach((trainer, index) =>
    makeUser({ name: trainer.name, email: trainer.email, roles: ['TRAINER'], createdAt: daysAgo(300 - index * 20) }),
  );
  const UNVERIFIED_EXTRAS = new Set(['farhan.qureshi@example.com', 'gauri.deshmukh@example.com']);
  EXTRA_STUDENTS.forEach((student, index) => {
    const unverified = UNVERIFIED_EXTRAS.has(student.email);
    makeUser({
      name: student.name,
      email: student.email,
      roles: ['STUDENT'],
      status: unverified ? 'PENDING_VERIFICATION' : 'ACTIVE',
      emailVerified: !unverified,
      createdAt: daysAgo(180 - index * 7),
    });
  });

  const user = (email) => {
    const found = userByEmail[email];
    if (!found) throw new Error(`[seed] unknown user ${email}`);
    return found;
  };

  const admin = user('admin@demo.dev');
  const priya = user('trainer@demo.dev');
  const arjun = user('arjun.rao@demo.dev');
  const neha = user('neha.kulkarni@demo.dev');
  const TRAINERS = { priya, arjun, neha };

  // ---------------------------------------------------------------------------------------
  // Catalog: designations, domains, plans
  // ---------------------------------------------------------------------------------------
  const designationBySlug = {};
  DESIGNATIONS.forEach((item, index) => {
    const doc = {
      _id: nextId(),
      name: item.name,
      slug: item.slug,
      description: item.description,
      status: item.status,
      createdBy: admin._id,
      updatedBy: admin._id,
      createdAt: daysAgo(240 - index * 5),
      updatedAt: daysAgo(item.status === 'DRAFT' ? 58 : 150 - index * 3),
    };
    data.designations.push(doc);
    designationBySlug[item.slug] = doc;
  });

  const domainBySlug = {};
  DOMAINS.forEach((item, index) => {
    const doc = {
      _id: nextId(),
      name: item.name,
      slug: item.slug,
      description: item.description,
      status: item.status,
      createdBy: admin._id,
      updatedBy: admin._id,
      createdAt: daysAgo(235 - index * 5),
      updatedAt: daysAgo(item.status === 'DRAFT' ? 55 : 140 - index * 3),
    };
    data.domains.push(doc);
    domainBySlug[item.slug] = doc;
  });

  const planByKey = {};
  PLAN_MATRIX.forEach((entry) => {
    const designation = designationBySlug[entry.designation];
    if (!designation) return;
    entry.domains.forEach((domainSlug) => {
      const domain = domainBySlug[domainSlug];
      if (!domain) return;
      [1, 2, 3, 4, 6].forEach((months) => {
        const plan = {
          _id: nextId(),
          designationId: designation._id,
          domainId: domain._id,
          durationMonths: months,
          basePrice:
            BASE_PRICE_BY_DURATION[months] + (PRICE_ADJUSTMENT_BY_DESIGNATION[entry.designation] ?? 0),
          currency: 'INR',
          status: entry.status,
          createdBy: admin._id,
          updatedBy: admin._id,
          createdAt: daysAgo(200),
          updatedAt: daysAgo(60),
        };
        data.internshipPlans.push(plan);
        planByKey[`${entry.designation}|${domainSlug}|${months}`] = plan;
      });
    });
  });

  const planFor = (designationSlug, domainSlug, months) => {
    const plan = planByKey[`${designationSlug}|${domainSlug}|${months}`];
    if (!plan) throw new Error(`[seed] no plan ${designationSlug}/${domainSlug}/${months}`);
    return plan;
  };

  // ---------------------------------------------------------------------------------------
  // Assessment configs (15 questions + slabs per designation)
  // ---------------------------------------------------------------------------------------
  const publishedConfigBySlug = {};
  Object.entries(QUESTION_BANK).forEach(([slug, questions]) => {
    const designation = designationBySlug[slug];
    if (!designation) return;
    const published = designation.status === 'PUBLISHED';
    const config = {
      _id: nextId(),
      designationId: designation._id,
      version: 1,
      status: published ? 'PUBLISHED' : 'DRAFT',
      questions: questions.map((question) => ({
        _id: nextId(),
        text: question.text,
        options: [...question.options],
        correctIndex: question.correctIndex,
        marks: 1,
      })),
      discountSlabs: DEFAULT_SLABS.map((slab) => ({ ...slab })),
      createdBy: admin._id,
      createdAt: daysAgo(130),
      updatedAt: daysAgo(120),
      publishedAt: published ? daysAgo(120) : null,
    };
    data.assessmentConfigs.push(config);
    if (published) publishedConfigBySlug[slug] = config;
  });

  // Java gets a draft v2 so the admin builder shows "Draft v2 · Published v1".
  const javaV1Config = publishedConfigBySlug['java-developer'];
  if (javaV1Config) {
    data.assessmentConfigs.push({
      ...javaV1Config,
      _id: nextId(),
      version: 2,
      status: 'DRAFT',
      questions: javaV1Config.questions.map((question, index) =>
        index === 2
          ? { ...question, _id: nextId(), text: `${question.text.replace(/\?$/, '')} (choose the best answer)?` }
          : { ...question, options: [...question.options] },
      ),
      discountSlabs: DEFAULT_SLABS.map((slab) => ({ ...slab })),
      createdAt: daysAgo(12),
      updatedAt: daysAgo(12),
      publishedAt: null,
    });
  }

  // ---------------------------------------------------------------------------------------
  // Terms
  // ---------------------------------------------------------------------------------------
  TERMS_VERSIONS.forEach((terms) => {
    data.termsVersions.push({
      _id: nextId(),
      version: terms.version,
      content: terms.content,
      publishedAt: daysAgo(terms.daysAgo),
    });
  });
  const latestTermsVersion = Math.max(...TERMS_VERSIONS.map((terms) => terms.version));

  // ---------------------------------------------------------------------------------------
  // Schedule templates + task definitions (each template version owns its tasks)
  // ---------------------------------------------------------------------------------------
  function makeTemplate(spec, { version, status, days, createdAt, publishedAt }) {
    const template = {
      _id: nextId(),
      designationId: designationBySlug[spec.designation]._id,
      domainId: domainBySlug[spec.domain]._id,
      durationMonths: spec.durationMonths,
      version,
      status,
      days: days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        activity: day.activity,
        sopContent: day.sopContent,
        requiredEvidence: day.requiredEvidence,
      })),
      createdBy: admin._id,
      createdAt,
      updatedAt: publishedAt ?? createdAt,
      publishedAt: publishedAt ?? null,
    };
    data.scheduleTemplates.push(template);

    const dayNumbers = new Set(template.days.map((day) => day.dayNumber));
    const specs = (TASK_TEMPLATES[spec.key] ?? []).filter((task) => dayNumbers.has(task.dayNumber));
    const idByKey = {};
    specs.forEach((task) => {
      idByKey[task.key] = nextId();
    });
    const tasks = specs.map((task, index) => ({
      _id: idByKey[task.key],
      templateId: template._id,
      templateVersion: version,
      sequence: index + 1,
      dayNumber: task.dayNumber,
      title: task.title,
      problemStatement: task.problemStatement,
      expectedOutcome: task.expectedOutcome,
      acceptanceCriteria: [...task.acceptanceCriteria],
      starterRepoUrl: task.starterRepoUrl,
      prerequisiteTaskIds: task.prerequisiteKeys.filter((key) => idByKey[key]).map((key) => idByKey[key]),
      requiresTrainerReview: task.requiresTrainerReview,
      estimatedHours: task.estimatedHours,
      createdBy: admin._id,
      createdAt,
      updatedAt: template.updatedAt,
    }));
    data.taskDefinitions.push(...tasks);
    const keyById = Object.fromEntries(specs.map((task) => [idByKey[task.key], task.key]));
    return { template, tasks, keyById };
  }

  const bundleByDesignation = {};
  SCHEDULE_TEMPLATES.forEach((spec) => {
    if (!designationBySlug[spec.designation] || !domainBySlug[spec.domain]) return;
    if (spec.key === 'java-banking') {
      makeTemplate(spec, {
        version: 1,
        status: 'ARCHIVED',
        days: spec.days.filter((day) => day.dayNumber <= 12),
        createdAt: daysAgo(160),
        publishedAt: daysAgo(150),
      });
      bundleByDesignation[spec.designation] = makeTemplate(spec, {
        version: 2,
        status: 'PUBLISHED',
        days: spec.days,
        createdAt: daysAgo(95),
        publishedAt: daysAgo(90),
      });
      makeTemplate(spec, {
        version: 3,
        status: 'DRAFT',
        days: spec.days.map((day) =>
          day.dayNumber === 14 ? { ...day, title: 'Final review, demo and retrospective' } : day,
        ),
        createdAt: daysAgo(6),
      });
    } else {
      bundleByDesignation[spec.designation] = makeTemplate(spec, {
        version: 1,
        status: 'PUBLISHED',
        days: spec.days,
        createdAt: daysAgo(130),
        publishedAt: daysAgo(120),
      });
    }
  });

  const bundleFor = (designationSlug) => {
    const bundle = bundleByDesignation[designationSlug];
    if (!bundle) throw new Error(`[seed] no published template for ${designationSlug}`);
    return bundle;
  };

  // ---------------------------------------------------------------------------------------
  // Helpers for the learner scenarios
  // ---------------------------------------------------------------------------------------
  const formatInr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  function makeAttempt(student, designationSlug, score, submittedAt) {
    const config = publishedConfigBySlug[designationSlug];
    const attempt = {
      _id: nextId(),
      userId: student._id,
      designationId: designationBySlug[designationSlug]._id,
      configVersion: config.version,
      answers: config.questions.map((question, index) => ({
        questionId: question._id,
        selectedIndex: index < score ? question.correctIndex : (question.correctIndex + 1) % 4,
      })),
      score,
      totalQuestions: config.questions.length,
      discountPercent: discountForScore(config.discountSlabs, score),
      submittedAt,
    };
    data.assessmentAttempts.push(attempt);
    return attempt;
  }

  function addPaymentEvent(payment, type, processedAt, payload = {}) {
    data.paymentEvents.push({
      _id: nextId(),
      paymentId: payment._id,
      provider: payment.provider,
      eventId: `evt_${nextId().slice(-16)}`,
      type,
      payload: { orderId: payment.orderId, amount: payment.amount, currency: payment.currency, ...payload },
      processedAt,
    });
  }

  function makePayment(enrollment, owner, { status, at, amount, flagged = false, flagReason = null }) {
    const payment = {
      _id: nextId(),
      enrollmentId: enrollment._id,
      userId: owner._id,
      orderId: `order_${nextId().slice(-14)}`,
      provider: 'mock',
      amount: amount ?? enrollment.priceSnapshot.payableAmount,
      currency: 'INR',
      status,
      gatewayReference: ['SUCCESS', 'REFUND_PENDING', 'REFUNDED'].includes(status)
        ? `pay_${nextId().slice(-14)}`
        : null,
      flagged,
      flagReason,
      createdAt: at,
      updatedAt: at,
    };
    data.payments.push(payment);
    addPaymentEvent(payment, 'order.created', at);
    if (status === 'FAILED') {
      addPaymentEvent(payment, 'payment.failed', addMinutes(at, 2), { reason: 'Card declined by issuer' });
      payment.updatedAt = addMinutes(at, 2);
    }
    if (status === 'PENDING') {
      addPaymentEvent(payment, 'payment.pending', addMinutes(at, 1), flagged ? { reason: flagReason } : {});
      payment.updatedAt = addMinutes(at, 1);
    }
    if (['SUCCESS', 'REFUND_PENDING', 'REFUNDED'].includes(status)) {
      addPaymentEvent(payment, 'payment.authorized', addMinutes(at, 1));
      addPaymentEvent(payment, 'payment.captured', addMinutes(at, 2));
      payment.updatedAt = addMinutes(at, 2);
    }
    if (status === 'REFUND_PENDING' || status === 'REFUNDED') {
      addPaymentEvent(payment, 'refund.created', addDays(at, 3), { reason: 'Student requested cancellation' });
      payment.updatedAt = addDays(at, 3);
    }
    if (status === 'REFUNDED') {
      addPaymentEvent(payment, 'refund.processed', addDays(at, 5));
      payment.updatedAt = addDays(at, 5);
    }
    return payment;
  }

  function makeEnrollment({
    student,
    plan,
    attempt,
    type = 'INDIVIDUAL',
    team = null,
    status,
    createdAt,
    activatedAt = null,
    completedAt = null,
    termsVersion = latestTermsVersion,
    payments = [],
  }) {
    const designationSlug = data.designations.find((item) => item._id === plan.designationId).slug;
    const bundle = bundleFor(designationSlug);
    const discountPercent = type === 'TEAM' ? 0 : attempt.discountPercent;
    const payableAmount = computePayable(plan.basePrice, discountPercent);
    const quote = {
      _id: nextId(),
      userId: student._id,
      planId: plan._id,
      enrollmentType: type,
      teamId: team?._id ?? null,
      attemptId: attempt._id,
      basePrice: plan.basePrice,
      discountPercent,
      payableAmount,
      currency: 'INR',
      expiresAt: addHours(createdAt, 24),
      createdAt: addMinutes(createdAt, -15),
    };
    data.quotes.push(quote);
    const enrollment = {
      _id: nextId(),
      userId: student._id,
      teamId: team?._id ?? null,
      planId: plan._id,
      quoteId: quote._id,
      scheduleTemplateId: bundle.template._id,
      enrollmentType: type,
      scheduleVersion: bundle.template.version,
      priceSnapshot: { basePrice: plan.basePrice, discountPercent, payableAmount, currency: 'INR' },
      status,
      createdAt,
      activatedAt,
      completedAt,
    };
    data.enrollments.push(enrollment);
    if (termsVersion) {
      data.termsAcceptances.push({
        _id: nextId(),
        userId: student._id,
        enrollmentId: enrollment._id,
        termsVersion,
        acceptedAt: addMinutes(createdAt, 2),
        ip: '10.0.2.15',
      });
    }
    payments.forEach((payment) => makePayment(enrollment, student, payment));
    return { enrollment, bundle };
  }

  /**
   * Progress for every task of the bundle. `statuses` (task key -> status) wins; other tasks are
   * AVAILABLE when all prerequisites are APPROVED, else LOCKED. With `approveFirst` the first N
   * eligible tasks (in sequence) are APPROVED.
   */
  function makeProgress({ enrollment, bundle, teamId = null, statuses = {}, approveFirst = 0, startedAt }) {
    const progressByTaskId = {};
    let approved = 0;
    bundle.tasks.forEach((task) => {
      const key = bundle.keyById[task._id];
      const prereqsApproved = task.prerequisiteTaskIds.every(
        (taskId) => progressByTaskId[taskId]?.status === 'APPROVED',
      );
      let status = statuses[key];
      if (!status) {
        if (prereqsApproved && approved < approveFirst) status = 'APPROVED';
        else status = prereqsApproved ? 'AVAILABLE' : 'LOCKED';
      }
      if (status === 'APPROVED') approved += 1;
      const base = addDays(startedAt, task.sequence * 1.5);
      const progress = {
        _id: nextId(),
        enrollmentId: enrollment._id,
        teamId,
        taskId: task._id,
        status,
        startedAt: ['IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'].includes(status) ? base : null,
        submittedAt: ['SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED'].includes(status) ? addDays(base, 1) : null,
        approvedAt: status === 'APPROVED' ? addDays(base, 1.5) : null,
        createdAt: startedAt,
        updatedAt: startedAt,
      };
      data.taskProgress.push(progress);
      progressByTaskId[task._id] = progress;
    });
    const byKey = {};
    Object.values(progressByTaskId).forEach((progress) => {
      byKey[bundle.keyById[progress.taskId]] = progress;
    });
    return { list: bundle.tasks.map((task) => progressByTaskId[task._id]), byKey };
  }

  const SCREEN_LABELS = [
    'Build and tests passing',
    'API response in Postman',
    'Pull request with description',
    'Unit test report',
    'Application running locally',
    'Merge conflict resolved',
  ];
  let descriptionCursor = 0;
  let screenshotCursor = 0;
  const screenshotCache = new Map();

  function screenshotUrl(label, variant) {
    const cacheKey = `${label}|${variant}`;
    if (!screenshotCache.has(cacheKey)) screenshotCache.set(cacheKey, placeholderScreenshot(label, variant));
    return screenshotCache.get(cacheKey);
  }

  function makeSubmission({
    progress,
    enrollment,
    submitter,
    attemptNumber = 1,
    submittedAt,
    reviewStatus,
    review = null,
    automatedChecks,
    githubUrl,
  }) {
    const submissionId = nextId();
    const count = 1 + ((attemptNumber + screenshotCursor) % 3);
    const screenshots = Array.from({ length: count }, (_, index) => {
      screenshotCursor += 1;
      const label = SCREEN_LABELS[screenshotCursor % SCREEN_LABELS.length];
      return {
        storageKey: `submissions/${enrollment._id}/${submissionId}-${index + 1}.svg`,
        name: `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`,
        mimeType: 'image/svg+xml',
        sizeBytes: 148000 + ((screenshotCursor * 7919) % 90000),
        url: screenshotUrl(label, screenshotCursor % 8),
      };
    });
    const description = SUBMISSION_DESCRIPTIONS[descriptionCursor % SUBMISSION_DESCRIPTIONS.length];
    descriptionCursor += 1;
    const submission = {
      _id: submissionId,
      taskProgressId: progress._id,
      enrollmentId: enrollment._id,
      attemptNumber,
      screenshots,
      description,
      githubUrl: githubUrl ?? `https://github.com/${submitter.email.split('@')[0].replace(/\./g, '-')}/internship-project/pull/${attemptNumber + 1}`,
      submittedBy: submitter._id,
      submittedAt,
      reviewStatus,
      automatedChecks: automatedChecks ?? [{ name: 'Unit tests', status: 'PASSED', required: true }],
    };
    data.taskSubmissions.push(submission);
    progress.submittedAt = submittedAt;
    progress.startedAt = progress.startedAt ?? addDays(submittedAt, -1);
    progress.updatedAt = submittedAt;
    if (review) {
      data.reviews.push({
        _id: nextId(),
        submissionId,
        trainerId: review.trainer._id,
        decision: review.decision,
        feedback: review.feedback ?? '',
        reviewedAt: review.reviewedAt,
      });
      progress.updatedAt = review.reviewedAt;
      if (review.decision === 'APPROVED') progress.approvedAt = review.reviewedAt;
    }
    return submission;
  }

  const feedback = (decision, index) => {
    const list = REVIEW_FEEDBACK[decision] ?? [''];
    return list[index % list.length];
  };

  /** One approved submission for every APPROVED progress record. */
  function approveHistory(progressList, enrollment, submitter, trainer, { reviewedTodayLast = false } = {}) {
    const approvedList = progressList.filter((progress) => progress.status === 'APPROVED');
    approvedList.forEach((progress, index) => {
      const isLast = index === approvedList.length - 1;
      const reviewedAt = reviewedTodayLast && isLast ? hoursAgo(1 + index) : progress.approvedAt ?? daysAgo(10);
      makeSubmission({
        progress,
        enrollment,
        submitter,
        submittedAt: addHours(reviewedAt, -20),
        reviewStatus: 'APPROVED',
        review: { trainer, decision: 'APPROVED', feedback: feedback('APPROVED', index), reviewedAt },
      });
    });
  }

  function assignTrainer(trainer, { enrollmentId = null, teamId = null, assignedAt, active = true, unassignedAt = null }) {
    data.trainerAssignments.push({
      _id: nextId(),
      trainerId: trainer._id,
      enrollmentId,
      teamId,
      assignedBy: admin._id,
      assignedAt,
      active,
      unassignedAt,
    });
  }

  function queueEmail({ to, template, subject, link = null, payload = {}, status = 'SENT', attempts = 1, createdAt }) {
    data.emailJobs.push({
      _id: nextId(),
      to,
      template,
      subject,
      link,
      payload,
      status,
      attempts,
      createdAt,
      sentAt: status === 'SENT' ? addMinutes(createdAt, 1) : null,
    });
  }

  function issueCertificate(enrollment, owner, { certificateNo, issuedAt, emailStatus = 'SENT', revokedAt = null, revokeReason = null }) {
    const certificate = {
      _id: nextId(),
      certificateNo,
      userId: owner._id,
      enrollmentId: enrollment._id,
      status: revokedAt ? 'REVOKED' : 'ISSUED',
      issuedAt,
      pdfKey: `certificates/${certificateNo}.pdf`,
      emailStatus,
      revokedAt,
      revokeReason,
    };
    data.certificates.push(certificate);
    return certificate;
  }

  // ---------------------------------------------------------------------------------------
  // 1. Aarav — Java / Banking in progress, tasks in every state
  // ---------------------------------------------------------------------------------------
  const aarav = user('student@demo.dev');
  const aaravAttempt = makeAttempt(aarav, 'java-developer', 12, daysAgo(40));
  const { enrollment: aaravEnrollment, bundle: javaBundle } = makeEnrollment({
    student: aarav,
    plan: planFor('java-developer', 'banking', 3),
    attempt: aaravAttempt,
    status: 'IN_PROGRESS',
    createdAt: daysAgo(36),
    activatedAt: daysAgo(35),
    payments: [{ status: 'SUCCESS', at: daysAgo(35.2) }],
  });
  const aaravProgress = makeProgress({
    enrollment: aaravEnrollment,
    bundle: javaBundle,
    startedAt: daysAgo(35),
    statuses: {
      T1: 'APPROVED',
      T2: 'APPROVED',
      T3: 'CHANGES_REQUESTED',
      T5: 'SUBMITTED',
      T8: 'IN_PROGRESS',
      T10: 'AVAILABLE',
    },
  });
  const aaravRepo = 'https://github.com/aarav-sharma-dev/java-banking-ledger';
  makeSubmission({
    progress: aaravProgress.byKey.T1,
    enrollment: aaravEnrollment,
    submitter: aarav,
    submittedAt: daysAgo(31),
    reviewStatus: 'APPROVED',
    githubUrl: `${aaravRepo}/pull/1`,
    review: { trainer: priya, decision: 'APPROVED', feedback: feedback('APPROVED', 0), reviewedAt: daysAgo(30) },
  });
  makeSubmission({
    progress: aaravProgress.byKey.T2,
    enrollment: aaravEnrollment,
    submitter: aarav,
    submittedAt: daysAgo(26),
    reviewStatus: 'CHANGES_REQUESTED',
    githubUrl: `${aaravRepo}/pull/2`,
    review: { trainer: priya, decision: 'CHANGES_REQUESTED', feedback: feedback('CHANGES_REQUESTED', 0), reviewedAt: daysAgo(25) },
  });
  makeSubmission({
    progress: aaravProgress.byKey.T2,
    enrollment: aaravEnrollment,
    submitter: aarav,
    attemptNumber: 2,
    submittedAt: daysAgo(23),
    reviewStatus: 'APPROVED',
    githubUrl: `${aaravRepo}/commit/8f3c2a91d4e5b6c7a8f90123456789abcdef0123`,
    review: { trainer: priya, decision: 'APPROVED', feedback: feedback('APPROVED', 1), reviewedAt: daysAgo(22) },
  });
  makeSubmission({
    progress: aaravProgress.byKey.T3,
    enrollment: aaravEnrollment,
    submitter: aarav,
    submittedAt: daysAgo(4),
    reviewStatus: 'CHANGES_REQUESTED',
    githubUrl: `${aaravRepo}/pull/3`,
    review: { trainer: priya, decision: 'CHANGES_REQUESTED', feedback: feedback('CHANGES_REQUESTED', 1), reviewedAt: daysAgo(3) },
  });
  makeSubmission({
    progress: aaravProgress.byKey.T5,
    enrollment: aaravEnrollment,
    submitter: aarav,
    submittedAt: hoursAgo(6),
    reviewStatus: 'PENDING',
    githubUrl: `${aaravRepo}/pull/4`,
    automatedChecks: [
      { name: 'Unit tests', status: 'PASSED', required: true },
      { name: 'Lint', status: 'PASSED', required: false },
    ],
  });
  aaravProgress.byKey.T8.startedAt = daysAgo(2);
  data.githubConnections.push({
    _id: nextId(),
    userId: aarav._id,
    githubUsername: 'aarav-sharma-dev',
    scopes: ['read:user', 'public_repo'],
    connectedAt: daysAgo(34),
  });
  assignTrainer(arjun, { enrollmentId: aaravEnrollment._id, assignedAt: daysAgo(35), active: false, unassignedAt: daysAgo(34) });
  assignTrainer(priya, { enrollmentId: aaravEnrollment._id, assignedAt: daysAgo(34) });
  queueEmail({
    to: aarav.email,
    template: 'payment-success',
    subject: 'Payment received — your Java Developer internship is active',
    link: '/dashboard',
    createdAt: daysAgo(35),
  });

  // ---------------------------------------------------------------------------------------
  // 2. Kabir — enrolled, last payment failed (retry payment)
  // ---------------------------------------------------------------------------------------
  const kabir = user('pending@demo.dev');
  const kabirAttempt = makeAttempt(kabir, 'devops-engineer', 9, daysAgo(3));
  makeEnrollment({
    student: kabir,
    plan: planFor('devops-engineer', 'telecom', 2),
    attempt: kabirAttempt,
    status: 'PENDING_PAYMENT',
    createdAt: daysAgo(2),
    payments: [{ status: 'FAILED', at: daysAgo(1) }],
  });

  // ---------------------------------------------------------------------------------------
  // 3. Isha — email not verified, payment blocked
  // ---------------------------------------------------------------------------------------
  const isha = user('unverified@demo.dev');
  const ishaAttempt = makeAttempt(isha, 'full-stack-developer', 6, daysAgo(1));
  makeEnrollment({
    student: isha,
    plan: planFor('full-stack-developer', 'e-commerce', 3),
    attempt: ishaAttempt,
    status: 'PENDING_PAYMENT',
    createdAt: hoursAgo(20),
    termsVersion: null,
  });
  data.authTokens.push(
    { _id: nextId(), userId: isha._id, type: 'EMAIL_VERIFY', token: 'verify-isha-demo', expiresAt: hoursFromNow(24), usedAt: null },
    { _id: nextId(), userId: isha._id, type: 'EMAIL_VERIFY', token: 'verify-expired-demo', expiresAt: daysAgo(1), usedAt: null },
  );
  queueEmail({
    to: isha.email,
    template: 'verify-email',
    subject: 'Verify your email address',
    link: '/verify-email?token=verify-isha-demo',
    payload: { name: isha.name },
    createdAt: hoursAgo(1),
  });

  // ---------------------------------------------------------------------------------------
  // 4. Meera — completed with certificate IP-2026-000123
  // ---------------------------------------------------------------------------------------
  const meera = user('graduate@demo.dev');
  const meeraAttempt = makeAttempt(meera, 'full-stack-developer', 15, daysAgo(104));
  const { enrollment: meeraEnrollment, bundle: fullstackBundle } = makeEnrollment({
    student: meera,
    plan: planFor('full-stack-developer', 'e-commerce', 3),
    attempt: meeraAttempt,
    status: 'COMPLETED',
    createdAt: daysAgo(101),
    activatedAt: daysAgo(100),
    completedAt: daysAgo(8),
    payments: [{ status: 'SUCCESS', at: daysAgo(100.2) }],
  });
  const meeraStatuses = Object.fromEntries(
    fullstackBundle.tasks.map((task) => [fullstackBundle.keyById[task._id], 'APPROVED']),
  );
  const meeraProgress = makeProgress({
    enrollment: meeraEnrollment,
    bundle: fullstackBundle,
    startedAt: daysAgo(99),
    statuses: meeraStatuses,
  });
  approveHistory(meeraProgress.list, meeraEnrollment, meera, neha);
  assignTrainer(neha, { enrollmentId: meeraEnrollment._id, assignedAt: daysAgo(99) });
  issueCertificate(meeraEnrollment, meera, {
    certificateNo: DEMO_CERTIFICATES.valid,
    issuedAt: daysAgo(8),
    emailStatus: 'SENT',
  });
  queueEmail({
    to: meera.email,
    template: 'certificate',
    subject: `Your certificate ${DEMO_CERTIFICATES.valid} is ready`,
    link: '/certificate',
    createdAt: daysAgo(8),
  });

  // ---------------------------------------------------------------------------------------
  // 5. Rohan — leads the forming team "Code Crafters"
  // ---------------------------------------------------------------------------------------
  const rohan = user('leader@demo.dev');
  const sneha = user('sneha.kapoor@example.com');
  const ananya = user('ananya.bose@example.com');
  const kunal = user('kunal.shah@example.com');
  const tanvi = user('tanvi.joshi@example.com');
  const javaBankingPlan = planFor('java-developer', 'banking', 3);

  const codeCrafters = {
    _id: nextId(),
    name: 'Code Crafters',
    leaderId: rohan._id,
    planId: javaBankingPlan._id,
    repoUrl: null,
    status: 'FORMING',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
  };
  data.teams.push(codeCrafters);
  const addMember = (team, fields) => {
    const member = {
      _id: nextId(),
      teamId: team._id,
      userId: fields.user?._id ?? null,
      email: fields.user?.email ?? fields.email,
      status: fields.status,
      isLeader: Boolean(fields.isLeader),
      inviteToken: fields.inviteToken ?? null,
      invitedAt: fields.invitedAt ?? team.createdAt,
      joinedAt: fields.joinedAt ?? null,
      inviteExpiresAt: fields.inviteExpiresAt ?? null,
    };
    data.teamMembers.push(member);
    return member;
  };
  addMember(codeCrafters, { user: rohan, status: 'JOINED', isLeader: true, joinedAt: daysAgo(5) });
  addMember(codeCrafters, { user: sneha, status: 'JOINED', invitedAt: daysAgo(5), joinedAt: daysAgo(4) });
  addMember(codeCrafters, {
    user: ananya,
    status: 'INVITED',
    inviteToken: 'invite-ananya-demo',
    invitedAt: daysAgo(2),
    inviteExpiresAt: daysFromNow(5),
  });
  addMember(codeCrafters, {
    user: kunal,
    status: 'INVITED',
    inviteToken: 'invite-expired-demo',
    invitedAt: daysAgo(9),
    inviteExpiresAt: daysAgo(2),
  });
  addMember(codeCrafters, { user: tanvi, status: 'DECLINED', invitedAt: daysAgo(5) });

  const rohanAttempt = makeAttempt(rohan, 'java-developer', 8, daysAgo(6));
  makeEnrollment({
    student: rohan,
    plan: javaBankingPlan,
    attempt: rohanAttempt,
    type: 'TEAM',
    team: codeCrafters,
    status: 'ACTIVE',
    createdAt: daysAgo(3.2),
    activatedAt: daysAgo(3),
    payments: [{ status: 'SUCCESS', at: daysAgo(3.1) }],
  });
  const snehaAttempt = makeAttempt(sneha, 'java-developer', 11, daysAgo(3));
  makeEnrollment({
    student: sneha,
    plan: javaBankingPlan,
    attempt: snehaAttempt,
    type: 'TEAM',
    team: codeCrafters,
    status: 'PENDING_PAYMENT',
    createdAt: daysAgo(2),
  });
  queueEmail({
    to: ananya.email,
    template: 'team-invite',
    subject: 'Rohan Gupta invited you to join "Code Crafters"',
    link: '/team/invite/invite-ananya-demo',
    payload: { teamName: codeCrafters.name },
    createdAt: daysAgo(2),
  });
  queueEmail({
    to: kunal.email,
    template: 'team-invite',
    subject: 'Rohan Gupta invited you to join "Code Crafters"',
    link: '/team/invite/invite-expired-demo',
    payload: { teamName: codeCrafters.name },
    createdAt: daysAgo(9),
  });
  queueEmail({
    to: rohan.email,
    template: 'payment-success',
    subject: 'Payment received — waiting for your team',
    link: '/team/' + codeCrafters._id,
    createdAt: daysAgo(3),
  });

  // ---------------------------------------------------------------------------------------
  // 6. Team "Byte Brigade" — active, one shared set of tasks
  // ---------------------------------------------------------------------------------------
  const varun = user('varun.malhotra@example.com');
  const pooja = user('pooja.nair@example.com');
  const siddharth = user('siddharth.rao@example.com');
  const fullstackPlan = planFor('full-stack-developer', 'e-commerce', 3);
  const byteBrigade = {
    _id: nextId(),
    name: 'Byte Brigade',
    leaderId: varun._id,
    planId: fullstackPlan._id,
    repoUrl: 'https://github.com/byte-brigade/shopwave',
    status: 'ACTIVE',
    createdAt: daysAgo(25),
    updatedAt: daysAgo(20),
  };
  data.teams.push(byteBrigade);
  addMember(byteBrigade, { user: varun, status: 'JOINED', isLeader: true, joinedAt: daysAgo(25) });
  addMember(byteBrigade, { user: pooja, status: 'JOINED', invitedAt: daysAgo(25), joinedAt: daysAgo(24) });
  addMember(byteBrigade, { user: siddharth, status: 'JOINED', invitedAt: daysAgo(25), joinedAt: daysAgo(23) });

  const teamEnrollments = [
    [varun, 13],
    [pooja, 10],
    [siddharth, 7],
  ].map(([member, score], index) => {
    const attempt = makeAttempt(member, 'full-stack-developer', score, daysAgo(24 - index));
    return makeEnrollment({
      student: member,
      plan: fullstackPlan,
      attempt,
      type: 'TEAM',
      team: byteBrigade,
      status: 'IN_PROGRESS',
      createdAt: daysAgo(22 - index * 0.2),
      activatedAt: daysAgo(20),
      payments: [{ status: 'SUCCESS', at: daysAgo(21 - index * 0.3) }],
    }).enrollment;
  });
  const teamProgress = makeProgress({
    enrollment: teamEnrollments[0],
    bundle: fullstackBundle,
    teamId: byteBrigade._id,
    startedAt: daysAgo(20),
    statuses: { T1: 'APPROVED', T2: 'SUBMITTED' },
  });
  makeSubmission({
    progress: teamProgress.byKey.T1,
    enrollment: teamEnrollments[0],
    submitter: varun,
    submittedAt: daysAgo(15),
    reviewStatus: 'APPROVED',
    githubUrl: `${byteBrigade.repoUrl}/pull/1`,
    review: { trainer: priya, decision: 'APPROVED', feedback: feedback('APPROVED', 2), reviewedAt: daysAgo(14) },
  });
  makeSubmission({
    progress: teamProgress.byKey.T2,
    enrollment: teamEnrollments[0],
    submitter: pooja,
    submittedAt: hoursAgo(26),
    reviewStatus: 'PENDING',
    githubUrl: `${byteBrigade.repoUrl}/pull/2`,
  });
  assignTrainer(priya, { teamId: byteBrigade._id, assignedAt: daysAgo(20) });

  // ---------------------------------------------------------------------------------------
  // 7. Volume for the admin and trainer screens
  // ---------------------------------------------------------------------------------------
  const VOLUME = [
    { email: 'aditya.deshpande@example.com', designation: 'java-developer', domain: 'healthcare', months: 3, score: 13, status: 'IN_PROGRESS', activated: 28, approve: 3, trainer: 'priya', pendingHours: 2, reviewedToday: true },
    { email: 'riya.sen@example.com', designation: 'full-stack-developer', domain: 'banking', months: 3, score: 10, status: 'IN_PROGRESS', activated: 24, approve: 2, trainer: 'priya', pendingHours: 25, reviewedToday: true },
    { email: 'harshit.agarwal@example.com', designation: 'devops-engineer', domain: 'telecom', months: 2, score: 8, status: 'IN_PROGRESS', activated: 30, approve: 2, trainer: 'priya', pendingHours: 74, failedCheck: true },
    { email: 'kavya.menon@example.com', designation: 'dotnet-developer', domain: 'healthcare', months: 3, score: 14, status: 'IN_PROGRESS', activated: 21, approve: 2, trainer: 'arjun', pendingHours: 5 },
    { email: 'arnav.chatterjee@example.com', designation: 'java-developer', domain: 'banking', months: 3, score: 7, status: 'ACTIVE', activated: 4, approve: 0, trainer: 'arjun' },
    { email: 'ishaan.khanna@example.com', designation: 'devops-engineer', domain: 'banking', months: 3, score: 12, status: 'IN_PROGRESS', activated: 18, approve: 1, trainer: 'arjun' },
    { email: 'shreya.pillai@example.com', designation: 'full-stack-developer', domain: 'healthcare', months: 1, score: 15, status: 'COMPLETED', activated: 150, trainer: 'neha', certificate: { no: 'IP-2026-000101', issued: 30, emailStatus: 'FAILED' } },
    { email: 'manish.tiwari@example.com', designation: 'java-developer', domain: 'e-commerce', months: 2, score: 11, status: 'COMPLETED', activated: 125, trainer: 'neha', certificate: { no: 'IP-2026-000102', issued: 15, emailStatus: 'SENT' } },
    { email: 'divya.krishnan@example.com', designation: 'dotnet-developer', domain: 'banking', months: 3, score: 9, status: 'COMPLETED', activated: 170, trainer: 'arjun', certificate: { no: DEMO_CERTIFICATES.revoked, issued: 60, emailStatus: 'SENT', revoked: 20 } },
    { email: 'yash.thakur@example.com', designation: 'java-developer', domain: 'banking', months: 1, score: 5, status: 'PENDING_PAYMENT', created: 0.2, payment: 'CREATED' },
    { email: 'nandini.hegde@example.com', designation: 'full-stack-developer', domain: 'e-commerce', months: 2, score: 12, status: 'PENDING_PAYMENT', created: 0.5, payment: 'PENDING' },
    { email: 'pranav.saxena@example.com', designation: 'devops-engineer', domain: 'e-commerce', months: 4, score: 10, status: 'CANCELLED', created: 70, payment: 'REFUNDED' },
    { email: 'simran.kaur@example.com', designation: 'dotnet-developer', domain: 'healthcare', months: 6, score: 13, status: 'SUSPENDED', created: 40, payment: 'REFUND_PENDING' },
    { email: 'vivek.pandey@example.com', designation: 'java-developer', domain: 'healthcare', months: 3, score: 10, status: 'PENDING_PAYMENT', created: 1, payment: 'PENDING', flagged: true },
  ];

  VOLUME.forEach((entry, index) => {
    const student = user(entry.email);
    const attemptAt = daysAgo((entry.activated ?? entry.created ?? 1) + 2);
    const attempt = makeAttempt(student, entry.designation, entry.score, attemptAt);
    const plan = planFor(entry.designation, entry.domain, entry.months);
    const paid = ['ACTIVE', 'IN_PROGRESS', 'COMPLETED'].includes(entry.status);
    const createdAt = paid ? daysAgo(entry.activated + 0.5) : daysAgo(entry.created);
    const expected = computePayable(plan.basePrice, attempt.discountPercent);

    let payments;
    if (paid) payments = [{ status: 'SUCCESS', at: daysAgo(entry.activated + 0.2) }];
    else if (entry.flagged) {
      const reported = expected - 100000;
      payments = [
        {
          status: 'PENDING',
          at: hoursAgo(20),
          flagged: true,
          flagReason: `Amount mismatch: gateway reported ${formatInr(reported)} but the order expected ${formatInr(expected)}`,
        },
      ];
    } else if (entry.payment === 'CREATED') payments = [{ status: 'CREATED', at: hoursAgo(4) }];
    else if (entry.payment === 'PENDING') payments = [{ status: 'PENDING', at: hoursAgo(2) }];
    else if (entry.payment) payments = [{ status: entry.payment, at: daysAgo(entry.created - 0.1) }];
    else payments = [];

    const { enrollment, bundle } = makeEnrollment({
      student,
      plan,
      attempt,
      status: entry.status,
      createdAt,
      activatedAt: paid ? daysAgo(entry.activated) : null,
      completedAt: entry.status === 'COMPLETED' ? daysAgo(entry.certificate.issued) : null,
      payments,
    });

    if (!paid) return;
    const trainer = TRAINERS[entry.trainer];
    assignTrainer(trainer, { enrollmentId: enrollment._id, assignedAt: daysAgo(entry.activated - 0.5) });

    if (entry.status === 'COMPLETED') {
      const statuses = Object.fromEntries(bundle.tasks.map((task) => [bundle.keyById[task._id], 'APPROVED']));
      const progress = makeProgress({ enrollment, bundle, startedAt: daysAgo(entry.activated), statuses });
      approveHistory(progress.list, enrollment, student, trainer);
      const { certificate: cert } = entry;
      issueCertificate(enrollment, student, {
        certificateNo: cert.no,
        issuedAt: daysAgo(cert.issued),
        emailStatus: cert.emailStatus,
        revokedAt: cert.revoked ? daysAgo(cert.revoked) : null,
        revokeReason: cert.revoked ? 'Plagiarism found in the final submission' : null,
      });
      queueEmail({
        to: student.email,
        template: 'certificate',
        subject: `Your certificate ${cert.no} is ready`,
        link: '/certificate',
        status: cert.emailStatus === 'FAILED' ? 'FAILED' : 'SENT',
        attempts: cert.emailStatus === 'FAILED' ? 5 : 1,
        createdAt: daysAgo(cert.issued),
      });
      return;
    }

    const progress = makeProgress({
      enrollment,
      bundle,
      startedAt: daysAgo(entry.activated),
      approveFirst: entry.approve,
    });
    approveHistory(progress.list, enrollment, student, trainer, { reviewedTodayLast: entry.reviewedToday });
    if (entry.pendingHours) {
      const next = progress.list.find((item) => item.status === 'AVAILABLE');
      if (next) {
        next.status = 'SUBMITTED';
        makeSubmission({
          progress: next,
          enrollment,
          submitter: student,
          submittedAt: hoursAgo(entry.pendingHours),
          reviewStatus: 'PENDING',
          automatedChecks: entry.failedCheck
            ? [
                { name: 'Unit tests', status: 'FAILED', required: true },
                { name: 'Lint', status: 'PASSED', required: false },
              ]
            : undefined,
        });
      }
    }
    if (index % 2 === 0 && enrollment.status === 'IN_PROGRESS') {
      const working = progress.list.find((item) => item.status === 'AVAILABLE');
      if (working) {
        working.status = 'IN_PROGRESS';
        working.startedAt = daysAgo(1);
      }
    }
  });

  // Assessed but not enrolled yet.
  makeAttempt(user('lakshmi.subramanian@example.com'), 'dotnet-developer', 11, daysAgo(2));

  // ---------------------------------------------------------------------------------------
  // 8. Audit log (append-only)
  // ---------------------------------------------------------------------------------------
  const audit = (action, entityType, entity, daysBack, before = null, after = null, actor = admin) => {
    data.auditLogs.push({
      _id: nextId(),
      actorId: actor._id,
      action,
      entityType,
      entityId: entity?._id ?? null,
      before,
      after,
      ip: `10.0.${(daysBack * 7) % 255}.${(daysBack * 13) % 255}`,
      createdAt: daysAgo(daysBack),
    });
  };
  const nikhil = user(SUSPENDED_ACCOUNT.email);
  const javaHealthcare3 = planFor('java-developer', 'healthcare', 3);
  const devopsTelecom2 = planFor('devops-engineer', 'telecom', 2);
  const javaV2Template = javaBundle.template;
  const javaV2Draft = data.assessmentConfigs.find((config) => config.status === 'DRAFT' && config.version === 2);

  audit('DESIGNATION_CREATED', 'designation', designationBySlug['data-engineer'], 58, null, { name: 'Data Engineer', status: 'DRAFT' });
  audit('DESIGNATION_PUBLISHED', 'designation', designationBySlug['devops-engineer'], 57, { status: 'DRAFT' }, { status: 'PUBLISHED' });
  audit('DOMAIN_CREATED', 'domain', domainBySlug.insurance, 55, null, { name: 'Insurance', status: 'DRAFT' });
  audit('PLAN_CREATED', 'internshipPlan', planFor('dotnet-developer', 'insurance', 3), 54, null, { durationMonths: 3, basePrice: 1299900, status: 'DRAFT' });
  audit('PLAN_PUBLISHED', 'internshipPlan', planFor('java-developer', 'e-commerce', 3), 50, { status: 'DRAFT' }, { status: 'PUBLISHED' });
  audit('PRICE_UPDATED', 'internshipPlan', javaBankingPlan, 45, { basePrice: 1199900 }, { basePrice: 1299900 });
  audit('PRICE_UPDATED', 'internshipPlan', devopsTelecom2, 44, { basePrice: 949900 }, { basePrice: 999900 });
  audit('PRICE_UPDATED', 'internshipPlan', javaHealthcare3, 43, { basePrice: 1249900 }, { basePrice: 1299900 });
  audit('TASK_UPDATED', 'taskDefinition', javaBundle.tasks[4], 30, { estimatedHours: 4 }, { estimatedHours: 5 });
  audit('SCHEDULE_PUBLISHED', 'scheduleTemplate', javaV2Template, 29, { status: 'DRAFT', version: 2 }, { status: 'PUBLISHED', version: 2 });
  audit('USER_ROLES_CHANGED', 'user', neha, 40, { roles: ['STUDENT'] }, { roles: ['TRAINER'] });
  audit('TRAINER_UNASSIGNED', 'trainerAssignment', data.trainerAssignments[0], 34, { trainerId: arjun._id, active: true }, { active: false });
  audit('TRAINER_ASSIGNED', 'trainerAssignment', data.trainerAssignments[1], 34, null, { trainerId: priya._id, enrollmentId: aaravEnrollment._id });
  audit('TRAINER_ASSIGNED', 'trainerAssignment', data.trainerAssignments.find((item) => item.teamId === byteBrigade._id), 20, null, { trainerId: priya._id, teamId: byteBrigade._id });
  audit('USER_SUSPENDED', 'user', nikhil, 20, { status: 'ACTIVE' }, { status: 'SUSPENDED' });
  audit('CERTIFICATE_REVOKED', 'certificate', data.certificates.find((item) => item.certificateNo === DEMO_CERTIFICATES.revoked), 20, { status: 'ISSUED' }, { status: 'REVOKED', revokeReason: 'Plagiarism found in the final submission' });
  if (javaV2Draft) {
    audit('ASSESSMENT_UPDATED', 'assessmentConfig', javaV2Draft, 12, { version: 1, status: 'PUBLISHED' }, { version: 2, status: 'DRAFT' });
    audit('SLABS_UPDATED', 'assessmentConfig', javaV2Draft, 12, { discountSlabs: DEFAULT_SLABS }, { discountSlabs: DEFAULT_SLABS });
  }
  audit('CERTIFICATE_EMAIL_RESENT', 'certificate', data.certificates.find((item) => item.certificateNo === 'IP-2026-000101'), 2, { emailStatus: 'FAILED' }, { emailStatus: 'FAILED' });
  audit('USER_ROLES_CHANGED', 'user', arjun, 6, { roles: ['TRAINER'] }, { roles: ['TRAINER'] });
  data.auditLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  data.emailJobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return data;
}

export default buildSeed;
