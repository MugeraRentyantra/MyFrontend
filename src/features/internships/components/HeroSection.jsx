import { Link } from 'react-router-dom';
import { Avatar, Badge, Button, ProgressBar } from '@/shared/components/ui';
import { ROUTES } from '@/shared/constants';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Coffee,
  Container,
  Database,
  GitCommit,
  GithubIcon,
  Hexagon,
  Layers,
  Lock,
  Percent,
  ShieldCheck,
  Sparkles,
  Timer,
  Workflow,
} from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { MAX_EXAMPLE_DISCOUNT_PERCENT } from '../utils/catalogFormat';

const HIGHLIGHTS = ['No pass or fail', 'One attempt, no timer', 'Certificates anyone can verify'];

const PREVIEW_TASKS = [
  { title: 'Fix the failing transfer service', status: 'Approved', variant: 'success', icon: CheckCircle2, iconClass: 'text-emerald-600' },
  { title: 'Add JPA persistence for ledgers', status: 'In review', variant: 'info', icon: Timer, iconClass: 'text-sky-600' },
  { title: 'Write JUnit tests for statements', status: 'Locked', variant: 'neutral', icon: Lock, iconClass: 'text-slate-400' },
];

const MASK_TOP =
  '[mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] [-webkit-mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]';

/**
 * Decorative "student dashboard" built from UI kit pieces. Hidden from assistive tech:
 * it illustrates the product and contains no real data or controls.
 */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md sm:pb-14 sm:pt-24 lg:max-w-lg" aria-hidden="true">
      <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-elevated sm:p-6">
        <div className="flex items-center gap-3">
          <Avatar name="Aarav Sharma" size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">Aarav Sharma</p>
            <p className="truncate text-xs text-slate-500">Java Developer · Banking</p>
          </div>
          <Badge variant="info" dot>
            Day 12
          </Badge>
        </div>

        <ProgressBar className="mt-5" value={40} label="Internship progress" showValue />

        <ul className="mt-5 space-y-2.5">
          {PREVIEW_TASKS.map(({ title, status, variant, icon: Icon, iconClass }) => (
            <li
              key={title}
              className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5"
            >
              <Icon className={cn('h-4 w-4 shrink-0', iconClass)} />
              <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{title}</span>
              <Badge variant={variant}>{status}</Badge>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-300">
          <GitCommit className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">feat: add daily transfer limits</span>
          <span className="ml-auto shrink-0 text-slate-500">a1b2c3d</span>
        </div>
      </div>

      <div className="absolute right-2 top-0 hidden w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-elevated sm:block lg:-right-4">
        <p className="text-xs font-medium text-slate-500">Assessment score</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">
          14 <span className="text-base font-medium text-slate-400">/ 15</span>
        </p>
        <Badge variant="brand" icon={Percent} className="mt-2">
          10% individual discount
        </Badge>
      </div>

      <div className="absolute bottom-0 left-2 hidden w-60 rounded-xl border border-slate-200 bg-white p-4 shadow-elevated sm:block lg:-left-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Certificate verified</p>
            <p className="truncate font-mono text-xs text-slate-500">IP-2026-000123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Home page hero (SN5): headline, two CTAs and the product visual. Renders the page's <h1>. */
export function HeroSection({ className }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className={cn(
        'relative isolate overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white',
        className,
      )}
    >
      <div
        className={cn('bg-grid pointer-events-none absolute inset-0 -z-10', MASK_TOP)}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 right-[-10%] -z-10 h-[28rem] w-[28rem] rounded-full bg-brand-200/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="container-page grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16 lg:py-24">
        <div className="max-w-2xl">
          <Badge variant="brand" size="md" icon={Sparkles}>
            Industry internships with real projects
          </Badge>
          <h1
            id="hero-heading"
            className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.5rem]"
          >
            Prove your skills. <span className="text-brand-600">Earn your discount.</span> Ship
            real projects.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Take one 15-question assessment, unlock a merit discount
            {MAX_EXAMPLE_DISCOUNT_PERCENT > 0 ? ` of up to ${MAX_EXAMPLE_DISCOUNT_PERCENT}%` : ''},
            then work through day-wise tasks reviewed by trainers on GitHub. Finish with a
            certificate anyone can verify.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to={ROUTES.CATALOG} size="lg" rightIcon={ArrowRight}>
              Explore internships
            </Button>
            <Button
              as={Link}
              to={ROUTES.VERIFY_CERTIFICATE}
              size="lg"
              variant="outline"
              leftIcon={ShieldCheck}
            >
              Verify a certificate
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

const STACKS = [
  { label: 'Java', icon: Coffee },
  { label: 'Full Stack', icon: Layers },
  { label: '.NET', icon: Hexagon },
  { label: 'DevOps', icon: Workflow },
  { label: 'Docker', icon: Container },
  { label: 'SQL', icon: Database },
  { label: 'GitHub', icon: GithubIcon },
];

/** Trust strip under the hero: the stacks the internship tracks are built on. */
export function TrustStrip({ className }) {
  return (
    <section
      aria-label="Technologies covered"
      className={cn('border-y border-slate-200 bg-white', className)}
    >
      <div className="container-page flex flex-col items-center gap-5 py-8 lg:flex-row lg:justify-between">
        <p className="text-center text-sm font-medium text-slate-500 lg:text-left">
          Tracks built on the stacks teams hire for
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
          {STACKS.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="flex items-center gap-2 text-sm font-semibold text-slate-500 sm:text-base"
            >
              <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default HeroSection;
