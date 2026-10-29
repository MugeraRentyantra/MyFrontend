import { PageHeader, PageLoader } from '@/shared/components/ui';
import { useEnrollments } from '@/features/applications/hooks/useApplications';
import { useMyTeams } from '@/features/teams/hooks/useMyTeams';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { AccountDetails } from '../components/AccountDetails';
import { ProfileForm } from '../components/ProfileForm';
import { ProfileGithubSection } from '../components/ProfileGithubSection';
import { ResumeSection } from '../components/ResumeSection';
import { useProfile } from '../hooks/useProfile';
import { useScrollToHash } from '../hooks/useScrollToHash';

/**
 * /profile (GP11): account details, editable name, GitHub connection (section #github, the
 * target of the OAuth callback) and the student's internship record.
 */
export default function ProfilePage() {
  useDocumentTitle('Profile');
  const { user } = useProfile();
  const enrollmentsQuery = useEnrollments();
  const teamsQuery = useMyTeams();

  // Wait until the GitHub section has its final layout before jumping to #github.
  useScrollToHash(Boolean(user) && !enrollmentsQuery.isLoading && !teamsQuery.isLoading);

  if (!user) return <PageLoader label="Loading your profile…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account, your GitHub connection and your internship record."
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <AccountDetails user={user} className="xl:col-span-2" />
        <ProfileForm user={user} className="xl:col-span-3" />
      </div>

      <ProfileGithubSection className="pt-2" />

      <ResumeSection className="pt-2" />
    </div>
  );
}
