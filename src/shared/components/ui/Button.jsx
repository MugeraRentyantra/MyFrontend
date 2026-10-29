import { forwardRef, isValidElement } from 'react';
import { Loader2 } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const BASE_CLASSES = [
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium select-none',
  'transition-colors duration-150',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
].join(' ');

const VARIANT_CLASSES = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200',
  outline:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 focus-visible:ring-rose-500',
  success:
    'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500',
  link: 'rounded-sm text-brand-700 underline-offset-4 hover:text-brand-800 hover:underline',
};

const SIZE_CLASSES = {
  xs: 'h-7 gap-1 px-2.5 text-xs',
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-base',
  icon: 'h-10 w-10 p-0',
};

/** The link variant has no height or padding: it sits inline with text. */
const LINK_SIZE_CLASSES = {
  xs: 'gap-1 text-xs',
  sm: 'gap-1.5 text-sm',
  md: 'gap-1.5 text-sm',
  lg: 'gap-2 text-base',
  icon: 'p-0',
};

const ICON_SIZE_CLASSES = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  icon: 'h-4 w-4',
};

/** Accepts an icon component (function or forwardRef/memo object) or a ready-made element. */
function renderIcon(icon, className) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (typeof icon === 'function' || (typeof icon === 'object' && '$$typeof' in icon)) {
    const IconComponent = icon;
    return <IconComponent className={className} aria-hidden="true" />;
  }
  return icon;
}

/**
 * Button — variants primary | secondary | outline | ghost | danger | success | link,
 * sizes xs | sm | md | lg | icon (square; give it an aria-label).
 * `as` renders another element/component (e.g. a router Link or 'a'); extra props such as
 * `to`/`href` pass through. Disabled/loading non-button elements get aria-disabled and
 * swallow clicks instead of receiving the native `disabled` attribute.
 */
export const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    variant = 'primary',
    size = 'md',
    type = 'button',
    loading = false,
    disabled = false,
    fullWidth = false,
    leftIcon = null,
    rightIcon = null,
    className,
    children,
    onClick,
    tabIndex,
    ...rest
  },
  ref,
) {
  const isNativeButton = Component === 'button';
  const isDisabled = Boolean(disabled || loading);
  const sizeKey = SIZE_CLASSES[size] ? size : 'md';
  const isLinkVariant = variant === 'link';
  const iconClassName = cn('shrink-0', ICON_SIZE_CLASSES[sizeKey]);

  const handleClick = (event) => {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (onClick) onClick(event);
  };

  const stateProps = isNativeButton
    ? { type, disabled: isDisabled, tabIndex }
    : { 'aria-disabled': isDisabled ? true : undefined, tabIndex: isDisabled ? -1 : tabIndex };

  const spinner = <Loader2 className={cn(iconClassName, 'animate-spin')} aria-hidden="true" />;

  let content;
  if (sizeKey === 'icon') {
    content = loading ? spinner : (children ?? renderIcon(leftIcon, iconClassName));
  } else {
    content = (
      <>
        {loading ? spinner : renderIcon(leftIcon, iconClassName)}
        {children}
        {renderIcon(rightIcon, iconClassName)}
      </>
    );
  }

  return (
    <Component
      ref={ref}
      className={cn(
        BASE_CLASSES,
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        isLinkVariant ? LINK_SIZE_CLASSES[sizeKey] : SIZE_CLASSES[sizeKey],
        fullWidth && 'w-full',
        className,
      )}
      aria-busy={loading ? true : undefined}
      {...rest}
      {...stateProps}
      onClick={handleClick}
    >
      {content}
    </Component>
  );
});

export default Button;
