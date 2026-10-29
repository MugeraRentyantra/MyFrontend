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
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-6xl',
  full: 'sm:max-w-[min(96vw,1200px)] sm:h-[92vh]',
};

/**
 * Accessible dialog: portal, focus trap, Esc to close, focus returns to the opener,
 * body scroll lock. Bottom sheet on mobile, centered panel from sm up.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  children,
  closeOnOverlayClick = true,
  hideCloseButton = false,
  initialFocusRef,
  className,
  ...rest
}) {
  const panelRef = useRef(null);
  const pointerDownOnOverlay = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const isTop = useOverlayStack(open);
  useScrollLock(open);
  useFocusTrap(panelRef, open, { initialFocusRef });
  useEscapeKey(() => onClose?.(), open, isTop);

  if (!open) return null;

  const showHeader = Boolean(title) || !hideCloseButton;

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
        onMouseDown={(event) => {
          pointerDownOnOverlay.current = event.target === event.currentTarget;
        }}
        onClick={(event) => {
          if (
            closeOnOverlayClick &&
            pointerDownOnOverlay.current &&
            event.target === event.currentTarget
          ) {
            onClose?.();
          }
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
            'relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-hidden rounded-t-2xl bg-white shadow-elevated outline-none sm:rounded-2xl',
            SIZES[size] ?? SIZES.md,
            className,
          )}
          {...rest}
        >
          {showHeader ? (
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
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
              {!hideCloseButton ? (
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  aria-label="Close"
                  className="-mr-2 -mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </OverlayPortal>
  );
}

export default Modal;
