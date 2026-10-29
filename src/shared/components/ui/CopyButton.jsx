import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { copyToClipboard } from '@/shared/utils/helpers';
import { Button } from './Button';
import { toast } from './Toast';

const COPIED_RESET_MS = 2000;
const TINTED_CHECK_VARIANTS = ['outline', 'ghost', 'secondary', 'link'];
const ICON_SIZE_CLASSES = { xs: 'h-3.5 w-3.5', lg: 'h-5 w-5' };

/**
 * CopyButton — copies `value` to the clipboard and shows a check + `copiedLabel` for 2 s.
 * `label` ["Copy"], `copiedLabel` ["Copied"], `iconOnly` (square Button, aria-label = label),
 * `variant` [outline], `size` [sm], optional `onCopy(text)`. Shows an error toast if copying
 * fails. Disabled automatically while `value` is empty (unless `disabled` is given).
 * Other props go to the Button.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  iconOnly = false,
  variant = 'outline',
  size = 'sm',
  disabled,
  onCopy,
  onClick,
  ...rest
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  const text = value === null || value === undefined ? '' : String(value);
  const isDisabled = disabled ?? text.length === 0;

  const handleClick = async (event) => {
    if (onClick) onClick(event);
    if (event.defaultPrevented) return;

    let ok = false;
    try {
      ok = await copyToClipboard(text);
    } catch {
      ok = false;
    }
    if (!mountedRef.current) return;

    if (!ok) {
      toast.error('Could not copy. Please copy it manually.');
      return;
    }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    if (onCopy) onCopy(text);
  };

  const iconSize = iconOnly ? 'h-4 w-4' : ICON_SIZE_CLASSES[size] || 'h-4 w-4';
  const icon = copied ? (
    <Check
      aria-hidden="true"
      className={cn(
        'shrink-0',
        iconSize,
        TINTED_CHECK_VARIANTS.includes(variant) && 'text-emerald-600',
      )}
    />
  ) : (
    <Copy aria-hidden="true" className={cn('shrink-0', iconSize)} />
  );

  // Announces the result without changing the button's accessible name.
  const status = (
    <span className="sr-only" role="status">
      {copied ? copiedLabel : ''}
    </span>
  );

  if (iconOnly) {
    return (
      <>
        <Button
          variant={variant}
          size="icon"
          aria-label={label}
          disabled={isDisabled}
          onClick={handleClick}
          {...rest}
        >
          {icon}
        </Button>
        {status}
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        leftIcon={icon}
        disabled={isDisabled}
        onClick={handleClick}
        {...rest}
      >
        {copied ? copiedLabel : label}
      </Button>
      {status}
    </>
  );
}

export default CopyButton;
