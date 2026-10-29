import { useQuery } from '@tanstack/react-query';
import { getTrainerAssignments } from '@/services/trainerService';
import { queryKeys } from '@/services/queryKeys';
import { toItems } from '../utils/reviewHelpers';

/**
 * The students and teams assigned to the signed-in trainer (KD9, KD13). `data` is an array of
 * { _id, type, enrollmentId, teamId, student, team, plan, approvedTasks, totalTasks,
 *   pendingSubmissions, lastActivityAt }.
 */
export function useTrainerAssignments() {
  return useQuery({
    queryKey: queryKeys.trainer.assignments,
    queryFn: () => getTrainerAssignments(),
    select: toItems,
  });
}

export default useTrainerAssignments;
