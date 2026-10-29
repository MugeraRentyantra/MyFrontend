import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

/**
 * Toast notifications. `toast` works anywhere (module-level store), `<Toaster />` is rendered
 * once by RootLayout. toast.success('Saved', { description, duration })
 */

const DEFAULT_DURATION = 4500;
const ERROR_DURATION = 7000;
const MAX_VISIBLE = 4;

let toasts = [];
let counter = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return toasts;
}

function add(type, title, options = {}) {
  counter += 1;
  const id = options.id ?? `toast-${counter}`;
  const item = {
    id,
    type,
    title,
    description: options.description,
    duration: options.duration ?? (type === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
  };
  toasts = [...toasts.filter((existing) => existing.id !== id), item].slice(-MAX_VISIBLE);
  emit();
  return id;
}

function dismiss(id) {
  toasts = id === undefined ? [] : toasts.filter((item) => item.id !== id);
  emit();
}

export const toast = {
  success: (title, options) => add('success', title, options),
  error: (title, options) => add('error', title, options),
  info: (title, options) => add('info', title, options),
  warning: (title, options) => add('warning', title, options),
  dismiss,
};

export function useToast() {
  return toast;
}

const STYLES = {
  success: { icon: CheckCircle2, className: 'text-emerald-600' },
  error: { icon: XCircle, className: 'text-rose-600' },
  info: { icon: Info, className: 'text-sky-600' },
  warning: { icon: AlertTriangle, className: 'text-amber-600' },
};

function ToastItem({ item }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);
  const style = STYLES[item.type] ?? STYLES.info;
  const Icon = style.icon;

  useEffect(() => {
    if (paused || !item.duration || !Number.isFinite(item.duration)) return undefined;
    startedAt.current = Date.now();
    const timer = setTimeout(() => dismiss(item.id), Math.max(0, remaining.current));
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - startedAt.current;
    };
  }, [paused, item.id, item.duration]);

  return (
    <div
      role={item.type === 'error' ? 'alert' : 'status'}
      aria-live={item.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex animate-slide-up gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-elevated"
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.className)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
        {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        aria-label="Dismiss notification"
        className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed inset-x-2 top-2 z-[70] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[380px]"
    >
      {items.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </div>,
    document.body,
  );
}

export default Toaster;
