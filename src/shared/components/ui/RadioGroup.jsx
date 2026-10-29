import { isValidElement, useId, useState } from 'react';
import { CheckCircle2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { RequiredMark } from './FormField';
import {
  fieldErrorClasses,
  fieldHintClasses,
  fieldIds,
  hasContent,
  joinIds,
  resolveFieldError,
} from './internal/fieldStyles';

/** Options may be `{ value, label, … }` objects or plain strings/numbers. */
function normalizeOption(option) {
  if (option !== null && typeof option === 'object') return option;
  return { value: option, label: String(option ?? '') };
}

/** Loose equality so numeric option values match string values (and vice versa). */
function isSameValue(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  return String(a) === String(b);
}

function renderOptionIcon(icon) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && '$$typeof' in icon)) {
    const IconComponent = icon;
    return <IconComponent className="h-5 w-5" aria-hidden="true" />;
  }
  return null;
}

const RADIO_INPUT_CLASSES =
  'mt-0.5 h-4 w-4 shrink-0 cursor-pointer border-slate-300 accent-brand-600 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * RadioGroup — native radios inside a <fieldset> (arrow keys work natively).
 * `options` [{ value, label, description, disabled, icon }], `value` + `onChange(value)`
 * (or `defaultValue` for uncontrolled use), `label` (legend), `hint`, `error`,
 * `orientation` vertical|horizontal, `variant` default|cards (bordered tiles with a check).
 * `optionsClassName` overrides the option layout (e.g. 'sm:grid-cols-3' for cards).
 */
export function RadioGroup({
  name,
  value,
  defaultValue,
  onChange,
  options = [],
  label,
  hint,
  error,
  required = false,
  disabled = false,
  orientation = 'vertical',
  variant = 'default',
  id: idProp,
  className,
  optionsClassName,
  'aria-describedby': ariaDescribedBy,
  ...rest
}) {
  const autoId = useId();
  const groupId = idProp || autoId;
  const groupName = name || `${groupId}-radio`;
  const { labelId, hintId, errorId } = fieldIds(groupId);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const errorMessage = resolveFieldError(error);
  const showHint = errorMessage === null && hasContent(hint);
  const hasLabel = hasContent(label);
  const isCards = variant === 'cards';
  const list = Array.isArray(options) ? options : [];

  const select = (optionValue) => {
    if (!isControlled) setUncontrolledValue(optionValue);
    if (onChange) onChange(optionValue);
  };

  let layoutClasses = 'space-y-3';
  if (isCards) layoutClasses = 'grid gap-3 sm:grid-cols-2';
  else if (orientation === 'horizontal') layoutClasses = 'flex flex-wrap gap-x-6 gap-y-3';

  return (
    <fieldset
      id={groupId}
      className={cn('min-w-0', className)}
      aria-describedby={joinIds(
        ariaDescribedBy,
        errorMessage !== null ? errorId : null,
        showHint ? hintId : null,
      )}
      {...rest}
    >
      {hasLabel ? (
        <legend id={labelId} className="text-sm font-medium text-slate-700">
          {label}
          {required ? <RequiredMark /> : null}
        </legend>
      ) : null}

      <div className={cn(hasLabel && 'mt-2', layoutClasses, optionsClassName)}>
        {list.map((rawOption, index) => {
          const option = normalizeOption(rawOption);
          const optionId = `${groupId}-option-${index}`;
          const optionLabelId = `${optionId}-label`;
          const descriptionId = hasContent(option.description)
            ? `${optionId}-description`
            : undefined;
          const checked = isSameValue(currentValue, option.value);
          const optionDisabled = disabled || Boolean(option.disabled);
          const key = `${String(option.value)}-${index}`;

          const input = (
            <input
              id={optionId}
              type="radio"
              name={groupName}
              value={String(option.value)}
              checked={checked}
              disabled={optionDisabled}
              onChange={() => select(option.value)}
              aria-labelledby={optionLabelId}
              aria-describedby={descriptionId}
              className={isCards ? 'peer sr-only' : RADIO_INPUT_CLASSES}
            />
          );

          if (isCards) {
            const icon = renderOptionIcon(option.icon);
            return (
              <label
                key={key}
                htmlFor={optionId}
                className={cn(
                  'relative flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors duration-150',
                  checked
                    ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600'
                    : 'border-slate-200 bg-white',
                  optionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  !checked && !optionDisabled && 'hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                {input}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-px rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2"
                />
                {icon ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
                      checked ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span id={optionLabelId} className="block text-sm font-medium text-slate-900">
                    {option.label}
                  </span>
                  {descriptionId ? (
                    <span id={descriptionId} className="mt-1 block text-sm text-slate-500">
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <CheckCircle2
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-5 shrink-0 text-brand-600 transition-opacity duration-150',
                    checked ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </label>
            );
          }

          return (
            <div key={key} className="flex items-start gap-3">
              {input}
              <div className="min-w-0 text-sm leading-5">
                <label
                  id={optionLabelId}
                  htmlFor={optionId}
                  className={cn(
                    'font-medium text-slate-700',
                    optionDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                  )}
                >
                  {option.label}
                </label>
                {descriptionId ? (
                  <p id={descriptionId} className="text-slate-500">
                    {option.description}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage !== null ? (
        <p id={errorId} role="alert" className={cn('mt-2', fieldErrorClasses)}>
          {errorMessage}
        </p>
      ) : null}
      {showHint ? (
        <p id={hintId} className={cn('mt-2', fieldHintClasses)}>
          {hint}
        </p>
      ) : null}
    </fieldset>
  );
}

export default RadioGroup;
