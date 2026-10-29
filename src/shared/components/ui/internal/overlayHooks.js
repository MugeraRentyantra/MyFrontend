import { useCallback, useEffect, useRef } from 'react';

/** Shared behaviour for Modal, Drawer, DropdownMenu and Toaster: focus trap, scroll lock, Esc, outside clicks. */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.closest('[hidden]') && element.getAttribute('aria-hidden') !== 'true',
  );
}

// --- Overlay stack: only the top-most overlay reacts to Esc ----------------------------

const overlayStack = [];
let overlayCounter = 0;

/** Registers an open overlay; returns a function telling whether it is the top-most one. */
export function useOverlayStack(active) {
  const idRef = useRef(null);
  if (idRef.current === null) {
    overlayCounter += 1;
    idRef.current = overlayCounter;
  }

  useEffect(() => {
    if (!active) return undefined;
    const id = idRef.current;
    overlayStack.push(id);
    return () => {
      const index = overlayStack.lastIndexOf(id);
      if (index !== -1) overlayStack.splice(index, 1);
    };
  }, [active]);

  return useCallback(() => overlayStack[overlayStack.length - 1] === idRef.current, []);
}

// --- Body scroll lock with a counter so nested overlays work ----------------------------

let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

export function useScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;
    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      savedOverflow = document.body.style.overflow;
      savedPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount += 1;
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPaddingRight;
      }
    };
  }, [active]);
}

// --- Focus trap ----------------------------------------------------------------------

/**
 * Moves focus into `containerRef` when active (initialFocusRef, else the first focusable
 * element, else the container), keeps Tab/Shift+Tab inside, and restores focus on close.
 */
export function useFocusTrap(containerRef, active, { initialFocusRef, restoreFocus = true } = {}) {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;

    const focusInitial = () => {
      if (container.contains(document.activeElement) && document.activeElement !== container) return;
      const target =
        initialFocusRef?.current || getFocusableElements(container)[0] || container;
      if (typeof target.focus === 'function') target.focus({ preventScroll: true });
    };
    const timer = setTimeout(focusInitial, 0);

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const items = getFocusableElements(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      container.removeEventListener('keydown', handleKeyDown);
      if (
        restoreFocus &&
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function' &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, initialFocusRef, restoreFocus]);
}

// --- Escape key ---------------------------------------------------------------------

export function useEscapeKey(handler, active, isTop) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (isTop && !isTop()) return;
      event.stopPropagation();
      handlerRef.current?.(event);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, isTop]);
}

// --- Click outside --------------------------------------------------------------------

export function useClickOutside(refs, handler, active) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return undefined;
    const onPointerDown = (event) => {
      const inside = refs.some((ref) => ref.current && ref.current.contains(event.target));
      if (!inside) handlerRef.current?.(event);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
    // refs are stable ref objects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}

/** Combines several refs (object or callback) into one callback ref. */
export function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    });
  };
}
