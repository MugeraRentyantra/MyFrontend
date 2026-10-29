import { forwardRef, useCallback, useId, useRef } from 'react';
import { Search, X } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import {
  FIELD_ICON_OFFSET_CLASSES,
  assignRef,
  fieldClasses,
  fieldIconClasses,
} from './internal/fieldStyles';

/**
 * SearchBar — controlled search field: `value`, `onChange(string)`, `placeholder` ["Search…"],
 * `aria-label` (defaults to the placeholder without its ellipsis), `autoFocus`, `size` sm|md.
 * Shows a clear button while non-empty; Esc clears (and does not bubble to dialogs then).
 * `className` styles the wrapper; other props go to the <input>.
 */
export const SearchBar = forwardRef(function SearchBar(
  {
    value = '',
    onChange,
    placeholder = 'Search…',
    'aria-label': ariaLabel,
    autoFocus = false,
    size = 'md',
    disabled = false,
    id: idProp,
    className,
    inputClassName,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const sizeKey = size === 'sm' ? 'sm' : 'md';
  const inputRef = useRef(null);
  const text = value === null || value === undefined ? '' : String(value);
  const hasValue = text.length > 0;
  const accessibleName =
    ariaLabel || String(placeholder || '').replace(/[.…\s]+$/, '') || 'Search';

  const handleRef = useCallback(
    (node) => {
      inputRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const clear = () => {
    if (onChange) onChange('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDown = (event) => {
    if (onKeyDown) onKeyDown(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Escape' && hasValue) {
      event.preventDefault();
      event.stopPropagation();
      if (onChange) onChange('');
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <span
        className={cn(
          'pointer-events-none absolute inset-y-0 left-0 flex items-center',
          FIELD_ICON_OFFSET_CLASSES[sizeKey],
        )}
      >
        <Search className={fieldIconClasses} aria-hidden="true" />
      </span>
      <input
        ref={handleRef}
        id={id}
        type="search"
        value={text}
        onChange={(event) => {
          if (onChange) onChange(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={accessibleName}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        className={cn(
          fieldClasses({ size: sizeKey, hasLeftIcon: true, hasRightElement: true }),
          '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
          inputClassName,
        )}
        {...rest}
      />
      {hasValue && !disabled ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-center rounded-r-lg text-slate-400 transition-colors duration-150',
            'hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
            sizeKey === 'sm' ? 'w-8' : 'w-10',
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});

export default SearchBar;
