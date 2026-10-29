import { forwardRef, isValidElement, useId } from 'react';
import { cn } from '@/shared/utils/cn';
import { FormField } from './FormField';
import {
  FIELD_ICON_OFFSET_CLASSES,
  fieldClasses,
  fieldIconClasses,
  fieldIds,
  hasContent,
  isFieldInvalid,
  joinIds,
  resolveFieldError,
} from './internal/fieldStyles';

/** Leading icon: an icon component (e.g. `Mail`) or a ready-made element. */
function renderFieldIcon(icon) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && '$$typeof' in icon)) {
    const IconComponent = icon;
    return <IconComponent className={fieldIconClasses} aria-hidden="true" />;
  }
  return null;
}

/**
 * Input — label → input → error (role=alert) or hint, with aria-invalid / aria-required /
 * aria-describedby wired up. `className` styles the wrapper, `inputClassName` the <input>;
 * every other prop goes to the <input>, so `{...register('email')}` works.
 */
export const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    required = false,
    leftIcon,
    rightElement,
    id: idProp,
    size = 'md',
    type = 'text',
    className,
    inputClassName,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const sizeKey = size === 'sm' ? 'sm' : 'md';
  const { hintId, errorId } = fieldIds(id);
  const errorMessage = resolveFieldError(error);
  const invalid = isFieldInvalid(error);
  const showHint = errorMessage === null && hasContent(hint);
  const icon = renderFieldIcon(leftIcon);
  const hasRight = hasContent(rightElement);
  const isTextSuffix = typeof rightElement === 'string' || typeof rightElement === 'number';

  return (
    <FormField
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        {icon ? (
          <span
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 flex items-center',
              FIELD_ICON_OFFSET_CLASSES[sizeKey],
            )}
          >
            {icon}
          </span>
        ) : null}
        <input
          ref={ref}
          id={id}
          type={type}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-describedby={joinIds(
            ariaDescribedBy,
            errorMessage !== null ? errorId : null,
            showHint ? hintId : null,
          )}
          className={cn(
            fieldClasses({
              error: invalid,
              size: sizeKey,
              hasLeftIcon: Boolean(icon),
              hasRightElement: hasRight,
            }),
            rest.readOnly && 'bg-slate-50',
            inputClassName,
          )}
          {...rest}
        />
        {hasRight ? (
          <div className="absolute inset-y-0 right-0 flex items-center">
            {isTextSuffix ? (
              <span className="pointer-events-none pr-3 text-sm text-slate-500">{rightElement}</span>
            ) : (
              rightElement
            )}
          </div>
        ) : null}
      </div>
    </FormField>
  );
});

export default Input;
