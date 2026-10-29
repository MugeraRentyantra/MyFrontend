import { Link } from 'react-router-dom';
import { Badge, Button, Skeleton } from '@/shared/components/ui';
import { BadgeCheck, ExternalLink, GithubIcon, RefreshCw } from '@/shared/icons';
import { ROUTES, paths } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import { formatRepoName } from '../utils/dashboardHelpers';

/** Profile section that owns the GitHub connect/disconnect controls (SD9). */
const PROFILE_GITHUB = { pathname: ROUTES.PROFILE, hash: '#github' };

function Row({ title, detail, action, className }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white"
          aria-hidden="true"
        >
          <GithubIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
            {title}
          </div>
          {detail ? <div className="mt-0.5 min-w-0 text-sm text-slate-500">{detail}</div> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * GitHub status for the active enrollment. Individual: the student's connected account or a
 * "Connect GitHub" link to the profile. Team: the shared team repository instead.
 */
export function GithubStatusChip({
  isTeam = false,
  team,
  teamId,
  connection,
  isLoading = false,
  isError = false,
  onRetry,
  className,
}) {
  if (isTeam) {
    const repoUrl = team?.repoUrl;
    return (
      <Row
        className={className}
        title="Team repository"
        detail={
          repoUrl ? (
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="link inline-flex max-w-full items-center gap-1 font-mono text-xs"
            >
              <span className="truncate">{formatRepoName(repoUrl)}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            "Your team leader hasn't added the repository yet."
          )
        }
        action={
          teamId ? (
            <Button
              as={Link}
              to={paths.team(teamId)}
              variant="outline"
              size="sm"
              className="h-10 sm:h-8"
            >
              {repoUrl ? 'Team page' : 'Go to team'}
            </Button>
          ) : null
        }
      />
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-3', className)} aria-busy="true">
        <Skeleton className="h-9 w-9" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <span className="sr-only">Checking your GitHub connection</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Row
        className={className}
        title="GitHub"
        detail="We couldn't check your GitHub connection."
        action={
          onRetry ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={RefreshCw}
              onClick={() => onRetry()}
              className="h-10 sm:h-8"
            >
              Try again
            </Button>
          ) : null
        }
      />
    );
  }

  if (connection?.connected) {
    return (
      <Row
        className={className}
        title={
          <>
            GitHub
            <Badge variant="success" icon={BadgeCheck}>
              Connected
            </Badge>
          </>
        }
        detail={
          <span className="font-mono text-xs text-slate-600">
            @{connection.githubUsername ?? 'unknown'}
          </span>
        }
        action={
          <Button as={Link} to={PROFILE_GITHUB} variant="ghost" size="sm" className="h-10 sm:h-8">
            Manage
          </Button>
        }
      />
    );
  }

  return (
    <Row
      className={className}
      title="Connect GitHub"
      detail="Link your account so your trainer can follow your repositories."
      action={
        <Button as={Link} to={PROFILE_GITHUB} variant="outline" size="sm" className="h-10 sm:h-8">
          Connect GitHub
        </Button>
      }
    />
  );
}

export default GithubStatusChip;
