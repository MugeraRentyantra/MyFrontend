import { useMemo } from 'react';
import { getTrainerSubmissions } from '@/services/trainerService';
import { queryKeys } from '@/services/queryKeys';
import { REVIEW_STATUS } from '@/shared/constants';

/** The queue refreshes in the background so new submissions appear without a reload. */
export const QUEUE_REFRESH_MS = 60_000;

/**
 * Server-mode DataTable wiring for the review queue (KD9). The API returns the oldest submission
 * first. The status is part of the fetcher and the key prefix (not a table filter), so an empty
 * queue shows the "all caught up" state rather than "no matching results".
 *   const { fetcher, queryKey, queryOptions } = useSubmissionQueue();
 */
export function useSubmissionQueue({ status = REVIEW_STATUS.PENDING } = {}) {
  return useMemo(
    () => ({
      fetcher: (params) => getTrainerSubmissions({ ...params, status }),
      queryKey: queryKeys.trainer.submissions({ status }),
      queryOptions: { refetchInterval: QUEUE_REFRESH_MS },
    }),
    [status],
  );
}

export default useSubmissionQueue;
