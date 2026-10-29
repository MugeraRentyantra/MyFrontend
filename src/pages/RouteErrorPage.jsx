import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useDocumentTitle } from '@/shared/hooks';
import { APP_NAME, SUPPORT_EMAIL } from '@/shared/constants';
import { AlertTriangle, Home, RefreshCw, Rocket, Search } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/**
 * Router-level error screen (SN1). It replaces RootLayout when anything below it throws,
 * so it is a complete standalone page. It deliberately avoids the UI kit: it must still
 * render when a chunk failed to load or a shared component is the thing that broke.
 */

const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

const BUTTON_BASE =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';
const BUTTON_PRIMARY = cn(BUTTON_BASE, 'bg-brand-600 text-white shadow-sm hover:bg-brand-700');
const BUTTON_OUTLINE = cn(
  BUTTON_BASE,
  'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900',
);

function getErrorKind(error) {
  if (isRouteErrorResponse(error) && error.status === 404) return 'not-found';
  const message = typeof error?.message === 'string' ? error.message : String(error ?? '');
  if (CHUNK_LOAD_ERROR.test(message)) return 'update';
  return 'unknown';
}

function describeError(error) {
  try {
    if (isRouteErrorResponse(error)) {
      const data =
        typeof error.data === 'string' ? error.data : JSON.stringify(error.data, null, 2);
      return [`${error.status} ${error.statusText || ''}`.trim(), data]
        .filter(Boolean)
        .join('\n\n');
    }
    if (error instanceof Error) {
      return [error.message, error.stack].filter(Boolean).join('\n\n');
    }
    return typeof error === 'string' ? error : JSON.stringify(error, null, 2) || String(error);
  } catch {
    return String(error);
  }
}

const CONTENT = {
  'not-found': {
    title: 'Page not found',
    message: 'The link may be broken or the page may have moved.',
    icon: Search,
    tone: 'bg-brand-50 text-brand-600',
    eyebrow: '404',
  },
  update: {
    title: 'A new version is available',
    message: 'We updated the app since you opened this tab. Reload to get the latest version.',
    icon: Rocket,
    tone: 'bg-brand-50 text-brand-600',
    eyebrow: 'Update',
  },
  unknown: {
    title: 'Something went wrong',
    message: 'An unexpected error stopped this page from loading. Reloading usually fixes it.',
    icon: AlertTriangle,
    tone: 'bg-rose-50 text-rose-600',
    eyebrow: 'Error',
  },
};

function reloadPage() {
  window.location.reload();
}

export function RouteErrorPage() {
  const error = useRouteError();
  const kind = getErrorKind(error);
  const content = CONTENT[kind];
  const Icon = content.icon;
  useDocumentTitle(content.title);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6"
      >
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-10">
          <p className="text-sm font-semibold text-slate-900">{APP_NAME}</p>
          <span
            className={cn(
              'mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full',
              content.tone,
            )}
          >
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="eyebrow mt-6">{content.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            {content.title}
          </h1>
          <p className="mt-3 text-sm text-slate-600">{content.message}</p>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            {kind === 'not-found' ? (
              <Link to="/" className={BUTTON_PRIMARY}>
                <Home className="h-4 w-4" aria-hidden="true" />
                Go to home
              </Link>
            ) : null}

            {kind === 'update' ? (
              <button type="button" onClick={reloadPage} className={BUTTON_PRIMARY}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Reload
              </button>
            ) : null}

            {kind === 'unknown' ? (
              <>
                <a href="/" className={BUTTON_OUTLINE}>
                  <Home className="h-4 w-4" aria-hidden="true" />
                  Go to home
                </a>
                <button type="button" onClick={reloadPage} className={BUTTON_PRIMARY}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reload
                </button>
              </>
            ) : null}
          </div>

          {kind === 'unknown' ? (
            <p className="mt-6 text-xs text-slate-500">
              Still stuck?{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="link">
                Contact support
              </a>
            </p>
          ) : null}

          {import.meta.env.DEV ? (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer rounded text-xs font-medium text-slate-500 hover:text-slate-700">
                Error details (development only)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 font-mono text-xs leading-5 text-slate-100">
                {describeError(error)}
              </pre>
            </details>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default RouteErrorPage;
