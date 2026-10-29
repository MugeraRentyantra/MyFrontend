import { useId, useRef } from 'react';
import { X } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { OverlayPortal } from './internal/OverlayPortal';
import {
  useEscapeKey,
  useFocusTrap,
  useOverlayStack,
  useScrollLock,
} from './internal/overlayHooks';

const SIZES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-3xl',
};

/** Side panel for details and secondary flows. Full width on mobile. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  size = 'md',
  side = 'right',
  footer,
  children,
  className,
  ...rest
}) {
  const panelRef = useRef(null);
  const pointerDownOnOverlay = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const isTop = useOverlayStack(open);
  useScrollLock(open);
  useFocusTrap(panelRef, open);
  useEscapeKey(() => onClose?.(), open, isTop);

  if (!open) return null;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-50"
        onMouseDown={(event) => {
          pointerDownOnOverlay.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (pointerDownOnOverlay.current && event.target === event.currentTarget) onClose?.();
          pointerDownOnOverlay.current = false;
        }}
      >
        <div
          className="pointer-events-none fixed inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]"
          aria-hidden="true"
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={-1}
          className={cn(
            'fixed inset-y-0 flex h-full w-full flex-col bg-white shadow-elevated outline-none',
            side === 'left' ? 'left-0 animate-slide-in-left' : 'right-0 animate-slide-in-right',
            SIZES[size] ?? SIZES.md,
            className,
          )}
          {...rest}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              {title ? (
                <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-slate-500">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Close"
              className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </OverlayPortal>
  );
}

export default Drawer;
