import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  CopyButton,
  Input,
  PageLoader,
  Select,
  StatusBadge,
  toast,
} from '@/shared/components/ui';
import { useAuth } from '@/shared/hooks';
import { ROLE_LABELS, ROUTES, STORAGE_KEYS, getHomeRoute } from '@/shared/constants';
import { queryClient } from '@/services/queryClient';
import { getErrorMessage } from '@/shared/utils/errors';
import { formatRelativeTime, humanize } from '@/shared/utils/helpers';
import { cn } from '@/shared/utils/cn';
import {
  AlertTriangle,
  ArrowRight,
  Database,
  ExternalLink,
  Inbox,
  LogIn,
  LogOut,
  RotateCcw,
  Users,
  Wifi,
  Wrench,
  X,
} from '@/shared/icons';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from './demoAccounts';
import { db, resetDb } from './db';
import { SCENARIOS, clearRefreshSession, getMockSettings, setMockSettings } from './utils';

/**
 * Floating developer panel (ticket GP1), rendered by RootLayout only when VITE_USE_MOCKS=true:
 * quick demo logins, an inbox of the emails the mock API "sent", network latency and failure
 * scenarios, and a reset of the mock database. It never ships behaviour to the real-API build.
 */

const INBOX_LIMIT = 8;
const INBOX_REFRESH_MS = 2000;
const LATENCY_OPTIONS = [0, 150, 350, 800, 2000];
const LATENCY_HINTS = { 0: 'instant', 150: 'fast', 350: 'typical', 800: 'slow', 2000: 'very slow' };
const TAB_STORAGE_KEY = 'ip.mock.devtoolsTab';

const TABS = [
  { value: 'accounts', label: 'Accounts', icon: Users },
  { value: 'inbox', label: 'Inbox', icon: Inbox },
  { value: 'network', label: 'Network', icon: Wifi },
  { value: 'data', label: 'Data', icon: Database },
];

const ROLE_BADGE_VARIANT = { STUDENT: 'info', TRAINER: 'purple', ADMIN: 'orange' };

const SCENARIO_SHORT_LABELS = {
  validation: '422',
  unauthorized: '401',
  forbidden: '403',
  'not-found': '404',
  empty: 'Empty',
  'server-error': '500',
  'network-error': 'Offline',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStoredTab() {
  try {
    const value = window.localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.some((tab) => tab.value === value) ? value : TABS[0].value;
  } catch {
    return TABS[0].value;
  }
}

function storeTab(value) {
  try {
    window.localStorage.setItem(TAB_STORAGE_KEY, value);
  } catch {
    // storage unavailable: the tab simply is not remembered
  }
}

function toTime(value) {
  const time = new Date(value ?? 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function readRecentEmails() {
  const jobs = Array.isArray(db?.emailJobs) ? db.emailJobs : [];
  return [...jobs]
    .filter(Boolean)
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, INBOX_LIMIT)
    .map((job) => ({ ...job }));
}

function countOf(collection) {
  return Array.isArray(collection) ? collection.length : 0;
}

function getScenarioLabel(value) {
  return SCENARIOS.find((scenario) => scenario.value === value)?.label ?? humanize(value);
}

function isScenarioActive(settings) {
  return Boolean(settings?.scenario) && settings.scenario !== 'none';
}

function formatLatency(ms) {
  const hint = LATENCY_HINTS[ms];
  return hint ? `${ms} ms — ${hint}` : `${ms} ms`;
}

function describeSettings(settings) {
  const scenario = isScenarioActive(settings)
    ? `${getScenarioLabel(settings.scenario)}${
        settings.scenarioMatch ? ` on paths containing "${settings.scenarioMatch}"` : ''
      }`
    : 'normal responses';
  return `${settings.latency} ms latency · ${scenario}`;
}

/** Same-origin http(s) links become in-app navigations; anything else is ignored or opened. */
function resolveEmailLink(link) {
  if (typeof link !== 'string' || !link) return null;
  if (link.startsWith('/') && !link.startsWith('//')) return { internal: true, path: link };
  try {
    const url = new URL(link, window.location.origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.origin === window.location.origin) {
      return { internal: true, path: `${url.pathname}${url.search}${url.hash}` };
    }
    return { internal: false, href: url.toString() };
  } catch {
    return null;
  }
}

/**
 * Client-side leftovers that would point at records the reset removes (the seed gets new ids).
 * The mock database itself is rebuilt and saved synchronously by resetDb().
 */
function clearClientLearningState() {
  const stores = [];
  try {
    stores.push(window.localStorage);
  } catch {
    // blocked
  }
  try {
    stores.push(window.sessionStorage);
  } catch {
    // blocked
  }
  stores.forEach((storage) => {
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (
          key &&
          (key === STORAGE_KEYS.activeEnrollmentId ||
            key.startsWith(STORAGE_KEYS.assessmentDraftPrefix))
        ) {
          storage.removeItem(key);
        }
      }
    } catch {
      // storage unavailable
    }
  });
}

