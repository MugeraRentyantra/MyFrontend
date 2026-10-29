import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CopyButton,
  StatusBadge,
} from '@/shared/components/ui';
import { ArrowRight, FolderGit2, GithubIcon, Info, Pencil } from '@/shared/icons';
import { useAuth } from '@/shared/hooks/useAuth';
import { paths } from '@/shared/constants';

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Team (group) enrollments push to one shared repository instead of a personal GitHub
 * connection (GP10, SD12). Read-only here; the leader edits it on the team page.
 */
export function TeamRepoCard({ team, className }) {
  const { user } = useAuth();
  if (!team) return null;

  const isLeader =
    Boolean(user?._id) && (team.leaderId === user._id || team.leader?._id === user._id);
  const repoUrl = team.repoUrl || '';
  const linkable = isHttpUrl(repoUrl);

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={FolderGit2}
        title="Team repository"
        description={
          <>
            Shared by everyone in <span className="font-medium text-slate-700">{team.name}</span>
          </>
        }
        action={team.status ? <StatusBadge status={team.status} /> : null}
      />
      <CardBody className="space-y-4">
        {repoUrl ? (
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <GithubIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500">Repository URL</p>
              {linkable ? (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={repoUrl}
                  className="link block truncate rounded-sm font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {repoUrl}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <p className="truncate font-mono text-xs text-slate-700" title={repoUrl}>
                  {repoUrl}
                </p>
              )}
            </div>
            <CopyButton value={repoUrl} iconOnly label="Copy repository URL" variant="ghost" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
            {isLeader
              ? 'Add your team’s shared repository on the team page so everyone pushes to the same place.'
              : 'Your team leader hasn’t added the shared repository yet. It will appear here once they do.'}
          </div>
        )}
        <p className="flex items-start gap-2 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden="true" />
          <span>Group enrollments use the shared repository — no GitHub connection needed.</span>
        </p>
      </CardBody>
      <CardFooter>
        {isLeader ? (
          <Button as={Link} to={paths.team(team._id)} variant="outline" leftIcon={Pencil}>
            Edit on team page
          </Button>
        ) : (
          <Button as={Link} to={paths.team(team._id)} variant="ghost" rightIcon={ArrowRight}>
            View team
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default TeamRepoCard;
