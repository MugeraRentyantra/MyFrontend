import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Logo, PageLoader } from '@/shared/components/ui';
import {
  APP_NAME,
  ASSESSMENT_QUESTION_COUNT,
  ROUTES,
  SUPPORT_EMAIL,
} from '@/shared/constants';
import { Award, ClipboardCheck, FolderGit2, Percent } from '@/shared/icons';

const OUTLET_CONTEXT = Object.freeze({ shell: 'auth' });

const VALUE_PROPS = [
  {
    icon: ClipboardCheck,
    text: `A ${ASSESSMENT_QUESTION_COUNT}-question assessment — no pass or fail`,
  },
  { icon: Percent, text: 'Merit discount of up to 20% for individual enrollments' },
  { icon: FolderGit2, text: 'Real tasks, submitted through GitHub and reviewed by trainers' },
  { icon: Award, text: 'A verifiable certificate when you complete' },
];

const FOOTER_LINK_CLASS =
  'rounded-sm hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2';

/**
 * Split-screen shell for login, register, email verification and password reset (SN3/SN4).
 * The brand panel is decorative context on large screens; every auth page renders its
 * own card and <h1> in the form column.
 */
export function AuthLayout() {
  const year = new Date().getFullYear();

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <aside
        aria-label={`About ${APP_NAME}`}
        className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 p-12 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-grid opacity-50" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-400/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl"
        />

        <div className="relative">
          <Logo to={ROUTES.HOME} inverted />
        </div>

        <div className="relative max-w-lg">
          {/* Not a heading: each auth page owns the page's only <h1>. */}
          <p className="text-3xl font-semibold leading-tight tracking-tight">
            Learn by shipping real projects.
          </p>
          <p className="mt-4 text-base leading-7 text-brand-100">
            Take a short assessment, unlock your merit discount and build real software with a
            trainer reviewing every task.
          </p>
          <ul role="list" className="mt-10 space-y-5">
            {VALUE_PROPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                  <Icon className="h-5 w-5 text-white" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium leading-6 text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-brand-100">
          Checking someone&apos;s certificate?{' '}
          <Link
            to={ROUTES.VERIFY_CERTIFICATE}
            className="rounded-sm font-medium text-white underline underline-offset-4 hover:text-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Verify it here
          </Link>
        </p>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-4 sm:px-6 lg:hidden">
          <Logo to={ROUTES.HOME} />
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 items-center justify-center px-4 py-10 focus:outline-none sm:px-6"
        >
          <div className="w-full max-w-md">
            <Suspense fallback={<PageLoader />}>
              <Outlet context={OUTLET_CONTEXT} />
            </Suspense>
          </div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pb-6 text-xs text-slate-500">
          <span>
            © {year} {APP_NAME}
          </span>
          <Link to={ROUTES.TERMS} className={FOOTER_LINK_CLASS}>
            Terms & conditions
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={FOOTER_LINK_CLASS}>
            Contact support
          </a>
        </footer>
      </div>
    </div>
  );
}

export default AuthLayout;
