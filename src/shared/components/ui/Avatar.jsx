import { useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { getInitials } from '@/shared/utils/helpers';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

// Tinted background + matching ink pairs; the same name always gets the same pair.
const PALETTE = [
  'bg-brand-100 text-brand-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-800',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
];

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/**
 * User avatar: the photo when `src` loads, otherwise initials on a deterministic tinted background.
 * Announced as the person's name; pass aria-hidden="true" when the name is already visible next to it.
 */
export function Avatar({ name = '', src, size = 'md', alt, className, ...rest }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const displayName = String(name || '').trim();
  const sizeClass = SIZES[size] ?? SIZES.md;
  const base = 'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full';

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt={alt ?? displayName}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className={cn(base, sizeClass, 'bg-slate-100 object-cover', className)}
        {...rest}
      />
    );
  }

  const tone = PALETTE[hashString(displayName || '?') % PALETTE.length];

  return (
    <span
      role="img"
      aria-label={alt ?? (displayName || 'User')}
      className={cn(base, sizeClass, 'font-semibold leading-none', tone, className)}
      {...rest}
    >
      <span aria-hidden="true">{getInitials(displayName)}</span>
    </span>
  );
}

export default Avatar;
