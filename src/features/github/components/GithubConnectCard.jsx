import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  Skeleton,
  toast,
} from '@/shared/components/ui';
import { CheckCircle2, ExternalLink, GithubIcon, KeyRound, Lock, ShieldCheck } from '@/shared/icons';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatDate } from '@/shared/utils/helpers';
import {
  useConnectGithub,
  useDisconnectGithub,
  useGithubConnection,
} from '../hooks/useGithubConnection';

const SAFEGUARDS = [
  {
    icon: ShieldCheck,
    title: 'Least-privilege access',
    text: 'We request only the permissions needed to link your account and check the repositories you submit.',
  },
  {
    icon: Lock,
    title: 'Your password stays with GitHub',
    text: 'You sign in on github.com. We never see or store your GitHub password.',
  },
  {
    icon: KeyRound,
    title: 'Tokens never reach your browser',
    text: 'Access tokens are kept on our servers and are never shown in the portal.',
  },
];

const CONNECT_ERROR = "We couldn't start the GitHub connection. Please try again.";

/** Only follow https URLs or our own origin (mock mode), never javascript: or data: URLs. */
function isSafeRedirect(url) {
  if (typeof window === 'undefined' || !url) return false;
  try {
    const target = new URL(url, window.location.origin);
    return target.protocol === 'https:' || target.origin === window.location.origin;
  } catch {
    return false;
  }
}

function LoadingCard({ className }) {
  return (
    <Card padding="none" className={className} aria-busy="true">
      <CardHeader icon={GithubIcon} title="GitHub" description="Checking your connection…" />
      <CardBody className="space-y-3">
        <Skeleton className="h-16 w-full" rounded="lg" />
        <Skeleton className="h-4 w-2/3" />
      </CardBody>
    </Card>
  );
}

/**
 * GitHub account connection for individual internships (GP10, SD9).
 * Not connected: explains the OAuth safeguards and starts the flow. Connected: username link,
 * connected date, granted scopes and a confirmed "Disconnect". Tokens are never displayed.
 */
export function GithubConnectCard({ className }) {
  const connectionQuery = useGithubConnection();
  const connect = useConnectGithub();
  const disconnect = useDisconnectGithub();
  const confirm = useDisclosure();
  const [redirecting, setRedirecting] = useState(false);

  if (connectionQuery.isLoading) return <LoadingCard className={className} />;

  if (connectionQuery.isError) {
    return (
      <Card className={className}>
        <ErrorState
          compact
          title="Couldn't load your GitHub connection"
          error={connectionQuery.error}
          onRetry={() => connectionQuery.refetch()}
        />
      </Card>
    );
  }

  const connection = connectionQuery.data;

  const handleConnect = () => {
    connect.mutate(undefined, {
      onSuccess: (data) => {
        const url = data?.authorizationUrl;
        if (!isSafeRedirect(url)) {
          toast.error(CONNECT_ERROR);
          return;
        }
        setRedirecting(true);
        window.location.assign(url);
      },
      onError: (error) => toast.error(getErrorMessage(error, CONNECT_ERROR)),
    });
  };

  const closeConfirm = () => {
    if (!disconnect.isPending) confirm.close();
  };

  const handleDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        confirm.close();
        toast.success('GitHub disconnected', {
          description: 'You can connect your account again at any time.',
        });
      },
      onError: (error) =>
        toast.error(getErrorMessage(error, "We couldn't disconnect GitHub. Please try again.")),
    });
  };

  if (!connection?.connected) {
    return (
      <Card padding="none" className={className}>
        <CardHeader
          icon={GithubIcon}
          title="Connect GitHub"
          description="Link your GitHub account so your trainer can review the code you push for individual internships."
          action={<Badge variant="neutral">Not connected</Badge>}
        />
        <CardBody>
          <ul className="space-y-4">
            {SAFEGUARDS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{title}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
        <CardFooter className="justify-between">
          <p className="text-xs text-slate-500">You&apos;ll continue on GitHub, then come back here.</p>
          <Button
            leftIcon={GithubIcon}
            loading={connect.isPending || redirecting}
            onClick={handleConnect}
          >
            Connect GitHub
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const username = connection.githubUsername || '';
  const scopes = connection.scopes ?? [];

  return (
    <Card padding="none" className={className}>
      <CardHeader
        icon={GithubIcon}
        title="GitHub"
        description="Your account is linked for individual internships."
        action={
          <Badge variant="success" icon={CheckCircle2}>
            Connected
          </Badge>
        }
      />
      <CardBody className="space-y-5">
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
            <GithubIcon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {username ? (
              <a
                href={`https://github.com/${encodeURIComponent(username)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link inline-flex max-w-full items-center gap-1 rounded-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <span className="truncate">@{username}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens GitHub in a new tab)</span>
              </a>
            ) : (
              <p className="text-sm font-medium text-slate-900">GitHub account</p>
            )}
            <p className="mt-0.5 text-xs text-slate-500">
              Connected {connection.connectedAt ? `on ${formatDate(connection.connectedAt)}` : ''}
            </p>
          </div>
        </div>

        {scopes.length > 0 ? (
          <div>
            <p
              id="github-scopes-label"
              className="text-xs font-medium uppercase tracking-wide text-slate-500"
            >
              Permissions granted
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-labelledby="github-scopes-label">
              {scopes.map((scope) => (
                <li key={scope}>
                  <Badge variant="neutral" className="font-mono">
                    {scope}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-xs text-slate-500">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Your access token stays on our servers and is never shown here.</span>
        </p>
      </CardBody>
      <CardFooter>
        <Button
          variant="outline"
          className="text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          onClick={confirm.open}
        >
          Disconnect
        </Button>
      </CardFooter>

      <ConfirmDialog
        open={confirm.isOpen}
        onClose={closeConfirm}
        onConfirm={handleDisconnect}
        title="Disconnect GitHub?"
        message={
          username
            ? `@${username} will be unlinked from your account. Your repositories and past submissions are not affected, and you can connect again at any time.`
            : 'Your GitHub account will be unlinked. Your past submissions are not affected, and you can connect again at any time.'
        }
        confirmLabel="Disconnect"
        variant="danger"
        loading={disconnect.isPending}
      />
    </Card>
  );
}

export default GithubConnectCard;
