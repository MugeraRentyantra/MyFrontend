import { useQuery } from '@tanstack/react-query';
import { getTrainerStats } from '@/services/trainerService';
import { queryKeys } from '@/services/queryKeys';

/**
 * KPI counts for the trainer workspace (KD9):
 * { pending, changesRequested, reviewedToday, assignedStudents, assignedTeams }.
 * Shares its key with TrainerLayout's pending badge, so both stay in sync.
 */
export function useTrainerStats() {
  return useQuery({
    queryKey: queryKeys.trainer.stats,
    queryFn: getTrainerStats,
  });
}

export default useTrainerStats;
