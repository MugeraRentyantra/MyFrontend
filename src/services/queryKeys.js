/**
 * Central React Query keys. Always build keys from here so invalidation is consistent:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all })
 * Every key starts with its domain, so invalidating the domain prefix refreshes all of it.
 */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'],
  },
  catalog: {
    all: ['catalog'],
    designations: (params = {}) => ['catalog', 'designations', params],
    designation: (idOrSlug) => ['catalog', 'designation', idOrSlug],
    domains: (params = {}) => ['catalog', 'domains', params],
    plans: (params = {}) => ['catalog', 'plans', params],
    schedulePreview: (planId) => ['catalog', 'schedule-preview', planId],
  },
  assessment: {
    all: ['assessment'],
    questions: (designationId) => ['assessment', 'questions', designationId],
    attempt: (designationId) => ['assessment', 'attempt', designationId],
    myAttempts: ['assessment', 'attempts', 'mine'],
  },
  terms: {
    latest: ['terms', 'latest'],
  },
  enrollments: {
    all: ['enrollments'],
    list: ['enrollments', 'list'],
    detail: (id) => ['enrollments', 'detail', id],
    schedule: (id) => ['enrollments', 'schedule', id],
    sop: (id, day) => ['enrollments', 'sop', id, String(day)],
    tasks: (id) => ['enrollments', 'tasks', id],
  },
  tasks: {
    all: ['tasks'],
    content: (progressId) => ['tasks', 'content', progressId],
    submissions: (progressId) => ['tasks', 'submissions', progressId],
  },
  teams: {
    all: ['teams'],
    mine: ['teams', 'mine'],
    detail: (id) => ['teams', 'detail', id],
    readiness: (id) => ['teams', 'readiness', id],
    progress: (id) => ['teams', 'progress', id],
    invite: (token) => ['teams', 'invite', token],
  },
  github: {
    connection: ['github', 'connection'],
  },
  certificates: {
    all: ['certificates'],
    mine: ['certificates', 'mine'],
    verify: (certificateNo) => ['certificates', 'verify', certificateNo],
  },
  admin: {
    all: ['admin'],
    stats: ['admin', 'stats'],
    users: ['admin', 'users'],
    designations: ['admin', 'designations'],
    domains: ['admin', 'domains'],
    plans: ['admin', 'plans'],
    assessments: ['admin', 'assessments'],
    assessment: (designationId) => ['admin', 'assessments', designationId],
    schedules: ['admin', 'schedules'],
    schedule: (id) => ['admin', 'schedules', 'detail', id],
    scheduleVersions: (id) => ['admin', 'schedules', 'versions', id],
    scheduleTasks: (id) => ['admin', 'schedules', 'tasks', id],
    enrollments: ['admin', 'enrollments'],
    enrollment: (id) => ['admin', 'enrollments', 'detail', id],
    payments: ['admin', 'payments'],
    payment: (id) => ['admin', 'payments', 'detail', id],
    teams: ['admin', 'teams'],
    assignments: ['admin', 'assignments'],
    certificates: ['admin', 'certificates'],
    audit: ['admin', 'audit'],
  },
  trainer: {
    all: ['trainer'],
    stats: ['trainer', 'stats'],
    assignments: ['trainer', 'assignments'],
    submissions: (params = {}) => ['trainer', 'submissions', params],
    submission: (id) => ['trainer', 'submission', id],
  },
};

export default queryKeys;
