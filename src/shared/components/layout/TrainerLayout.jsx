import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTrainerStats } from '@/services/trainerService';
import { queryKeys } from '@/services/queryKeys';
import { ROUTES } from '@/shared/constants';
import { DashboardLayout } from './DashboardLayout';
import { getTrainerNavigation } from './navigation';

/** Keeps the sidebar's pending-review badge reasonably fresh while the trainer works. */
const STATS_REFRESH_MS = 60_000;

/** Trainer workspace (KD9): review queue with a pending badge, and reports. */
export function TrainerLayout() {
  const { data: stats } = useQuery({
    queryKey: queryKeys.trainer.stats,
    queryFn: getTrainerStats,
    refetchInterval: STATS_REFRESH_MS,
  });

  const pendingCount = Number(stats?.pending ?? 0) || 0;
  const navigation = useMemo(() => getTrainerNavigation({ pendingCount }), [pendingCount]);

  return <DashboardLayout navigation={navigation} roleLabel="Trainer" homeTo={ROUTES.TRAINER} />;
}

export default TrainerLayout;
