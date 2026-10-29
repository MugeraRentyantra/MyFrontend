/**
 * Demo accounts seeded into the mock API (only used when VITE_USE_MOCKS=true).
 * The login page loads this module lazily so it never ships in a real-API build.
 */
export const DEMO_PASSWORD = 'Password@123';

export const DEMO_ACCOUNTS = [
  {
    key: 'student',
    email: 'student@demo.dev',
    name: 'Aarav Sharma',
    role: 'STUDENT',
    description: 'Java / Banking internship in progress, tasks in every state',
  },
  {
    key: 'new',
    email: 'new.student@demo.dev',
    name: 'Diya Patel',
    role: 'STUDENT',
    description: 'Verified, not assessed yet: try the whole journey',
  },
  {
    key: 'pending',
    email: 'pending@demo.dev',
    name: 'Kabir Mehta',
    role: 'STUDENT',
    description: 'Enrolled, last payment failed: retry payment',
  },
  {
    key: 'unverified',
    email: 'unverified@demo.dev',
    name: 'Isha Reddy',
    role: 'STUDENT',
    description: 'Email not verified, so payment is blocked',
  },
  {
    key: 'graduate',
    email: 'graduate@demo.dev',
    name: 'Meera Iyer',
    role: 'STUDENT',
    description: 'Completed internship with an issued certificate',
  },
  {
    key: 'leader',
    email: 'leader@demo.dev',
    name: 'Rohan Gupta',
    role: 'STUDENT',
    description: 'Leads a forming team with pending invites',
  },
  {
    key: 'trainer',
    email: 'trainer@demo.dev',
    name: 'Priya Nair',
    role: 'TRAINER',
    description: 'Trainer with a review queue',
  },
  {
    key: 'admin',
    email: 'admin@demo.dev',
    name: 'Vikram Singh',
    role: 'ADMIN',
    description: 'Full admin access',
  },
];

/** Also seeded (not offered as a quick login): demonstrates the 403 ACCOUNT_SUSPENDED error. */
export const SUSPENDED_ACCOUNT = {
  email: 'suspended@demo.dev',
  name: 'Nikhil Verma',
  role: 'STUDENT',
};

/** Seeded certificate numbers for trying the public verification page. */
export const DEMO_CERTIFICATES = {
  valid: 'IP-2026-000123',
  revoked: 'IP-2026-000045',
};
