import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/utils/cn';
import { OverlayPortal } from './internal/OverlayPortal';
import {
  mergeRefs,
  useClickOutside,
  useEscapeKey,
  useOverlayStack,
} from './internal/overlayHooks';

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';

/**
 * Accessible action menu. The menu is portalled with fixed positioning so it is never
 * clipped by table scroll containers. Keyboard: Enter/Space/ArrowDown open, arrows move,
 * Home/End jump, Esc closes and returns focus to the trigger.
 */
export function DropdownMenu({ trigger, items = [], align = 'end', label, className }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const isTop = useOverlayStack(open);

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus?.();
  }, []);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth || 192;
    const menuHeight = menuEl?.offsetHeight || 0;
    const gap = 4;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = align === 'start' ? rect.left : rect.right - menuWidth;
    left = Math.min(Math.max(8, left), Math.max(8, viewportWidth - menuWidth - 8));

    let top = rect.bottom + gap;
    if (menuHeight && top + menuHeight > viewportHeight - 8 && rect.top - gap - menuHeight > 8) {
      top = rect.top - gap - menuHeight;
    }
    setPosition({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    // Second pass once the menu has its real size, then focus the first item.
    const timer = setTimeout(() => {
      updatePosition();
      menuRef.current?.querySelector(ITEM_SELECTOR)?.focus();
    }, 0);
    const handleViewportChange = (event) => {
      if (event?.target && menuRef.current?.contains(event.target)) return;
      close(false);
    };
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [open, updatePosition, close]);

  useClickOutside([triggerRef, menuRef], () => setOpen(false), open);
  useEscapeKey(() => close(true), open, isTop);

  const moveFocus = (direction) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll(ITEM_SELECTOR) ?? []);
    if (nodes.length === 0) return;
    const index = nodes.indexOf(document.activeElement);
    let next;
    if (direction === 'first') next = 0;
    else if (direction === 'last') next = nodes.length - 1;
    else if (direction === 'next') next = index < 0 ? 0 : (index + 1) % nodes.length;
    else next = index <= 0 ? nodes.length - 1 : index - 1;
    nodes[next].focus();
  };

  const handleMenuKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus('next');
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus('prev');
        break;
      case 'Home':
        event.preventDefault();
        moveFocus('first');
        break;
      case 'End':
        event.preventDefault();
        moveFocus('last');
        break;
      case 'Tab':
        close(false);
        break;
      default:
    }
  };

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, {
        ref: mergeRefs(trigger.ref, triggerRef),
        onClick: (event) => {
          trigger.props.onClick?.(event);
          if (!event.defaultPrevented) setOpen((value) => !value);
        },
        onKeyDown: (event) => {
          trigger.props.onKeyDown?.(event);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        },
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
      })
    : null;

  return (
    <>
      {triggerElement}
      {open ? (
        <OverlayPortal>
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={typeof label === 'string' ? label : undefined}
            onKeyDown={handleMenuKeyDown}
            style={{ position: 'fixed', top: position.top, left: position.left }}
            className={cn(
              'z-[60] min-w-[12rem] max-w-[min(20rem,calc(100vw-1rem))] animate-scale-in rounded-xl border border-slate-200 bg-white p-1 shadow-elevated focus:outline-none',
              className,
            )}
          >
            {label ? (
              <div className="border-b border-slate-100 px-3 pb-2 pt-1.5 text-xs text-slate-500">
                {label}
              </div>
            ) : null}
            {items.map((item, index) => {
              if (item.divider) {
                return <div key={`divider-${index}`} role="separator" className="my-1 h-px bg-slate-100" />;
              }
              const Icon = item.icon;
              const classes = cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none',
                item.disabled
                  ? 'cursor-not-allowed text-slate-400'
                  : item.danger
                    ? 'text-rose-600 hover:bg-rose-50 focus:bg-rose-50'
                    : 'text-slate-700 hover:bg-slate-50 focus:bg-slate-100',
              );
              const content = (
                <>
                  {Icon ? (
                    isValidElement(Icon) ? (
                      Icon
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    )
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </>
              );
              const handleSelect = (event) => {
                if (item.disabled) {
                  event.preventDefault();
                  return;
                }
                item.onClick?.(event);
                close(false);
              };
              const key = item.key ?? `${item.label}-${index}`;
              if (item.to && !item.disabled) {
                return (
                  <Link key={key} to={item.to} role="menuitem" tabIndex={-1} className={classes} onClick={handleSelect}>
                    {content}
                  </Link>
                );
              }
              if (item.href && !item.disabled) {
                return (
                  <a key={key} href={item.href} role="menuitem" tabIndex={-1} className={classes} onClick={handleSelect}>
                    {content}
                  </a>
                );
              }
              return (
                <button
                  key={key}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  aria-disabled={item.disabled ? 'true' : undefined}
                  className={classes}
                  onClick={handleSelect}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </OverlayPortal>
      ) : null}
    </>
  );
}

export default DropdownMenu;
