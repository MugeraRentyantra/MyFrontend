import { useEffect, useId, useState } from 'react';
import { Avatar, Badge } from '@/shared/components/ui';
import { ROLE_LABELS, USE_MOCKS } from '@/shared/constants';
import { ChevronDown, ShieldAlert, Sparkles } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { humanize } from '@/shared/utils/helpers';

const ROLE_BADGE_VARIANT = { STUDENT: 'info', TRAINER: 'purple', ADMIN: 'orange' };

const ROW_CLASS =
  'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

/**
 * Mock mode only (SN3): a collapsible list of the seeded demo accounts. Choosing one calls
 * `onSelect({ email, password, name })`; the login form fills its fields and focuses "Log in".
 * The account list is imported lazily inside an effect, so it is never downloaded when the app
 * runs against the real API.
 */
export function DemoAccounts({ onSelect, className }) {
  const headingId = useId();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!USE_MOCKS) return undefined;
    let active = true;
    import('@/mocks/demoAccounts')
      .then((module) => {
        if (!active) return;
        setData({
          accounts: Array.isArray(module.DEMO_ACCOUNTS) ? module.DEMO_ACCOUNTS : [],
          password: module.DEMO_PASSWORD ?? '',
          suspended: module.SUSPENDED_ACCOUNT ?? null,
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!USE_MOCKS || failed) return null;

  const choose = (account) => {
    if (!data) return;
    onSelect?.({ email: account.email, password: data.password, name: account.name });
    setAnnouncement(`Filled in the details for ${account.name}. Press Log in to continue.`);
  };

  return (
    <section
      aria-labelledby={headingId}
      className={cn('rounded-xl border border-dashed border-slate-300 bg-slate-50/70', className)}
    >
      <h2 id={headingId} className="text-sm">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
          className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-left font-medium text-slate-800 transition-colors duration-150 hover:bg-slate-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>Try a demo account</span>
            <Badge>Mock API</Badge>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-150',
              open && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </button>
      </h2>

      <div id={panelId} hidden={!open} className="border-t border-slate-200 px-2 pb-2 pt-3">
        {data ? (
          <>
            <p className="px-3 text-xs text-slate-500">
              Choose an account to fill in the form. Every demo account uses the password{' '}
              <code className="font-mono font-semibold text-slate-700">{data.password}</code>.
            </p>
            <ul role="list" className="mt-2 space-y-0.5">
              {data.accounts.map((account) => (
                <li key={account.key ?? account.email}>
                  <button type="button" className={ROW_CLASS} onClick={() => choose(account)}>
                    <Avatar name={account.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-900">{account.name}</span>
                        <Badge variant={ROLE_BADGE_VARIANT[account.role] ?? 'neutral'}>
                          {ROLE_LABELS[account.role] ?? humanize(account.role)}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {account.description}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-slate-500">
                        {account.email}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {data.suspended ? (
                <li className="mt-1 border-t border-slate-200 pt-1">
                  <button
                    type="button"
                    className={ROW_CLASS}
                    onClick={() => choose(data.suspended)}
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"
                    >
                      <ShieldAlert className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-900">
                          {data.suspended.name}
                        </span>
                        <Badge variant="danger">Suspended</Badge>
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        Shows the suspended-account message
                      </span>
                      <span className="block truncate font-mono text-[11px] text-slate-500">
                        {data.suspended.email}
                      </span>
                    </span>
                  </button>
                </li>
              ) : null}
            </ul>
          </>
        ) : (
          <p className="px-3 py-2 text-xs text-slate-500">Loading demo accounts…</p>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

export default DemoAccounts;
