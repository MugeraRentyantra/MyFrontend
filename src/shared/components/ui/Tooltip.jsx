import { cloneElement, isValidElement, useEffect, useId, useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { hasContent, joinIds } from './internal/fieldStyles';

/**
 * The positioned layer uses padding (not margin) for the gap, so the pointer can travel from
 * the trigger onto the bubble without the tooltip closing (WCAG 1.4.13 "hoverable").
 */
const SIDE_CLASSES = {
  top: 'bottom-full left-1/2 -translate-x-1/2 pb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 pt-2',
  left: 'right-full top-1/2 -translate-y-1/2 pr-2',
  right: 'left-full top-1/2 -translate-y-1/2 pl-2',
};

/**
 * Tooltip — wraps a single child and shows `content` on hover and keyboard focus
 * (side [top] top|bottom|left|right). Esc hides it. While visible the child gets
 * aria-describedby pointing at the role="tooltip" bubble. Supplementary text only:
 * never put essential information or interactive content in a tooltip.
 */
export function Tooltip({
  content,
  side = 'top',
  children,
  className,
  contentClassName,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const enabled = hasContent(content);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!enabled) return children ?? null;

  const describedBy = open ? tooltipId : null;
  const trigger = isValidElement(children) ? (
    cloneElement(children, {
      'aria-describedby': joinIds(children.props['aria-describedby'], describedBy),
    })
  ) : (
    // Plain text needs to be focusable so keyboard users can reach the tooltip too.
    <span tabIndex={0} aria-describedby={describedBy || undefined}>
      {children}
    </span>
  );

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={(event) => {
        if (onMouseEnter) onMouseEnter(event);
        setOpen(true);
      }}
      onMouseLeave={(event) => {
        if (onMouseLeave) onMouseLeave(event);
        setOpen(false);
      }}
      onFocus={(event) => {
        if (onFocus) onFocus(event);
        setOpen(true);
      }}
      onBlur={(event) => {
        if (onBlur) onBlur(event);
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      {...rest}
    >
      {trigger}
      <span
        role="tooltip"
        id={tooltipId}
        className={cn(
          'absolute z-50 w-max max-w-xs',
          SIDE_CLASSES[side] || SIDE_CLASSES.top,
          !open && 'hidden',
        )}
      >
        <span
          className={cn(
            'block animate-fade-in rounded-md bg-slate-900 px-2 py-1 text-left text-xs font-medium leading-snug text-white shadow-lg',
            contentClassName,
          )}
        >
          {content}
        </span>
      </span>
    </span>
  );
}

export default Tooltip;
