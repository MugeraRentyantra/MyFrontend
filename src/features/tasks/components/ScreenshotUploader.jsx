import { useEffect, useId, useRef, useState } from 'react';
import { Button, FormField } from '@/shared/components/ui';
import { AlertCircle, ImageIcon, ImagePlus, UploadCloud, X } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatBytes } from '@/shared/utils/helpers';
import {
  MAX_FILE_SIZE_LABEL,
  SCREENSHOT_ACCEPT,
  SUBMISSION_RULES,
  fileKey,
  validateScreenshotFile,
} from '../schemas/submissionValidation';

const canPreview = () =>
  typeof URL !== 'undefined' &&
  typeof URL.createObjectURL === 'function' &&
  typeof URL.revokeObjectURL === 'function';

/** Object URLs for image previews; every URL is revoked when the files change or on unmount. */
function useObjectUrls(files) {
  const [urls, setUrls] = useState(() => new Map());
  useEffect(() => {
    if (!canPreview() || !files.length) {
      setUrls(new Map());
      return undefined;
    }
    const next = new Map();
    files.forEach((file) => {
      try {
        next.set(fileKey(file), URL.createObjectURL(file));
      } catch {
        // not a Blob (should not happen): the tile shows an icon instead
      }
    });
    setUrls(next);
    return () => next.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  return urls;
}

/**
 * Screenshot picker (GP8): drag-and-drop zone plus a keyboard-accessible "Choose files" button
 * driving a hidden file input; previews with remove buttons; per-file checks (PNG/JPG/WebP,
 * 5 MB each, 5 in total) with a clear message for every file that was not added.
 * Controlled: `files` (File[]) + `onChange(nextFiles)`; `onBlur` marks the field as touched.
 */
export function ScreenshotUploader({
  files = [],
  onChange,
  onBlur,
  error,
  disabled = false,
  label = 'Screenshots',
  hint,
}) {
  const inputId = useId();
  const statusId = `${inputId}-status`;
  const inputRef = useRef(null);
  const chooseRef = useRef(null);
  const focusChooseRef = useRef(false);
  const dragDepth = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [rejections, setRejections] = useState([]);
  const previews = useObjectUrls(files);

  const max = SUBMISSION_RULES.maxScreenshots;
  const remaining = Math.max(0, max - files.length);
  const isFull = remaining === 0;

  useEffect(() => {
    if (focusChooseRef.current && chooseRef.current && !chooseRef.current.disabled) {
      focusChooseRef.current = false;
      chooseRef.current.focus();
    }
  }, [files]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList ?? []);
    if (!incoming.length || disabled) return;

    const accepted = [];
    const rejected = [];
    const seen = new Set(files.map(fileKey));

    incoming.forEach((file) => {
      const problem = validateScreenshotFile(file);
      if (problem) {
        rejected.push(problem);
        return;
      }
      const key = fileKey(file);
      if (seen.has(key)) {
        rejected.push(`“${file.name}” is already added.`);
        return;
      }
      if (files.length + accepted.length >= max) {
        rejected.push(`“${file.name}” wasn't added: you can attach up to ${max} screenshots.`);
        return;
      }
      seen.add(key);
      accepted.push(file);
    });

    setRejections(rejected);
    if (accepted.length) onChange?.([...files, ...accepted]);
    onBlur?.();
  };

  const removeAt = (index) => {
    const next = files.filter((_, position) => position !== index);
    setRejections([]);
    focusChooseRef.current = true;
    onChange?.(next);
    onBlur?.();
  };

  const openPicker = () => {
    if (!disabled && !isFull) inputRef.current?.click();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    if (disabled) return;
    dragDepth.current += 1;
    setDragActive(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = disabled || isFull ? 'none' : 'copy';
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (disabled) return;
    if (isFull) {
      setRejections([`You already have ${max} screenshots. Remove one to add another.`]);
      return;
    }
    addFiles(event.dataTransfer?.files);
  };

  const defaultHint = `PNG, JPG or WebP, up to ${MAX_FILE_SIZE_LABEL} each. Add 1 to ${max} screenshots that show your work.`;

  return (
    <FormField label={label} htmlFor={inputId} error={error} hint={hint ?? defaultHint} required>
      <div
        role="group"
        aria-labelledby={`${inputId}-label`}
        aria-describedby={`${error ? `${inputId}-error` : `${inputId}-hint`} ${statusId}`}
        className="space-y-4"
      >
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150',
            dragActive
              ? 'border-brand-500 bg-brand-50'
              : error
                ? 'border-rose-300 bg-rose-50/40'
                : 'border-slate-300 bg-slate-50/60',
            disabled && 'opacity-60',
          )}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-slate-200"
            aria-hidden="true"
          >
            <UploadCloud className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-slate-900">
            {dragActive ? 'Drop to add your screenshots' : 'Drag and drop screenshots here'}
          </p>
          <p className="mt-1 text-xs text-slate-500">or</p>
          <Button
            ref={chooseRef}
            variant="outline"
            size="sm"
            leftIcon={ImagePlus}
            className="mt-2 h-10"
            onClick={openPicker}
            disabled={disabled || isFull}
          >
            Choose files
          </Button>
          <p id={statusId} className="tabular mt-3 text-xs text-slate-500" aria-live="polite">
            {isFull
              ? `${files.length} of ${max} added. Remove one to add another.`
              : `${files.length} of ${max} added`}
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={SCREENSHOT_ACCEPT}
            multiple
            hidden
            tabIndex={-1}
            disabled={disabled}
            onChange={(event) => {
              addFiles(event.target.files);
              // Reset so choosing the same file again still fires a change event.
              event.target.value = '';
            }}
          />
        </div>

        {rejections.length ? (
          <ul
            role="alert"
            className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
          >
            {rejections.map((message, index) => (
              <li key={`${index}-${message}`} className="flex items-start gap-1.5">
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{message}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {files.length ? (
          <ul
            aria-label="Selected screenshots"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5"
          >
            {files.map((file, index) => {
              const url = previews.get(fileKey(file));
              return (
                <li
                  key={fileKey(file)}
                  className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white"
                >
                  <div className="flex aspect-video items-center justify-center bg-slate-100">
                    {url ? (
                      <img
                        src={url}
                        alt={`Preview of ${file.name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-400" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 py-1 pl-2.5 pr-1">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-slate-500 hover:text-rose-600"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removeAt(index)}
                      disabled={disabled}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </FormField>
  );
}

export default ScreenshotUploader;
