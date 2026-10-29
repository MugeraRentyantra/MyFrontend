import { useId, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

function isPresent(value) {
  return value !== undefined && value !== null;
}

/**
 * Tabs (SN2). items = [{ value, label, count, icon, disabled, content }].
 * Controlled (`value` + `onChange`) or uncontrolled (`defaultValue`). When items carry `content`, the active
 * item's content is rendered in a role="tabpanel"; without content the tabs work as a filter switcher.
 * Keyboard: ArrowLeft / ArrowRight / Home / End move between enabled tabs (selection follows focus).
 */
export function Tabs({
  items = [],
  value: valueProp,
  defaultValue,
  onChange,
  variant = 'underline',
  fullWidth = false,
  className,
  panelClassName,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}) {
  const baseId = useId();
  const tabRefs = useRef([]);
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState(() =>
    defaultValue !== undefined ? defaultValue : items.find((item) => !item.disabled)?.value,
  );

  if (!items.length) return null;

  const selectedValue = isControlled ? valueProp : internalValue;
  const activeIndex = items.findIndex((item) => item.value === selectedValue);
  const firstEnabledIndex = items.findIndex((item) => !item.disabled);
  const focusableIndex =
    activeIndex >= 0 && !items[activeIndex].disabled ? activeIndex : firstEnabledIndex;
  const hasPanels = items.some((item) => isPresent(item.content));
  const isPills = variant === 'pills';
  const tabId = (index) => `${baseId}-tab-${index}`;
  const panelId = `${baseId}-panel`;

  function selectTab(index) {
    const item = items[index];
    if (!item || item.disabled) return;
    if (!isControlled) setInternalValue(item.value);
    if (item.value !== selectedValue) onChange?.(item.value);
  }

  function handleKeyDown(event, index) {
    const enabled = [];
    items.forEach((item, itemIndex) => {
      if (!item.disabled) enabled.push(itemIndex);
    });
    if (!enabled.length) return;
    const position = Math.max(0, enabled.indexOf(index));
    let nextIndex;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = enabled[(position + 1) % enabled.length];
        break;
      case 'ArrowLeft':
        nextIndex = enabled[(position - 1 + enabled.length) % enabled.length];
        break;
      case 'Home':
        nextIndex = enabled[0];
        break;
      case 'End':
        nextIndex = enabled[enabled.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    tabRefs.current[nextIndex]?.focus();
    selectTab(nextIndex);
  }

  return (
    <div className={cn('min-w-0', className)} {...rest}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          'scrollbar-thin overflow-x-auto',
          isPills
            ? cn('max-w-full gap-1 rounded-lg bg-slate-100 p-1', fullWidth ? 'flex w-full' : 'inline-flex')
            : // The 1px baseline is an inset shadow so the active 2px bar can sit on top of it
              // without overflowing the horizontal scroll container.
              cn('flex shadow-[inset_0_-1px_0_0_#e2e8f0]', fullWidth ? 'gap-2' : 'gap-6'),
        )}
      >
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const Icon = item.icon;
          return (
            <button
              key={String(item.value)}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={tabId(index)}
              aria-selected={isActive}
              aria-controls={isActive && hasPanels ? panelId : undefined}
              tabIndex={index === focusableIndex ? 0 : -1}
              disabled={item.disabled}
              onClick={() => selectTab(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                isPills
                  ? cn(
                      'rounded-md px-3 py-2 focus-visible:ring-2 focus-visible:ring-brand-500',
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 enabled:hover:text-slate-900',
                    )
                  : cn(
                      'rounded-t-md border-b-2 px-1 pb-3 pt-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                      isActive
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-slate-500 enabled:hover:border-slate-300 enabled:hover:text-slate-700',
                    ),
                fullWidth && 'flex-1',
              )}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
              <span>{item.label}</span>
              {isPresent(item.count) ? (
                <span
                  className={cn(
                    'tabular rounded-full px-2 py-0.5 text-xs font-medium',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : isPills
                        ? 'bg-slate-200/70 text-slate-600'
                        : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {hasPanels && activeIndex >= 0 ? (
        <div
          key={String(items[activeIndex].value)}
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(activeIndex)}
          tabIndex={0}
          className={cn(
            'mt-6 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            panelClassName,
          )}
        >
          {items[activeIndex].content}
        </div>
      ) : null}
    </div>
  );
}

export default Tabs;
