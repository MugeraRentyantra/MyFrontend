export const ROLES = Object.freeze({
  STUDENT: 'STUDENT',
  TRAINER: 'TRAINER',
  ADMIN: 'ADMIN',
});

export const ROLE_LIST = [ROLES.STUDENT, ROLES.TRAINER, ROLES.ADMIN];

export const ROLE_LABELS = Object.freeze({
  [ROLES.STUDENT]: 'Student',
  [ROLES.TRAINER]: 'Trainer',
  [ROLES.ADMIN]: 'Admin',
});

/** When a user has several roles, the first match decides where they land after login. */
export const ROLE_PRIORITY = [ROLES.ADMIN, ROLES.TRAINER, ROLES.STUDENT];

export function hasRole(user, role) {
  return Boolean(user?.roles?.includes(role));
}

export function hasAnyRole(user, roles = []) {
  if (!roles || roles.length === 0) return true;
  return roles.some((role) => hasRole(user, role));
}

export function getPrimaryRole(user) {
  return ROLE_PRIORITY.find((role) => hasRole(user, role)) ?? ROLES.STUDENT;
}
