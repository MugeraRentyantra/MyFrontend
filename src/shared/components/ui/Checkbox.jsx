import { forwardRef, useId } from 'react';
import { cn } from '@/shared/utils/cn';
import {
  fieldErrorClasses,
  fieldIds,
  hasContent,
  isFieldInvalid,
  joinIds,
  resolveFieldError,
} from './internal/fieldStyles';

/**
 * Checkbox — native checkbox (accent-brand-600) with a label (node), optional description and
 * error. `className` styles the row, `inputClassName` the checkbox; other props go to the <input>.
 */
export const Checkbox = forwardRef(function Checkbox(
  {
    label,
    description,
    error,
    id: idProp,
    className,
    inputClassName,
    disabled = false,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const { descriptionId, errorId } = fieldIds(id);
  const errorMessage = resolveFieldError(error);
  const invalid = isFieldInvalid(error);
  const hasLabel = hasContent(label);
  const hasDescription = hasContent(description);
  const hasText = hasLabel || hasDescription || errorMessage !== null;

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={joinIds(
          ariaDescribedBy,
          hasDescription ? descriptionId : null,
          errorMessage !== null ? errorId : null,
        )}
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
          inputClassName,
        )}
        {...rest}
      />
      {hasText ? (
        <div className="min-w-0 text-sm leading-5">
          {hasLabel ? (
            <label
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
          {errorMessage !== null ? (
            <p id={errorId} role="alert" className={cn('mt-1', fieldErrorClasses)}>
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export default Checkbox;
