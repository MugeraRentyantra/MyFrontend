import { useQueries, useQuery } from '@tanstack/react-query';
import { getAdminPayments, getAdminStats } from '@/services/adminService';
import { queryKeys } from '@/services/queryKeys';
import { PAYMENT_STATUS } from '@/shared/constants';
import { ATTENTION_REASONS, DASHBOARD_REFRESH_MS } from '../constants';

/** KPI numbers and chart series for /admin (KD1, GET /admin/stats). Refreshes every minute while open. */
export function useAdminStats(options = {}) {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => getAdminStats(),
    refetchInterval: DASHBOARD_REFRESH_MS,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Payments needing attention (VerificationTable): flagged, PENDING and FAILED
// ---------------------------------------------------------------------------

const ATTENTION_PAGE_LIMIT = 6;

const ATTENTION_SOURCES = [
  { reason: ATTENTION_REASONS.FLAGGED, params: { flagged: 'true' } },
  { reason: ATTENTION_REASONS.PENDING, params: { status: PAYMENT_STATUS.PENDING } },
  { reason: ATTENTION_REASONS.FAILED, params: { status: PAYMENT_STATUS.FAILED } },
];

const REASON_RANK = {
  [ATTENTION_REASONS.FLAGGED]: 0,
  [ATTENTION_REASONS.PENDING]: 1,
  [ATTENTION_REASONS.FAILED]: 2,
};

function createdTime(payment) {
  const time = new Date(payment?.createdAt ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Merges the three lists into one queue: each payment once (with its most urgent reason), flagged first,
 * then pending, then failed; newest first inside a group. Module-level so React Query can memoise it.
 */
function combineAttention(results) {
  const byId = new Map();
  results.forEach((result, index) => {
    const { reason } = ATTENTION_SOURCES[index];
    const items = Array.isArray(result.data?.items) ? result.data.items : [];
    items.forEach((payment) => {
      if (!payment?._id) return;
      const existing = byId.get(payment._id);
      if (!existing || REASON_RANK[reason] < REASON_RANK[existing.reason]) {
        byId.set(payment._id, { ...payment, reason });
      }
    });
  });

  const items = [...byId.values()].sort(
    (a, b) => REASON_RANK[a.reason] - REASON_RANK[b.reason] || createdTime(b) - createdTime(a),
  );

  const totals = {};
  ATTENTION_SOURCES.forEach(({ reason }, index) => {
    const data = results[index].data;
    totals[reason] = data ? Math.max(0, Number(data.total ?? data.items?.length ?? 0) || 0) : null;
  });

  const hasAllData = results.every((result) => result.data !== undefined);
  const firstError = results.find((result) => result.isError)?.error ?? null;

  return {
    items: hasAllData ? items : undefined,
    totals,
    isLoading: results.some((result) => result.isPending),
    isFetching: results.some((result) => result.isFetching),
    isError: Boolean(firstError),
    error: firstError,
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

/** Flagged, pending and failed payments for the dashboard's verification table (a few of each). */
export function usePaymentsNeedingAttention() {
  return useQueries({
    queries: ATTENTION_SOURCES.map(({ params }) => {
      const requestParams = { ...params, page: 1, limit: ATTENTION_PAGE_LIMIT, sort: 'createdAt:desc' };
      return {
        queryKey: [...queryKeys.admin.payments, 'attention', requestParams],
        queryFn: () => getAdminPayments(requestParams),
        refetchInterval: DASHBOARD_REFRESH_MS,
      };
    }),
    combine: combineAttention,
  });
}

/**
 * Everything /admin needs: `stats` (the query), `attention` (merged payment queue) and `refresh()`
 * which reloads both.
 */
export function useAdminDashboard() {
  const stats = useAdminStats();
  const attention = usePaymentsNeedingAttention();

  const refresh = () => Promise.all([stats.refetch(), attention.refetch()]);
  const isRefreshing = (stats.isFetching && !stats.isPending) || (attention.isFetching && !attention.isLoading);

  return { stats, attention, refresh, isRefreshing };
}

export default useAdminDashboard;
