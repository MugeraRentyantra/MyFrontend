import { forwardRef } from 'react';
import { cn } from '@/shared/utils/cn';

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

/**
 * Surface container (SN2). Compose sections with `padding="none"`:
 *   <Card padding="none"><CardHeader title="…" /><CardBody>…</CardBody><CardFooter>…</CardFooter></Card>
 * `interactive` adds hover + focus styles for clickable cards, e.g. <Card as={Link} to="/x" interactive>.
 */
export const Card = forwardRef(function Card(
  { as: Component = 'div', padding = 'md', interactive = false, className, children, ...rest },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-card',
        PADDING[padding] ?? PADDING.md,
        interactive &&
          'block transition duration-150 hover:border-slate-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});

/**
 * Card section title row: optional icon chip, title (h2 by default), description and a right-aligned action.
 * Has no bottom padding when followed by a body; gets it back when it is the card's last child.
 */
export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
  titleAs: TitleTag = 'h2',
  className,
  children,
  ...rest
}) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 px-5 pt-5 last:pb-5', className)}
      {...rest}
    >
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          {title ? (
            <TitleTag className="text-base font-semibold tracking-tight text-slate-900">
              {title}
            </TitleTag>
          ) : null}
          {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
          {children}
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, children, ...rest }) {
  return (
    <div className={cn('px-5 py-5', className)} {...rest}>
      {children}
    </div>
  );
}

/** Alias of CardBody. */
export const CardContent = CardBody;

/** Muted footer with a top border; actions are right-aligned. */
export function CardFooter({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-5 py-3',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
