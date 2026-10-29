/** Status enums. Values match the API exactly (UPPER_CASE). */
export const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
});

export const PUBLISH_STATUS = Object.freeze({ DRAFT: 'DRAFT', PUBLISHED: 'PUBLISHED' });

export const SCHEDULE_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
});

export const ENROLLMENT_STATUS = Object.freeze({
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  ACTIVE: 'ACTIVE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  SUSPENDED: 'SUSPENDED',
});

/** Enrollment statuses that unlock paid content (schedule, SOPs, tasks). */
export const ACTIVE_ENROLLMENT_STATUSES = [
  ENROLLMENT_STATUS.ACTIVE,
  ENROLLMENT_STATUS.IN_PROGRESS,
  ENROLLMENT_STATUS.COMPLETED,
];

export const PAYMENT_STATUS = Object.freeze({
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
});

export const TASK_STATUS = Object.freeze({
  LOCKED: 'LOCKED',
  AVAILABLE: 'AVAILABLE',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  APPROVED: 'APPROVED',
});

export const TASK_STATUS_ORDER = [
  TASK_STATUS.CHANGES_REQUESTED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.AVAILABLE,
  TASK_STATUS.SUBMITTED,
  TASK_STATUS.APPROVED,
  TASK_STATUS.LOCKED,
];

export const REVIEW_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  REJECTED: 'REJECTED',
});

export const REVIEW_DECISION = Object.freeze({
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  REJECTED: 'REJECTED',
});

export const TEAM_STATUS = Object.freeze({
  FORMING: 'FORMING',
  READY: 'READY',
  ACTIVE: 'ACTIVE',
  DISBANDED: 'DISBANDED',
});

export const MEMBER_STATUS = Object.freeze({
  INVITED: 'INVITED',
  JOINED: 'JOINED',
  DECLINED: 'DECLINED',
  REMOVED: 'REMOVED',
});

export const CERTIFICATE_STATUS = Object.freeze({ ISSUED: 'ISSUED', REVOKED: 'REVOKED' });

export const EMAIL_STATUS = Object.freeze({ PENDING: 'PENDING', SENT: 'SENT', FAILED: 'FAILED' });

export const ENROLLMENT_TYPE = Object.freeze({ INDIVIDUAL: 'INDIVIDUAL', TEAM: 'TEAM' });

export const CHECK_STATUS = Object.freeze({ PASSED: 'PASSED', FAILED: 'FAILED', PENDING: 'PENDING' });

/**
 * Display metadata for every status value, consumed by <StatusBadge status=... />.
 * variant is one of: neutral | brand | success | warning | danger | info | purple | orange
 */
export const STATUS_META = Object.freeze({
  // Publishing / templates
  DRAFT: { label: 'Draft', variant: 'neutral' },
  PUBLISHED: { label: 'Published', variant: 'success' },
  ARCHIVED: { label: 'Archived', variant: 'neutral' },

  // Users
  PENDING_VERIFICATION: { label: 'Unverified', variant: 'warning' },
  ACTIVE: { label: 'Active', variant: 'success' },
  SUSPENDED: { label: 'Suspended', variant: 'danger' },

  // Enrollment
  PENDING_PAYMENT: { label: 'Pending payment', variant: 'warning' },
  IN_PROGRESS: { label: 'In progress', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },

  // Payments
  CREATED: { label: 'Created', variant: 'neutral' },
  PENDING: { label: 'Pending', variant: 'warning' },
  SUCCESS: { label: 'Success', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'danger' },
  REFUND_PENDING: { label: 'Refund pending', variant: 'orange' },
  REFUNDED: { label: 'Refunded', variant: 'purple' },

  // Tasks and reviews
  LOCKED: { label: 'Locked', variant: 'neutral' },
  AVAILABLE: { label: 'Available', variant: 'brand' },
  SUBMITTED: { label: 'Submitted', variant: 'purple' },
  CHANGES_REQUESTED: { label: 'Changes requested', variant: 'orange' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },

  // Teams
  FORMING: { label: 'Forming', variant: 'info' },
  READY: { label: 'Ready', variant: 'brand' },
  DISBANDED: { label: 'Disbanded', variant: 'neutral' },
  INVITED: { label: 'Invited', variant: 'warning' },
  JOINED: { label: 'Joined', variant: 'success' },
  DECLINED: { label: 'Declined', variant: 'danger' },
  REMOVED: { label: 'Removed', variant: 'neutral' },

  // Certificates, email and checks
  ISSUED: { label: 'Issued', variant: 'success' },
  REVOKED: { label: 'Revoked', variant: 'danger' },
  SENT: { label: 'Sent', variant: 'success' },
  QUEUED: { label: 'Queued', variant: 'neutral' },
  PASSED: { label: 'Passed', variant: 'success' },

  // Enrollment type
  INDIVIDUAL: { label: 'Individual', variant: 'neutral' },
  TEAM: { label: 'Team', variant: 'purple' },
});

function humanizeStatus(value) {
  if (!value) return 'Unknown';
  const text = String(value).toLowerCase().replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getStatusMeta(status) {
  return STATUS_META[status] ?? { label: humanizeStatus(status), variant: 'neutral' };
}
