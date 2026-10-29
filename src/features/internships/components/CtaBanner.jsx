import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui';
import { useAuth } from '@/shared/hooks';
import { ROUTES, getHomeRoute } from '@/shared/constants';
import { ArrowRight } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const GRID_MASK =
  '[mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]';

/** Closing call to action of the home page. */
export function CtaBanner({ className }) {
  const { isAuthenticated, user } = useAuth();

  return (
    <section aria-labelledby="cta-heading" className={cn('bg-white pb-16 sm:pb-20', className)}>
      <div className="container-page">
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 px-6 py-12 text-center shadow-elevated sm:px-12 sm:py-16">
          <div
            className={cn('bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60', GRID_MASK)}
            aria-hidden="true"
          />
          <div className="mx-auto max-w-2xl">
            <h2
              id="cta-heading"
              className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Ready to prove your skills?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-brand-100">
              Pick an internship, take the assessment and see your discount in minutes. Your first
              day-wise task is waiting.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                as={Link}
                to={ROUTES.CATALOG}
                size="lg"
                variant="outline"
                rightIcon={ArrowRight}
                className="border-transparent bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-white focus-visible:ring-offset-brand-700"
              >
                Explore internships
              </Button>
              {isAuthenticated ? (
                <Button
                  as={Link}
                  to={getHomeRoute(user)}
                  size="lg"
                  variant="ghost"
                  className="text-white ring-1 ring-inset ring-white/40 hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-brand-700"
                >
                  Go to your dashboard
                </Button>
              ) : (
                <Button
                  as={Link}
                  to={ROUTES.REGISTER}
                  size="lg"
                  variant="ghost"
                  className="text-white ring-1 ring-inset ring-white/40 hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-brand-700"
                >
                  Create a free account
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CtaBanner;
