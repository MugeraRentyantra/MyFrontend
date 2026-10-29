import { forwardRef, useId } from 'react';
import { cn } from '@/shared/utils/cn';
import { fieldIds, hasContent, joinIds } from './internal/fieldStyles';

const SIZES = {
  sm: { track: 'h-5 w-9', thumb: 'h-4 w-4', on: 'translate-x-4' },
  md: { track: 'h-6 w-11', thumb: 'h-5 w-5', on: 'translate-x-5' },
};

/**
 * Switch — `<button role="switch" aria-checked>` with an optional label/description on the
 * right (clicking the label toggles). Controlled: `checked` + `onChange(nextBool)`.
 * `className` styles the row; other props go to the button.
 */
export const Switch = forwardRef(function Switch(
  {
    checked = false,
    onChange,
    label,
    description,
    disabled = false,
    id: idProp,
    size = 'md',
    className,
    onClick,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const { labelId, descriptionId } = fieldIds(id);
  const sizeKey = size === 'sm' ? 'sm' : 'md';
  const dims = SIZES[sizeKey];
  const isOn = Boolean(checked);
  const hasLabel = hasContent(label);
  const hasDescription = hasContent(description);

  const handleClick = (event) => {
    if (onClick) onClick(event);
    if (event.defaultPrevented || disabled) return;
    if (onChange) onChange(!isOn);
  };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-labelledby={hasLabel ? labelId : undefined}
        aria-describedby={joinIds(ariaDescribedBy, hasDescription ? descriptionId : null)}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOn ? 'bg-brand-600' : 'bg-slate-200',
          dims.track,
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow transition-transform duration-150',
            dims.thumb,
            isOn ? dims.on : 'translate-x-0',
          )}
        />
      </button>
      {hasLabel || hasDescription ? (
        <div className={cn('min-w-0 text-sm leading-5', sizeKey === 'md' && 'pt-0.5')}>
          {hasLabel ? (
            <label
              id={labelId}
              htmlFor={id}
              className={cn(
                'font-medium text-slate-700',
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              )}
            >
              {label}
            </label>
          ) : null}
          {hasDescription ? (
            <p id={descriptionId} className="text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export default Switch;