/** Re-reads the mock email queue every 2 s while the panel is open. */
function useRecentEmails(enabled) {
  const [emails, setEmails] = useState([]);
  useEffect(() => {
    if (!enabled) return undefined;
    const refresh = () => setEmails(readRecentEmails());
    refresh();
    const timer = window.setInterval(refresh, INBOX_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [enabled]);
  return emails;
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function DevtoolsTabs({ idPrefix, value, onChange, alertTab }) {
  const buttonsRef = useRef([]);

  const handleKeyDown = (event, index) => {
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    onChange(TABS[next].value);
    buttonsRef.current[next]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Devtools sections"
      className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1"
    >
      {TABS.map((tab, index) => {
        const selected = tab.value === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative flex h-9 items-center justify-center gap-1.5 rounded-md px-1 text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              selected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            <Icon className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
            {tab.label}
            {alertTab === tab.value ? (
              <span
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500"
                aria-hidden="true"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function AccountsSection({ user, isAuthenticated, switchingTo, onLogin, onLogout }) {
  const currentEmail = isAuthenticated ? String(user?.email ?? '').toLowerCase() : '';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-xs text-slate-600">
          Password for every account:{' '}
          <code className="font-mono font-semibold text-slate-900">{DEMO_PASSWORD}</code>
        </p>
        <CopyButton
          value={DEMO_PASSWORD}
          label="Copy password"
          iconOnly
          variant="ghost"
          className="h-8 w-8 shrink-0"
        />
      </div>

      {isAuthenticated && user ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
          <p className="min-w-0 truncate text-xs text-emerald-900">
            Signed in as <span className="font-semibold">{user.name || user.email}</span>
          </p>
          <Button size="xs" variant="ghost" leftIcon={LogOut} onClick={onLogout}>
            Log out
          </Button>
        </div>
      ) : null}

      <ul role="list" className="space-y-2">
        {DEMO_ACCOUNTS.map((account) => {
          const isCurrent = currentEmail !== '' && currentEmail === account.email.toLowerCase();
          const isPending = switchingTo?.key === account.key;
          return (
            <li
              key={account.key}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3',
                isCurrent ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200',
              )}
            >
              <Avatar name={account.name} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-900">{account.name}</p>
                  <Badge variant={ROLE_BADGE_VARIANT[account.role] ?? 'neutral'}>
                    {ROLE_LABELS[account.role] ?? humanize(account.role)}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{account.description}</p>
                <p className="truncate font-mono text-[11px] text-slate-500">{account.email}</p>
              </div>
              {isCurrent ? (
                <Badge variant="success" dot>
                  Current
                </Badge>
              ) : (
                <Button
                  size="xs"
                  variant="outline"
                  leftIcon={LogIn}
                  loading={isPending}
                  disabled={Boolean(switchingTo)}
                  onClick={() => onLogin(account)}
                  aria-label={`Log in as ${account.name}`}
                >
                  Log in
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InboxSection({ emails, onOpenLink }) {
  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-8 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-medium text-slate-900">No emails yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Register, reset a password or invite a teammate. Emails the mock API sends appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        The {emails.length} most recent emails sent by the mock API. Updates every 2 seconds.
      </p>
      <ul role="list" className="space-y-2">
        {emails.map((email, index) => {
          const target = resolveEmailLink(email.link);
          return (
            <li
              key={email._id ?? `${email.to}-${email.createdAt}-${index}`}
              className="rounded-xl border border-slate-200 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium text-slate-900">
                  {email.subject || humanize(email.template) || 'Email'}
                </p>
                {email.status ? <StatusBadge status={email.status} /> : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">To {email.to}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <time dateTime={email.createdAt} className="text-xs text-slate-500">
                  {formatRelativeTime(email.createdAt)}
                </time>
                {target ? (
                  <Button
                    size="xs"
                    variant="outline"
                    rightIcon={target.internal ? ArrowRight : ExternalLink}
                    onClick={() => onOpenLink(target)}
                  >
                    Open link
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NetworkSection({ draft, settings, isDirty, onDraftChange, onApply, onRestore }) {
  const scenarioActive = isScenarioActive(settings);
  const latencyValues = Array.from(
    new Set([...LATENCY_OPTIONS, Number(settings.latency), Number(draft.latency)]),
  )
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => a - b);

  return (
    <form className="space-y-4" onSubmit={onApply} noValidate>
      {scenarioActive ? (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-inset ring-amber-600/20"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p>
            <span className="font-semibold">{getScenarioLabel(settings.scenario)}</span> is active
            {settings.scenarioMatch
              ? ` for paths containing "${settings.scenarioMatch}".`
              : ' for every request.'}
          </p>
        </div>
      ) : null}

      <Select
        label="Latency"
        size="sm"
        value={String(draft.latency)}
        onChange={(event) => onDraftChange({ latency: Number(event.target.value) })}
        options={latencyValues.map((value) => ({ value: String(value), label: formatLatency(value) }))}
        hint="Delay added to every mock response."
      />
      <Select
        label="Failure scenario"
        size="sm"
        value={draft.scenario}
        onChange={(event) => onDraftChange({ scenario: event.target.value })}
        options={SCENARIOS.map(({ value, label }) => ({ value, label }))}
      />
      <Input
        label="Only paths containing"
        size="sm"
        value={draft.scenarioMatch ?? ''}
        onChange={(event) => onDraftChange({ scenarioMatch: event.target.value })}
        placeholder="/payments"
        hint="Leave empty to apply the scenario to every request."
        autoComplete="off"
        spellCheck={false}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={!isDirty}>
          Apply
        </Button>
        {scenarioActive ? (
          <Button size="sm" variant="ghost" onClick={onRestore}>
            Restore normal responses
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function DataSection({ onReset }) {
  const stats = [
    { label: 'Users', value: countOf(db?.users) },
    { label: 'Enrollments', value: countOf(db?.enrollments) },
    { label: 'Submissions', value: countOf(db?.taskSubmissions) },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        The mock database lives in this browser (localStorage), so your changes survive reloads.
      </p>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-[11px] font-medium text-slate-500">{stat.label}</dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
        <p className="text-sm font-medium text-slate-900">Reset demo data</p>
        <p className="mt-1 text-xs text-slate-600">
          Restores the original demo seed, signs you out and reloads the app.
        </p>
        <div className="mt-3">
          <Button size="sm" variant="danger" leftIcon={RotateCcw} onClick={onReset}>
            Reset demo data
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function MockDevtools() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panelId = useId();
  const tabsId = useId();
  const toggleRef = useRef(null);
  const panelRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(readStoredTab);
  const [settings, setSettings] = useState(getMockSettings);
  const [draft, setDraft] = useState(getMockSettings);
  const [switchingTo, setSwitchingTo] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const emails = useRecentEmails(open);

  const scenarioActive = isScenarioActive(settings);
  const isDirty =
    Number(draft.latency) !== Number(settings.latency) ||
    draft.scenario !== settings.scenario ||
    String(draft.scenarioMatch ?? '').trim() !== String(settings.scenarioMatch ?? '');

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const closePanel = useCallback(({ restoreFocus = true } = {}) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key !== 'Escape' || !open || event.defaultPrevented) return;
    event.stopPropagation();
    closePanel();
  };

  const changeTab = (value) => {
    setTab(value);
    storeTab(value);
  };

  // -- Demo accounts --------------------------------------------------------

  const handleLogin = async (account) => {
    if (switchingTo) return;
    setSwitchingTo(account);
    closePanel({ restoreFocus: false });
    try {
      // Leave guarded pages first so no route guard redirect races the account switch.
      if (pathname !== ROUTES.HOME) navigate(ROUTES.HOME);
      if (isAuthenticated) await logout();
      const signedIn = await login({ email: account.email, password: DEMO_PASSWORD });
      navigate(getHomeRoute(signedIn), { replace: true });
      toast.success(`Signed in as ${signedIn?.name ?? account.name}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not sign in with this demo account.'));
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleLogout = async () => {
    closePanel({ restoreFocus: false });
    await logout();
    navigate(ROUTES.LOGIN, { replace: true });
    toast.info('You have been logged out.');
  };

  // -- Inbox ----------------------------------------------------------------

  const openEmailLink = (target) => {
    if (!target) return;
    if (target.internal) {
      closePanel({ restoreFocus: false });
      navigate(target.path);
      return;
    }
    window.open(target.href, '_blank', 'noopener,noreferrer');
  };

  // -- Network --------------------------------------------------------------

  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const applySettings = (event) => {
    event.preventDefault();
    const next = setMockSettings({
      latency: Math.max(0, Number(draft.latency) || 0),
      scenario: draft.scenario || 'none',
      scenarioMatch: String(draft.scenarioMatch ?? '').trim(),
    });
    setSettings(next);
    setDraft(next);
    toast.success('Mock network settings applied', { description: describeSettings(next) });
  };

  const restoreNormal = () => {
    const next = setMockSettings({ scenario: 'none', scenarioMatch: '' });
    setSettings(next);
    setDraft(next);
    toast.success('Requests behave normally again');
  };

  // -- Data -----------------------------------------------------------------

  const handleReset = () => {
    setResetting(true);
    try {
      resetDb();
      clearRefreshSession();
      clearClientLearningState();
      queryClient.clear();
      window.location.assign('/');
    } catch (error) {
      setResetting(false);
      toast.error(getErrorMessage(error, 'Could not reset the demo data.'));
    }
  };

  const toggleLabel = scenarioActive
    ? `Mock API devtools (failure scenario active: ${getScenarioLabel(settings.scenario)})`
    : 'Mock API devtools';

  return (
    <>
      <div className="no-print" onKeyDown={handleKeyDown}>
        {open ? (
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label="Mock API devtools"
            tabIndex={-1}
            className="fixed bottom-16 left-4 z-[45] flex max-h-[70vh] w-[min(92vw,380px)] animate-scale-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-elevated focus:outline-none"
          >
            <div className="shrink-0 border-b border-slate-200 px-4 pb-3 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Wrench className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    Mock API devtools
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Development tool · hidden when using the real API
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => closePanel()}
                  aria-label="Close devtools"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-3">
                <DevtoolsTabs
                  idPrefix={tabsId}
                  value={tab}
                  onChange={changeTab}
                  alertTab={scenarioActive ? 'network' : null}
                />
              </div>
            </div>

            <div
              role="tabpanel"
              id={`${tabsId}-panel`}
              aria-labelledby={`${tabsId}-tab-${tab}`}
              className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4"
            >
              {tab === 'accounts' ? (
                <AccountsSection
                  user={user}
                  isAuthenticated={isAuthenticated}
                  switchingTo={switchingTo}
                  onLogin={(account) => {
                    void handleLogin(account);
                  }}
                  onLogout={() => {
                    void handleLogout();
                  }}
                />
              ) : null}
              {tab === 'inbox' ? <InboxSection emails={emails} onOpenLink={openEmailLink} /> : null}
              {tab === 'network' ? (
                <NetworkSection
                  draft={draft}
                  settings={settings}
                  isDirty={isDirty}
                  onDraftChange={updateDraft}
                  onApply={applySettings}
                  onRestore={restoreNormal}
                />
              ) : null}
              {tab === 'data' ? <DataSection onReset={() => setConfirmOpen(true)} /> : null}
            </div>
          </div>
        ) : null}

        <button
          ref={toggleRef}
          type="button"
          onClick={() => (open ? closePanel() : setOpen(true))}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={toggleLabel}
          className="fixed bottom-4 left-4 z-[45] inline-flex h-10 items-center gap-2 rounded-full bg-slate-900 px-3 text-sm font-medium text-white shadow-elevated transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          <Wrench className="h-4 w-4" aria-hidden="true" />
          <span>Mock API</span>
          {scenarioActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-amber-950">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              {SCENARIO_SHORT_LABELS[settings.scenario] ?? 'Scenario'}
            </span>
          ) : null}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!resetting) setConfirmOpen(false);
        }}
        onConfirm={handleReset}
        title="Reset demo data?"
        message="Every account, enrollment, submission and email returns to the original demo seed. You will be signed out and the app reloads."
        confirmLabel="Reset data"
        variant="danger"
        loading={resetting}
      />

      {switchingTo ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <PageLoader label={`Signing in as ${switchingTo.name}…`} />
        </div>
      ) : null}
    </>
  );
}

export default MockDevtools;
