import { forwardRef, useCallback, useId, useRef, useState } from 'react';
import { FormField } from '@/shared/components/ui';
import { X } from '@/shared/icons';
import { TEAM_MAX_INVITES } from '@/shared/constants';
import { cn } from '@/shared/utils/cn';
import {
  getInviteEmailProblem,
  normalizeEmail,
  splitEmailText,
} from '../schemas/teamValidation';

const TRAILING_SEPARATOR_RE = /[\s,;]$/;
const MULTI_ENTRY_RE = /[\s,;<]/;

/**
 * Email "chips" input for team invites (SN10).
 * - Enter, comma, space, semicolon or leaving the field turns the typed text into chips;
 *   pasting a list (even "Name <email>" address-book text) adds every address at once.
 * - Backspace in the empty input removes the last chip; every chip has a labelled remove button.
 * - Rejects bad formats, duplicates, the leader's own email (`ownEmail`), people already on the
 *   team (`blocked`: { [email]: reason }) and more than `max` entries, with an inline message.
 *   Fixable text (bad format, list full) stays in the input; the rest is dropped.
 * - Additions and removals are announced in a polite live region.
 *
 * Controlled: `value` (string[]) + `onChange(next)`. `onDraftChange(text)` reports text that is
 * typed but not yet a chip, so a form can refuse to submit while something is pending.
 * The forwarded ref points at the text input (react-hook-form's `field.ref` can focus it).
 */
export const EmailChipsInput = forwardRef(function EmailChipsInput(
  {
    id: idProp,
    label = "Teammates' emails",
    hint = 'Press Enter, comma or space after each email. You can also paste a list.',
    error,
    required = false,
    value,
    onChange,
    onBlur,
    onDraftChange,
    max = TEAM_MAX_INVITES,
    ownEmail = '',
    blocked,
    disabled = false,
    placeholder,
    className,
  },
  ref,
) {
  const autoId = useId();
  const inputId = idProp || autoId;
  const countId = `${inputId}-count`;
  const inputRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const emails = Array.isArray(value) ? value : [];
  const atLimit = emails.length >= max;
  const shownError = problem || error || null;

  const setInputRef = useCallback(
    (node) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const updateDraft = (text) => {
    setDraft(text);
    if (onDraftChange) onDraftChange(text);
  };

  const countText = (count) => `${count} of ${max} added.`;

  /** Adds every acceptable email in `tokens`; fixable text stays in the input. */
  const addTokens = (tokens) => {
    const next = [...emails];
    const added = [];
    const kept = [];
    let firstProblem = null;

    tokens.forEach((token) => {
      const email = normalizeEmail(token);
      if (!email) return;
      const issue = getInviteEmailProblem(email, { current: next, ownEmail, blocked, max });
      if (issue) {
        if (!firstProblem) firstProblem = issue;
        if (issue.keep) kept.push(String(token).trim());
        return;
      }
      next.push(email);
      added.push(email);
    });

    if (added.length > 0) {
      if (onChange) onChange(next);
      setAnnouncement(`Added ${added.join(', ')}. ${countText(next.length)}`);
    }
    setProblem(firstProblem ? firstProblem.message : null);
    updateDraft(kept.join(', '));
  };

  const commitDraft = () => {
    if (!draft.trim()) {
      if (draft) updateDraft('');
      return;
    }
    addTokens(splitEmailText(draft));
  };

  const removeEmail = (email, { refocus = true } = {}) => {
    const next = emails.filter((item) => item !== email);
    if (onChange) onChange(next);
    setProblem(null);
    setAnnouncement(`Removed ${email}. ${countText(next.length)}`);
    if (refocus) inputRef.current?.focus();
  };

  const handleChange = (event) => {
    const text = event.target.value;
    if (problem) setProblem(null);
    // Separators typed at the end (also from mobile keyboards, which report no key name) commit.
    if (TRAILING_SEPARATOR_RE.test(text)) addTokens(splitEmailText(text));
    else updateDraft(text);
  };

  const handleKeyDown = (event) => {
    if (event.nativeEvent?.isComposing) return;
    if (event.key === 'Enter') {
      // With text pending, Enter adds it; in an empty input it submits the form as usual.
      if (draft.trim()) {
        event.preventDefault();
        commitDraft();
      }
      return;
    }
    if (event.key === 'Backspace' && draft === '' && emails.length > 0) {
      event.preventDefault();
      removeEmail(emails[emails.length - 1], { refocus: false });
      return;
    }
    if (event.key === 'Escape' && (draft || problem)) {
      event.preventDefault();
      event.stopPropagation();
      updateDraft('');
      setProblem(null);
    }
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    if (!MULTI_ENTRY_RE.test(pasted.trim())) return; // a single address pastes normally
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    addTokens(splitEmailText(`${draft.slice(0, start)}${pasted}${draft.slice(end)}`));
  };

  const handleBlur = (event) => {
    commitDraft();
    if (onBlur) onBlur(event);
  };

  // Clicking the field's padding or a chip's text focuses the text input.
  const handleWrapperMouseDown = (event) => {
    if (disabled) return;
    const target = event.target;
    if (target instanceof Element && target.closest('button, input')) return;
    event.preventDefault();
    inputRef.current?.focus();
  };

  let effectivePlaceholder = placeholder;
  if (effectivePlaceholder === undefined) {
    if (atLimit) effectivePlaceholder = 'List full';
    else if (emails.length > 0) effectivePlaceholder = 'Add another email';
    else effectivePlaceholder = 'name@example.com';
  }

  return (
    <div className={cn('min-w-0', className)}>
      <FormField
        label={label}
        htmlFor={inputId}
        hint={hint}
        error={shownError}
        required={required}
        footer={
          <span className="tabular text-xs text-slate-500" aria-hidden="true">
            {emails.length}/{max}
          </span>
        }
      >
        {({ describedBy }) => (
          <div
            role="presentation"
            onMouseDown={handleWrapperMouseDown}
            className={cn(
              'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 shadow-sm transition-colors duration-150 focus-within:ring-4',
              shownError
                ? 'border-rose-400 focus-within:border-rose-500 focus-within:ring-rose-500/15'
                : 'border-slate-300 hover:border-slate-400 focus-within:border-brand-500 focus-within:ring-brand-500/15',
              disabled ? 'cursor-not-allowed bg-slate-50 shadow-none' : 'cursor-text',
            )}
          >
            {emails.length > 0 ? (
              <ul aria-label="Emails to invite" className="flex min-w-0 max-w-full flex-wrap gap-1.5">
                {emails.map((email) => (
                  <li
                    key={email}
                    className="inline-flex min-w-0 max-w-full items-center gap-0.5 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-0.5 text-sm text-brand-800 ring-1 ring-inset ring-brand-600/20"
                  >
                    <span className="truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      disabled={disabled}
                      aria-label={`Remove ${email}`}
                      className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-600 transition-colors duration-150 before:absolute before:-inset-1.5 before:content-[''] hover:bg-brand-100 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <input
              ref={setInputRef}
              id={inputId}
              type="text"
              inputMode="email"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={draft}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onBlur={handleBlur}
              disabled={disabled}
              placeholder={effectivePlaceholder}
              aria-invalid={shownError ? true : undefined}
              aria-required={required || undefined}
              aria-describedby={[describedBy, countId].filter(Boolean).join(' ')}
              className="h-8 min-w-[12rem] flex-1 border-0 bg-transparent px-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
        )}
      </FormField>
      <span id={countId} className="sr-only">
        {`${emails.length} of ${max} emails added.`}
      </span>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
});

export default EmailChipsInput;
