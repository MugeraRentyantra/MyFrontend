/**
 * Terms and conditions versions (tickets GP1, SD5). Pure data: markdown content.
 *
 * TERMS_VERSIONS: [{ version, daysAgo, content }]. The seed sets publishedAt = now - daysAgo days.
 * Version 2 is the latest. Sections use "##" headings because the terms page renders its own <h1>.
 * Version 2 differs from version 1 in the refund window, the team rules and file retention.
 */

const INTRO = [
  'These terms apply to every internship you enrol in through the portal. Please read them before you pay. We record the version you accept and the time of acceptance against your enrollment.',
  '',
];

const ELIGIBILITY = [
  '## Eligibility',
  '',
  '- You must be at least 18 years old, or have the consent of a parent or guardian.',
  '- You need a verified email address before you can pay.',
  '- Accounts are personal and must not be shared.',
  '- The assessment does not decide whether you may enrol.',
  '',
];

const ASSESSMENT = [
  '## The assessment',
  '',
  '- Each designation has one assessment of 15 multiple-choice questions. You may attempt it once.',
  '- Answers are scored on our servers; unanswered questions count as incorrect.',
  '- There is no pass or fail. Every score from 0 to 15 can continue to enrollment, and the score only decides the discount on an individual enrollment.',
  '',
];

const FEES_COMMON = [
  '## Fees, discounts and team enrollments',
  '',
  '- Each plan has a base price for its designation, domain and duration, in Indian rupees (INR). Applicable taxes are shown at checkout.',
  '- A quote is valid for 24 hours. Once you enrol, your price is locked and later price changes do not affect it.',
  '- The assessment discount applies to individual enrollments only. Team members always pay the full plan price, and every member must still take the assessment.',
];

const FEES_V1 = [
  ...FEES_COMMON,
  '- A team has up to five members including the leader. Invitations expire after 7 days.',
  '',
];

const FEES_V2 = [
  ...FEES_COMMON,
  '- A team has up to five members including the leader. Invitations expire after 7 days, and a team starts only when every member has joined, been assessed and paid.',
  '',
];

const PAYMENT_INTRO = [
  '## Payment, refunds and cancellations',
  '',
  '- Payments are handled by our payment gateway. We never see or store your card or UPI details.',
  '- A payment counts only when the gateway sends us a verified confirmation. A redirect to a success page is not proof of payment.',
  '- If money is debited but your enrollment is not active within one hour, contact support with your order ID.',
];

const REFUND_TIMING =
  '- Refunds go back to the original payment method within 7 to 10 working days.';

const PAYMENTS_V1 = [
  ...PAYMENT_INTRO,
  '- You may cancel within 7 days of payment for a full refund if you have not submitted any task. After that, fees are non-refundable unless we cancel the programme or the law requires a refund.',
  REFUND_TIMING,
  '',
];

const PAYMENTS_V2 = [
  ...PAYMENT_INTRO,
  '- You may cancel within 14 days of payment for a full refund if none of your tasks has been approved. After that, fees are non-refundable unless we cancel the programme or the law requires a refund.',
  '- A team member who cancels before the team starts gets a full refund.',
  REFUND_TIMING,
  '',
];

const CONDUCT = [
  '## Code of conduct and academic integrity',
  '',
  '- Submit only work that you or your team created. Do not copy solutions from other students or share yours.',
  '- You may use documentation and AI assistants to learn, but you must be able to explain every line you submit.',
  '- Misconduct can lead to rejected submissions, suspension without a refund and revocation of your certificate.',
  '',
];

const INTELLECTUAL_PROPERTY = [
  '## Intellectual property and GitHub repositories',
  '',
  '- Starter repositories, task instructions and SOPs are licensed to you for your internship only.',
  '- The code you write is yours. You may push it to your own GitHub repositories, subject to the confidentiality and licence terms in each starter repository.',
  '- Never share your GitHub password or access tokens, including with trainers. The portal never asks for your password, and for teams it stores only the repository URL.',
  '',
];

const PROTECTED_CONTENT = [
  '## Protected content',
  '',
  '- SOPs and paid task content are view-only inside the portal, with no download or print option.',
  '- Protected pages are watermarked with your name and ID, and every access is logged.',
  '- Copying or sharing protected content is a breach of these terms, even though technical controls cannot prevent it completely.',
  '',
];

const CERTIFICATES = [
  '## Certificates',
  '',
  '- Your certificate is issued automatically when your payment is valid and all mandatory tasks are approved. Each eligible team member receives an individual certificate.',
  '- The public verification page shows only the certificate number, status, designation, domain, duration and issue date.',
  '- A certificate obtained through misconduct or a reversed payment can be revoked. Verification then shows it as revoked, and the history is kept.',
  '',
];

const PRIVACY_START = [
  '## Privacy and data retention',
  '',
  '- We collect only what we need to run your internship: your name and email, assessment results, enrollment and payment references, submissions, reviews and access logs for protected content.',
  '- Your assigned trainers can see your submissions and progress. We do not sell personal data.',
];

const PRIVACY_END = [
  '- You can request a copy, correction or deletion of your data by contacting support from your registered email address.',
  '',
];

const PRIVACY_V1 = [
  ...PRIVACY_START,
  '- Payment and certificate records are kept as long as accounting and verification require. Submission files are deleted 36 months after your internship ends.',
  ...PRIVACY_END,
];

const PRIVACY_V2 = [
  ...PRIVACY_START,
  '- Payment and certificate records are kept as long as accounting and verification require. Submission files are deleted 24 months after your internship ends.',
  ...PRIVACY_END,
];

const CHANGES = [
  '## Changes to these terms',
  '',
  '- Each version of these terms is numbered. The version you accepted applies to that enrollment; new versions apply to new enrollments.',
  '- We show the latest version before you pay and email you about changes that affect an active enrollment.',
];

const WHAT_CHANGED_V2 = [
  '',
  '### What changed in version 2',
  '',
  '- Refund window extended from 7 to 14 days, now based on approved rather than submitted tasks.',
  '- Team rules clarified: a team starts only when every member is ready, and members who cancel before the start get a full refund.',
  '- Submission files are now kept for 24 months instead of 36.',
];

export const TERMS_VERSIONS = [
  {
    version: 1,
    daysAgo: 200,
    content: [
      ...INTRO,
      ...ELIGIBILITY,
      ...ASSESSMENT,
      ...FEES_V1,
      ...PAYMENTS_V1,
      ...CONDUCT,
      ...INTELLECTUAL_PROPERTY,
      ...PROTECTED_CONTENT,
      ...CERTIFICATES,
      ...PRIVACY_V1,
      ...CHANGES,
    ].join('\n'),
  },
  {
    version: 2,
    daysAgo: 40,
    content: [
      ...INTRO,
      ...ELIGIBILITY,
      ...ASSESSMENT,
      ...FEES_V2,
      ...PAYMENTS_V2,
      ...CONDUCT,
      ...INTELLECTUAL_PROPERTY,
      ...PROTECTED_CONTENT,
      ...CERTIFICATES,
      ...PRIVACY_V2,
      ...CHANGES,
      ...WHAT_CHANGED_V2,
    ].join('\n'),
  },
];
