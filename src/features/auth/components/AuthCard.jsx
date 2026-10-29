import { useEffect, useRef } from 'react';
import { Card } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';

const ICON_TONES = {
  brand: 'bg-brand-100 text-brand-700 ring-brand-50',
  success: 'bg-emerald-100 text-emerald-700 ring-emerald-50',
  warning: 'bg-amber-100 text-amber-700 ring-amber-50',
  danger: 'bg-rose-100 text-rose-700 ring-rose-50',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-50',
};

/**
 * The card every auth page renders inside AuthLayout: optional icon, the page's only <h1>,
 * supporting text, the form or actions, and a muted footer for "Log in" / "Sign up" links.
 *
 * `autoFocusHeading` moves focus to the heading when the card mounts. Pages pass it (with a
 * `key`) when they swap one state for another (form -> "Check your email"), so keyboard and
 * screen-reader users land on the new content instead of on a button that disappeared.
 */
export function AuthCard({
  icon: Icon,
  tone = 'brand',
  align = 'left',
  eyebrow,
  title,
  description,
  footer,
  autoFocusHeading = false,
  className,
  children,
  ...rest
}) {
  const headingRef = useRef(null);
  const centered = align === 'center';

  useEffect(() => {
    if (autoFocusHeading) headingRef.current?.focus();
  }, [autoFocusHeading]);

  return (
    <Card padding="none" className={cn('animate-fade-in rounded-2xl', className)} {...rest}>
      <div className={cn('px-5 py-8 sm:px-8', centered && 'text-center')}>
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn(
              'mb-5 flex h-12 w-12 items-center justify-center rounded-full ring-8',
              ICON_TONES[tone] ?? ICON_TONES.brand,
              centered && 'mx-auto',
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
        ) : null}
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight text-slate-900 focus:outline-none"
        >
          {title}
        </h1>
        {description ? (
          <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div>
        ) : null}
        {children ? <div className={cn('mt-6', centered && 'text-left')}>{children}</div> : null}
      </div>
      {footer ? (
        <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-center text-sm text-slate-600 sm:px-8">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

export default AuthCard;
