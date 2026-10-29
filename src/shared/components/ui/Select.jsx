import { forwardRef, useId } from 'react';
import { ChevronDown } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { FormField } from './FormField';
import {
  fieldClasses,
  fieldIds,
  hasContent,
  isFieldInvalid,
  joinIds,
  resolveFieldError,
} from './internal/fieldStyles';

/** Options may be `{ value, label, disabled }` objects or plain strings/numbers. */
function normalizeOption(option) {
  if (option !== null && typeof option === 'object') return option;
  return { value: option, label: String(option) };
}

/**
 * Select — native <select> styled like Input, with a chevron.
 * `options` [{ value, label, disabled }] or <option> children; `placeholder` renders a disabled
 * empty first option (selected by default when no value/defaultValue is given). For a
 * re-selectable "All …" choice, pass it as a normal option with value '' instead.
 */
export const Select = forwardRef(function Select(
  {
    label,
    hint,
    error,
    required = false,
    options,
    placeholder,
    size = 'md',
    id: idProp,
    className,
    selectClassName,
    children,
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
  const hasPlaceholder = hasContent(placeholder);

  // Without an explicit value the browser would pre-select the first enabled option and hide
  // the placeholder, so start on the placeholder (react-hook-form may then set its default).
  const initialValueProps =
    hasPlaceholder && rest.value === undefined && rest.defaultValue === undefined
      ? { defaultValue: '' }
      : {};

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
        <select
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          aria-describedby={joinIds(
            ariaDescribedBy,
            errorMessage !== null ? errorId : null,
            showHint ? hintId : null,
          )}
          className={cn(
            fieldClasses({ error: invalid, size: sizeKey, hasRightElement: true }),
            'cursor-pointer appearance-none truncate',
            hasPlaceholder &&
              'has-[option:checked:disabled]:text-slate-400 [&>option]:text-slate-900',
            selectClassName,
          )}
          {...initialValueProps}
          {...rest}
        >
          {hasPlaceholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {Array.isArray(options)
            ? options.map((rawOption, index) => {
                const option = normalizeOption(rawOption);
                const optionValue = option.value ?? '';
                return (
                  <option
                    key={`${String(optionValue)}-${index}`}
                    value={optionValue}
                    disabled={Boolean(option.disabled)}
                  >
                    {option.label ?? String(optionValue)}
                  </option>
                );
              })
            : children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400',
            sizeKey === 'sm' ? 'right-2.5' : 'right-3',
          )}
        />
      </div>
    </FormField>
  );
});

export default Select;
