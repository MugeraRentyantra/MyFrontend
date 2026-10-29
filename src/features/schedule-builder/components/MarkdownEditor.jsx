import { useId, useState } from 'react';
import { Prose, Tabs, Textarea } from '@/shared/components/ui';
import { Eye, Pencil } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const DEFAULT_HINT = 'Markdown supported. Content is sanitised before students see it.';

/**
 * Markdown field with Write | Preview tabs (KD6 SOP content). Write is a monospace textarea; Preview
 * renders the same markdown through <Prose> (DOMPurify-sanitised). Read-only fields open on Preview.
 */
export function MarkdownEditor({
  id: idProp,
  label = 'Content',
  value = '',
  onChange,
  onBlur,
  readOnly = false,
  error,
  hint = DEFAULT_HINT,
  rows = 10,
  maxLength,
  placeholder,
  defaultMode,
  className,
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const hintId = `${id}-md-hint`;
  const [mode, setMode] = useState(defaultMode ?? (readOnly ? 'preview' : 'write'));
  const text = value ?? '';
  const hasContent = text.trim().length > 0;

  const items = [
    {
      value: 'write',
      label: readOnly ? 'Source' : 'Write',
      icon: Pencil,
      content: (
        <Textarea
          id={id}
          value={text}
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={onBlur}
          readOnly={readOnly}
          rows={rows}
          placeholder={placeholder}
          error={error}
          showCount={Boolean(maxLength) && !readOnly}
          maxLength={maxLength}
          aria-describedby={hintId}
          spellCheck
          textareaClassName="font-mono text-[13px] leading-6"
        />
      ),
    },
    {
      value: 'preview',
      label: 'Preview',
      icon: Eye,
      content: hasContent ? (
        <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-slate-200 bg-white px-4 py-3">
          <Prose markdown={text} className="prose-sm" />
        </div>
      ) : (
        <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500">
          Nothing to preview yet.
        </div>
      ),
    },
  ];

  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <Tabs
        items={items}
        value={mode}
        onChange={setMode}
        variant="pills"
        aria-label={`${label}: write or preview`}
        panelClassName="mt-2"
      />
      {/* While previewing, the textarea (and its error) is not rendered: keep the error visible. */}
      {mode === 'preview' && error ? (
        <p role="alert" className="mt-1.5 text-xs text-rose-600">
          {typeof error === 'string' ? error : error?.message}
        </p>
      ) : null}
      <p id={hintId} className="mt-1.5 text-xs text-slate-500">
        {hint}
      </p>
    </div>
  );
}

export default MarkdownEditor;
