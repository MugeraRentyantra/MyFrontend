import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, ErrorState, PageHeader, Spinner, toast } from '@/shared/components/ui';
import { GithubIcon } from '@/shared/icons';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { ROUTES } from '@/shared/constants';
import { queryKeys } from '@/services/queryKeys';
import { useCompleteGithubCallback } from '../hooks/useGithubConnection';

const PROFILE_GITHUB = `${ROUTES.PROFILE}#github`;

/**
 * Which callback we received:
 *  exchange  ?code&state            (mock gateway, or a backend that lets the SPA finish OAuth)
 *  connected ?status=connected      (real backend finished OAuth server-side and redirected)
 *  error     ?status=error | ?error (GitHub or the backend reported a failure)
 *  missing   nothing usable
 */
function getMode({ code, state, status, oauthError }) {
  if (status === 'connected') return 'connected';
  if (status === 'error' || oauthError) return 'error';
  if (code && state) return 'exchange';
  return 'missing';
}

function ProgressCard({ title, description }) {
  return (
    <Card padding="lg" className="mx-auto max-w-lg text-center">
      <div role="status" className="flex flex-col items-center gap-4 py-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
          <GithubIcon className="h-7 w-7" aria-hidden="true" />
        </span>
        <span aria-hidden="true">
          <Spinner size="md" />
        </span>
        <div>
          <p className="text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </Card>
  );
}

/**
 * /github/callback (GP10, SD9): finishes the GitHub OAuth flow exactly once (ref guard, safe in
 * StrictMode), then returns the student to /profile#github. Credentials are never shown here.
 */
export default function GithubCallbackPage() {
  useDocumentTitle('Connecting GitHub');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mutateAsync } = useCompleteGithubCallback();
  const startedRef = useRef(false);
  const mountedRef = useRef(true);
  const [exchangeError, setExchangeError] = useState(null);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const status = searchParams.get('status');
  const oauthError = searchParams.get('error');
  const mode = getMode({ code, state, status, oauthError });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;

    if (mode === 'connected') {
      startedRef.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.github.connection });
      toast.success('GitHub connected');
      navigate(PROFILE_GITHUB, { replace: true });
      return;
    }

    if (mode === 'exchange') {
      startedRef.current = true;
      // mutateAsync (not per-call callbacks): the promise settles even if the observer was
      // detached by StrictMode's simulated unmount.
      mutateAsync({ code, state })
        .then((data) => {
          toast.success('GitHub connected', {
            description: data?.githubUsername
              ? `Linked to @${data.githubUsername}.`
              : 'Your account is now linked.',
          });
          if (mountedRef.current) navigate(PROFILE_GITHUB, { replace: true });
        })
        .catch((error) => {
          if (mountedRef.current) {
            setExchangeError(error ?? new Error('GitHub authorization failed. Please try again.'));
          }
        });
    }
  }, [mode, code, state, mutateAsync, navigate, queryClient]);

  const backToProfile = () => navigate(PROFILE_GITHUB, { replace: true });

  let content;
  if (mode === 'missing') {
    content = (
      <Card className="mx-auto max-w-lg">
        <ErrorState
          compact
          title="Nothing to finish here"
          message="This page opens after you approve access on GitHub. Start again from your profile."
          onRetry={backToProfile}
          retryLabel="Go to profile"
        />
      </Card>
    );
  } else if (mode === 'error') {
    content = (
      <Card className="mx-auto max-w-lg">
        <ErrorState
          compact
          title="We couldn't connect GitHub"
          message={
            oauthError === 'access_denied'
              ? 'You cancelled the request on GitHub, so nothing was changed.'
              : 'GitHub sign-in did not complete. No changes were made to your account.'
          }
          onRetry={backToProfile}
          retryLabel="Try again"
        />
      </Card>
    );
  } else if (mode === 'exchange' && exchangeError) {
    content = (
      <Card className="mx-auto max-w-lg">
        <ErrorState
          compact
          title="We couldn't connect GitHub"
          error={exchangeError}
          onRetry={backToProfile}
          retryLabel="Try again"
        />
      </Card>
    );
  } else {
    content = (
      <ProgressCard
        title={mode === 'connected' ? 'GitHub connected' : 'Connecting your GitHub account…'}
        description={
          mode === 'connected'
            ? 'Taking you back to your profile.'
            : 'This only takes a moment. Please keep this tab open.'
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connect GitHub"
        description="Linking your GitHub account to your internship profile."
        backTo={{ label: 'Back to profile', to: PROFILE_GITHUB }}
      />
      {content}
    </div>
  );
}
