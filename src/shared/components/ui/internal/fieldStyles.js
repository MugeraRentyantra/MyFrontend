/**
 * Shared class names and tiny helpers for the input-like controls of the UI kit
 * (Input, PasswordInput, Textarea, Select, SearchBar, Checkbox, RadioGroup, FormField).
 * Plain JavaScript: no JSX in this file.
 */
import { isValidElement } from 'react';
import { cn } from '@/shared/utils/cn';

/** Height, horizontal padding and text size per control size. */
export const FIELD_SIZE_CLASSES = Object.freeze({
  sm: 'h-8 px-2.5 text-sm',
  md: 'h-10 px-3 text-sm',
});

/** Where a leading icon sits inside a field (pairs with the left padding below). */
export const FIELD_ICON_OFFSET_CLASSES = Object.freeze({
  sm: 'pl-2.5',
  md: 'pl-3',
});

const LEFT_ICON_PADDING = { sm: 'pl-8', md: 'pl-9' };
const RIGHT_ELEMENT_PADDING = { sm: 'pr-8', md: 'pr-10' };

export const fieldLabelClasses = 'mb-1.5 block text-sm font-medium text-slate-700';
export const fieldHintClasses = 'text-xs text-slate-500';
export const fieldErrorClasses = 'text-xs text-rose-600';
export const fieldIconClasses = 'h-4 w-4 shrink-0 text-slate-400';
export const requiredMarkClasses = 'ml-0.5 text-rose-600';

const FIELD_BASE = [
  'block w-full min-w-0 rounded-lg border bg-white text-slate-900 shadow-sm',
  'transition-colors duration-150 placeholder:text-slate-400',
  'focus:outline-none focus:ring-4',
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:shadow-none',
].join(' ');

const FIELD_VALID =
  'border-slate-300 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-500/15 disabled:border-slate-200';

const FIELD_INVALID = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15';

/**
 * Classes for a text-like field (input, select, textarea).
 * fieldClasses({ error, size: 'sm'|'md', hasLeftIcon, hasRightElement, multiline })
 */
export function fieldClasses({
  error = false,
  size = 'md',
  hasLeftIcon = false,
  hasRightElement = false,
  multiline = false,
} = {}) {
  const sizeKey = size === 'sm' ? 'sm' : 'md';
  return cn(
    FIELD_BASE,
    error ? FIELD_INVALID : FIELD_VALID,
    multiline ? 'px-3 py-2 text-sm leading-6' : FIELD_SIZE_CLASSES[sizeKey],
    hasLeftIcon && LEFT_ICON_PADDING[sizeKey],
    hasRightElement && RIGHT_ELEMENT_PADDING[sizeKey],
  );
}

/** Deterministic ids derived from a control id, so labels and messages can be wired with ARIA. */
export function fieldIds(baseId) {
  return {
    labelId: `${baseId}-label`,
    hintId: `${baseId}-hint`,
    errorId: `${baseId}-error`,
    countId: `${baseId}-count`,
    descriptionId: `${baseId}-description`,
  };
}

/** Joins id references for aria-describedby / aria-labelledby; undefined when empty. */
export function joinIds(...ids) {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

/** True for anything worth rendering (0 counts; null, undefined, false and '' do not). */
export function hasContent(node) {
  return node !== null && node !== undefined && node !== false && node !== '';
}

/**
 * The visible message for an `error` prop, or null.
 * Accepts a string/node, a react-hook-form FieldError ({ message }) or `true` (invalid styling only).
 */
export function resolveFieldError(error) {
  if (error === null || error === undefined || error === false || error === true || error === '') {
    return null;
  }
  if (typeof error === 'string' || typeof error === 'number') return error;
  if (isValidElement(error) || Array.isArray(error)) return error;
  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message || null;
  }
  return null;
}

/** Whether an `error` prop marks the control invalid (with or without a message). */
export function isFieldInvalid(error) {
  return error === true || resolveFieldError(error) !== null;
}

/** Writes a DOM node into a callback ref or a ref object (used to merge forwarded refs). */
export function assignRef(ref, node) {
  if (typeof ref === 'function') {
    ref(node);
  } else if (ref && typeof ref === 'object') {
    ref.current = node;
  }
}
