import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, PageHeader, StatusBanner, toast } from '@/shared/components/ui';
import { ROUTES, TEAM_MAX_INVITES, TEAM_STATUS, paths } from '@/shared/constants';
import { useDocumentTitle } from '@/shared/hooks';
import { getErrorMessage } from '@/shared/utils/errors';
import { pluralize } from '@/shared/utils/helpers';
import { HowTeamsWork } from '../components/HowTeamsWork';
import { TeamForm } from '../components/TeamForm';
import { useMyTeams } from '../hooks/useMyTeams';

/** /team/new?designationId=&planId= — create a team and invite teammates (SN10). */
export function TeamCreatePage() {
  useDocumentTitle('Create a team');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('planId') || '';
  const designationId = searchParams.get('designationId') || '';
  const { data: teams } = useMyTeams();
  const currentTeam = (teams ?? []).find((team) => team && team.status !== TEAM_STATUS.DISBANDED);

  const handleCreated = ({ team, invited, inviteError }) => {
    if (inviteError) {
      toast.warning('Team created, but the invites were not sent', {
        description: `${getErrorMessage(inviteError)} You can invite teammates from the team page.`,
      });
    } else if (invited.length > 0) {
      toast.success('Team created', {
        description: `Invites sent to ${pluralize(invited.length, 'teammate')}.`,
      });
    } else {
      toast.success('Team created', { description: 'Invite your teammates from the team page.' });
    }
    navigate(paths.team(team._id), { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', to: ROUTES.DASHBOARD }, { label: 'Create a team' }]}
        title="Create a team"
        description={`Do your internship with up to ${TEAM_MAX_INVITES} classmates: one shared schedule, task board and repository.`}
      />

      {currentTeam ? (
        <StatusBanner
          variant="info"
          title={`You're already in ${currentTeam.name}`}
          action={
            <Button as={Link} to={paths.team(currentTeam._id)} variant="outline" size="sm">
              Open team
            </Button>
          }
        >
          Open it to follow your team, or create a new team below for a different internship.
        </StatusBanner>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 lg:col-span-2">
          <TeamForm
            key={`${planId}:${designationId}`}
            initialPlanId={planId}
            initialDesignationId={designationId}
            onCreated={handleCreated}
          />
        </div>
        <HowTeamsWork className="lg:sticky lg:top-24" />
      </div>
    </div>
  );
}

export default TeamCreatePage;
