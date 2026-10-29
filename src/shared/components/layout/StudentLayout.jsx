import { useMemo } from 'react';
// Hook modules are imported directly (not the feature barrels) so the eagerly loaded shell
// does not pull feature UI components into the main bundle.
import { useActiveEnrollment } from '@/features/applications/hooks/useApplications';
import { useMyTeams } from '@/features/teams/hooks/useMyTeams';
import { ROUTES, TEAM_STATUS } from '@/shared/constants';
import { DashboardLayout } from './DashboardLayout';
import { getStudentNavigation } from './navigation';

/**
 * Student workspace (GP2): Dashboard, Schedule, Tasks, Team (team students only),
 * Certificate, Profile and Browse internships.
 */
export function StudentLayout() {
  const { enrollment } = useActiveEnrollment();
  const { data: teams } = useMyTeams();

  const teamId = useMemo(() => {
    const fromEnrollment = enrollment?.teamId ?? enrollment?.team?._id ?? null;
    if (fromEnrollment) return fromEnrollment;
    const list = Array.isArray(teams) ? teams : [];
    const current = list.find((team) => team?.status !== TEAM_STATUS.DISBANDED) ?? list[0];
    return current?._id ?? null;
  }, [enrollment, teams]);

  const navigation = useMemo(() => getStudentNavigation({ teamId }), [teamId]);

  return <DashboardLayout navigation={navigation} roleLabel="Student" homeTo={ROUTES.DASHBOARD} />;
}

export default StudentLayout;
