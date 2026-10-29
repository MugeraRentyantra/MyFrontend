import { DEFAULT_DISCOUNT_SLABS } from '@/shared/constants';

/** ["a", "b", "c"] -> "a, b or c" (conjunction configurable). */
export function formatList(items = [], conjunction = 'or') {
  const parts = items.filter((item) => item !== null && item !== undefined && item !== '');
  if (parts.length === 0) return '';
  if (parts.length === 1) return String(parts[0]);
  return `${parts.slice(0, -1).join(', ')} ${conjunction} ${parts[parts.length - 1]}`;
}

/** [1, 2, 3, 6] -> "1, 2, 3 or 6 months"; [1] -> "1 month". */
export function formatDurationOptions(durations = []) {
  const months = [...new Set(durations.map(Number))]
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (months.length === 0) return '';
  const unit = months.length === 1 && months[0] === 1 ? 'month' : 'months';
  return `${formatList(months)} ${unit}`;
}

/**
 * Highest discount in the illustrative default slabs (marketing copy only — the live slabs
 * come from the server and the exact discount is confirmed after the assessment).
 */
export const MAX_EXAMPLE_DISCOUNT_PERCENT = Math.max(
  0,
  ...DEFAULT_DISCOUNT_SLABS.map((slab) => Number(slab.discountPercent) || 0),
);
