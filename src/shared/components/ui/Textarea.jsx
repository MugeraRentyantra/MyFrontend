import { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { FormField } from './FormField';
import {
  assignRef,
  fieldClasses,
  fieldIds,
  hasContent,
  isFieldInvalid,
  joinIds,
  resolveFieldError,
} from './internal/fieldStyles';

const RESIZE_CLASSES = {
  none: 'resize-none',
  vertical: 'resize-y',
  horizontal: 'resize-x',
  both: 'resize',
};

function toLength(value) {
  if (value === null || value === undefined) return 0;
  return String(value).length;
}

/** Counter text + colour: amber below the minimum, rose above the maximum. */
function getCounter(length, minLength, maxLength) {
  const min = Number(minLength) || 0;
  const max = Number(maxLength) || 0;
  if (min > 0 && length < min) {
    return { text: `${length}/${min} characters minimum`, tone: 'text-amber-700' };
  }
  if (max > 0) {
    return {
      text: `${length}/${max}`,
      tone: length > max ? 'font-medium text-rose-600' : 'text-slate-500',
    };
  }
  return { text: `${length} ${length === 1 ? 'character' : 'characters'}`, tone: 'text-slate-500' };
}

/**
 * Textarea — label, hint, error, required, rows [4], resize [vertical], and an optional
 * character counter (`showCount`, `minLength`, `maxLength`; `count` overrides the tracked length,
 * e.g. `count={watch('description')?.length}`).
 * minLength / maxLength drive the counter only (soft limits; validate with zod). Pass
 * `enforceMaxLength` to also set the native maxLength attribute.
 */
export const Textarea = forwardRef(function Textarea(
  {
    label,
    hint,
    error,
    required = false,
    rows = 4,
    showCount = false,
    minLength,
    maxLength,
    count,
    enforceMaxLength = false,
    resize = 'vertical',
    id: idProp,
    className,
    textareaClassName,
    inputClassName,
    onChange,
    'aria-describedby': ariaDescribedBy,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const { hintId, errorId, countId } = fieldIds(id);
  const elementRef = useRef(null);
  const [trackedLength, setTrackedLength] = useState(() =>
    toLength(rest.value ?? rest.defaultValue),
  );

  const handleRef = useCallback(
    (node) => {
      elementRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  // Values written straight to the DOM (react-hook-form defaults, reset()) fire no change
  // event, so re-read the length after each render. State only changes when it differs.
  useEffect(() => {
    const node = elementRef.current;
    if (node && node.value.length !== trackedLength) {
      setTrackedLength(node.value.length);
    }
  });

  const handleChange = (event) => {
    setTrackedLength(event.target.value.length);
    if (onChange) onChange(event);
  };

  const errorMessage = resolveFieldError(error);
  const invalid = isFieldInvalid(error);
  const showHint = errorMessage === null && hasContent(hint);
  const length = typeof count === 'number' && Number.isFinite(count) ? count : trackedLength;
  const counter = showCount ? getCounter(length, minLength, maxLength) : null;

  return (
    <FormField
      label={label}
      htmlFor={id}
      hint={hint}
      error={error}
      required={required}
      className={className}
      footer={
        counter ? (
          <p id={countId} className={cn('text-xs tabular-nums', counter.tone)}>
            {counter.text}
          </p>
        ) : null
      }
    >
      <textarea
        ref={handleRef}
        id={id}
        rows={rows}
        maxLength={enforceMaxLength && maxLength ? maxLength : undefined}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        aria-describedby={joinIds(
          ariaDescribedBy,
          errorMessage !== null ? errorId : null,
          showHint ? hintId : null,
          counter ? countId : null,
        )}
        className={cn(
          fieldClasses({ error: invalid, multiline: true }),
          RESIZE_CLASSES[resize] || RESIZE_CLASSES.vertical,
          rest.readOnly && 'bg-slate-50',
          textareaClassName,
          inputClassName,
        )}
        onChange={handleChange}
        {...rest}
      />
    </FormField>
  );
});

export default Textarea;
