import { Link } from 'react-router-dom';
import { APP_NAME } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';

const SIZES = {
  sm: { mark: 'h-7 w-7', text: 'text-sm' },
  md: { mark: 'h-8 w-8', text: 'text-base' },
  lg: { mark: 'h-10 w-10', text: 'text-lg' },
};

/** Brand square with the "IP" monogram (same drawing as public/favicon.svg). */
function LogoMark({ size, inverted }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg shadow-sm',
        SIZES[size].mark,
        inverted ? 'bg-white text-brand-700' : 'bg-brand-600 text-white',
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" fill="currentColor" className="h-full w-full" focusable="false">
        <path d="M9 22V10h3v12H9Z" />
        <path d="M15 22V10h4.6c2.7 0 4.4 1.5 4.4 3.9 0 2.5-1.7 4-4.4 4H18v4.1h-3Zm3-6.6h1.4c1 0 1.6-.6 1.6-1.5s-.6-1.5-1.6-1.5H18v3Z" />
      </svg>
    </span>
  );
}

/**
 * Product logo: mark + APP_NAME. `to` wraps it in a router Link labelled "{APP_NAME} home";
 * `inverted` is for dark/brand backgrounds.
 */
export function Logo({ size = 'md', withText = true, to, inverted = false, className, ...rest }) {
  const sizeKey = SIZES[size] ? size : 'md';
  const content = (
    <>
      <LogoMark size={sizeKey} inverted={inverted} />
      {withText ? (
        <span
          className={cn(
            'truncate font-semibold tracking-tight',
            SIZES[sizeKey].text,
            inverted ? 'text-white' : 'text-slate-900',
          )}
        >
          {APP_NAME}
        </span>
      ) : null}
    </>
  );
  const base = 'inline-flex min-w-0 items-center gap-2';

  if (to) {
    return (
      <Link
        to={to}
        aria-label={`${APP_NAME} home`}
        className={cn(
          base,
          'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          inverted
            ? 'focus-visible:ring-white focus-visible:ring-offset-transparent'
            : 'focus-visible:ring-brand-500',
          className,
        )}
        {...rest}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className={cn(base, className)}
      role={withText ? undefined : 'img'}
      aria-label={withText ? undefined : APP_NAME}
      {...rest}
    >
      {content}
    </span>
  );
}

export default Logo;
