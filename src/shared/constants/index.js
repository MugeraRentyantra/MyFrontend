export * from './roles';
export * from './routes';
export * from './statuses';

const env = import.meta.env;

export const APP_NAME = env.VITE_APP_NAME || 'Internship Portal';
export const API_BASE_URL = String(env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');
export const USE_MOCKS = env.VITE_USE_MOCKS === 'true';
export const SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL || 'support@internshipportal.dev';
export const PAYMENT_PROVIDER = env.VITE_PAYMENT_PROVIDER || 'mock';

export const CURRENCY = 'INR';
export const DURATION_OPTIONS = [1, 2, 3, 4, 6];

export const ASSESSMENT_QUESTION_COUNT = 15;
export const ASSESSMENT_OPTION_COUNT = 4;
export const ASSESSMENT_MAX_SCORE = 15;

/** Defaults shown in the slab editor; the live slabs always come from the server. */
export const DEFAULT_DISCOUNT_SLABS = Object.freeze([
  { minScore: 15, maxScore: 15, discountPercent: 20 },
  { minScore: 10, maxScore: 14, discountPercent: 10 },
  { minScore: 8, maxScore: 9, discountPercent: 5 },
  { minScore: 0, maxScore: 7, discountPercent: 0 },
]);

export const TEAM_MAX_MEMBERS = 5; // including the leader
export const TEAM_MAX_INVITES = TEAM_MAX_MEMBERS - 1;
export const INVITE_EXPIRY_DAYS = 7;

export const SUBMISSION_RULES = Object.freeze({
  minScreenshots: 1,
  maxScreenshots: 5,
  maxFileSizeBytes: 5 * 1024 * 1024,
  allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
  allowedImageExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
  minDescriptionLength: 50,
  maxDescriptionLength: 5000,
  githubUrlPrefix: 'https://github.com/',
});

export const PASSWORD_MIN_LENGTH = 8;

export const PAYMENT_POLL_INTERVAL_MS = 3000;
export const PAYMENT_POLL_TIMEOUT_MS = 60000;

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50];

export const STORAGE_KEYS = Object.freeze({
  activeEnrollmentId: 'ip.activeEnrollmentId',
  assessmentDraftPrefix: 'ip.assessmentDraft.',
  sidebarCollapsed: 'ip.sidebarCollapsed',
});
