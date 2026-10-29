import { useId } from 'react';
import { cn } from '@/shared/utils/cn';
import {
  fieldErrorClasses,
  fieldHintClasses,
  fieldIds,
  fieldLabelClasses,
  hasContent,
  isFieldInvalid,
  joinIds,
  requiredMarkClasses,
  resolveFieldError,
} from './internal/fieldStyles';

/** Rose asterisk for required fields, with a screen-reader-only "(required)". */
export function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className={requiredMarkClasses}>
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}

/**
 * FormField — label + control + error/hint layout for custom controls.
 *
 * Ids are derived from `htmlFor`: the label is `${htmlFor}-label`, the error `${htmlFor}-error`
 * and the hint `${htmlFor}-hint`, so the child control can point aria-describedby at them.
 * `children` may also be a function receiving `{ id, labelId, describedBy, invalid, required }`.
 * `footer` (optional) renders on the right of the message row (Textarea uses it for its counter).
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  footer,
  className,
  labelClassName,
  ...rest
}) {
  const autoId = useId();
  const isRenderProp = typeof children === 'function';
  const baseId = htmlFor || autoId;
  const { labelId, hintId, errorId } = fieldIds(baseId);
  const errorMessage = resolveFieldError(error);
  const showHint = errorMessage === null && hasContent(hint);
  const labelTarget = htmlFor || (isRenderProp ? baseId : undefined);

  let message = null;
  if (errorMessage !== null) {
    message = (
      <p id={errorId} role="alert" className={fieldErrorClasses}>
        {errorMessage}
      </p>
    );
  } else if (showHint) {
    message = (
      <p id={hintId} className={fieldHintClasses}>
        {hint}
      </p>
    );
  }

  const content = isRenderProp
    ? children({
        id: baseId,
        labelId,
        describedBy: joinIds(errorMessage !== null ? errorId : null, showHint ? hintId : null),
        invalid: isFieldInvalid(error),
        required,
      })
    : children;

  let labelNode = null;
  if (hasContent(label)) {
    const labelContent = (
      <>
        {label}
        {required ? <RequiredMark /> : null}
      </>
    );
    labelNode = labelTarget ? (
      <label id={labelId} htmlFor={labelTarget} className={cn(fieldLabelClasses, labelClassName)}>
        {labelContent}
      </label>
    ) : (
      <span id={labelId} className={cn(fieldLabelClasses, labelClassName)}>
        {labelContent}
      </span>
    );
  }

  let messageRow = null;
  if (hasContent(footer)) {
    messageRow = (
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">{message}</div>
        <div className="shrink-0">{footer}</div>
      </div>
    );
  } else if (message) {
    messageRow = <div className="mt-1.5">{message}</div>;
  }

  return (
    <div className={cn('min-w-0', className)} {...rest}>
      {labelNode}
      {content}
      {messageRow}
    </div>
  );
}

export default FormField;
