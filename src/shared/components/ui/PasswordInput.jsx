import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { Input } from './Input';

/**
 * PasswordInput — same API as Input, plus a show/hide toggle button
 * (aria-label "Show password" / "Hide password", aria-pressed).
 */
export const PasswordInput = forwardRef(function PasswordInput(
  { id: idProp, size = 'md', disabled = false, ...props },
  ref,
) {
  const autoId = useId();
  const id = idProp || autoId;
  const [visible, setVisible] = useState(false);
  const ToggleIcon = visible ? EyeOff : Eye;

  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((current) => !current)}
      disabled={disabled}
      aria-label={visible ? 'Hide password' : 'Show password'}
      aria-pressed={visible}
      aria-controls={id}
      className={cn(
        'flex h-full items-center justify-center rounded-r-lg text-slate-500 transition-colors duration-150',
        'hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'w-8' : 'w-10',
      )}
    >
      <ToggleIcon className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  return (
    <Input
      ref={ref}
      spellCheck={false}
      autoCapitalize="none"
      {...props}
      id={id}
      size={size}
      disabled={disabled}
      type={visible ? 'text' : 'password'}
      rightElement={toggle}
    />
  );
});

export default PasswordInput;
