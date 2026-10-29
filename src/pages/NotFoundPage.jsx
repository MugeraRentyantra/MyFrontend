import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { useDocumentTitle } from '@/shared/hooks';
import { ROUTES } from '@/shared/constants';
import { ArrowLeft, Briefcase, Home, Search, ShieldCheck } from '@/shared/icons';

const SUGGESTIONS = [
  { label: 'Browse internships', to: ROUTES.CATALOG, icon: Briefcase },
  { label: 'Verify a certificate', to: ROUTES.VERIFY_CERTIFICATE, icon: ShieldCheck },
];

/** React Router keeps an `idx` in history.state; > 0 means there is an in-app page to go back to. */
function canGoBack() {
  try {
    return Number(window.history.state?.idx ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Catch-all 404 inside the public layout. */
export function NotFoundPage() {
  useDocumentTitle('Page not found');
  const navigate = useNavigate();

  const handleBack = () => {
    if (canGoBack()) navigate(-1);
    else navigate(ROUTES.HOME);
  };

  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-8 ring-brand-50/60">
        <Search className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="eyebrow mt-6">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-base text-slate-600">
        The link may be broken or the page may have moved.
      </p>

      <div className="mt-8 flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row">
        <Button variant="outline" leftIcon={ArrowLeft} onClick={handleBack}>
          Go back
        </Button>
        <Button as={Link} to={ROUTES.HOME} leftIcon={Home}>
          Go to home
        </Button>
      </div>

      <div className="mt-10 w-full max-w-sm border-t border-slate-200 pt-6">
        <p className="text-sm text-slate-500">Or try one of these</p>
        <ul role="list" className="mt-3 flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-6">
          {SUGGESTIONS.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <Link to={to} className="link inline-flex items-center gap-1.5 py-1.5 text-sm">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default NotFoundPage;
