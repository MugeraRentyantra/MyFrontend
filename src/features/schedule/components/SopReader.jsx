import { useCallback, useEffect, useRef } from 'react';
import { Prose, toast } from '@/shared/components/ui';
import { BookOpen, Printer } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { ProtectedContentNotice } from './ProtectedContentNotice';
import { WatermarkOverlay } from './WatermarkOverlay';

const TOAST_COOLDOWN_MS = 2500;
const COPY_MESSAGE = 'Copying is disabled for protected content.';
const PRINT_MESSAGE = 'Printing is disabled for protected content.';
const SAVE_MESSAGE = 'Saving is disabled for protected content.';

function hasContent(html) {
  return typeof html === 'string' && html.replace(/<[^>]*>/g, '').trim().length > 0;
}

/**
 * Protected, view-only SOP (GP4). Deterrents only — they can't stop a determined user, and the
 * notice says so: no selection (`.sop-protected`), context menu / copy / cut / drag blocked with a
 * toast, Ctrl/Cmd+P and Ctrl/Cmd+S intercepted, print CSS swaps the content for a message, and a
 * tiled watermark with the viewer's name and ID. No download or print buttons.
 * The HTML is sanitised on the server and again by <Prose>.
 */
export function SopReader({ sop, className }) {
  const lastToastAt = useRef(0);

  const notify = useCallback((message) => {
    const now = Date.now();
    if (now - lastToastAt.current < TOAST_COOLDOWN_MS) return;
    lastToastAt.current = now;
    toast.info(message);
  }, []);

  const block = useCallback(
    (event) => {
      event.preventDefault();
      notify(COPY_MESSAGE);
    },
    [notify],
  );

  // Keyboard print/save shortcuts are intercepted while the reader is open.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = String(event.key).toLowerCase();
      if (key === 'p') {
        event.preventDefault();
        notify(PRINT_MESSAGE);
      } else if (key === 's') {
        event.preventDefault();
        notify(SAVE_MESSAGE);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notify]);

  if (!sop) return null;
  const showContent = hasContent(sop.contentHtml);

  return (
    <>
      <div className="print-blocked-message rounded-xl border border-slate-300 p-6 text-center">
        <Printer className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" />
        <p className="mt-2 text-base font-semibold text-slate-900">{PRINT_MESSAGE}</p>
      </div>

      <div
        className={cn('sop-protected space-y-4', className)}
        onContextMenu={block}
        onCopy={block}
        onCut={block}
        onDragStart={block}
      >
        <ProtectedContentNotice />
        <article
          aria-label={`Day ${sop.dayNumber} SOP`}
          className="relative isolate overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
        >
          {showContent ? (
            <Prose html={sop.contentHtml} className="relative px-5 py-6 sm:px-8 sm:py-8" />
          ) : (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                aria-hidden="true"
              >
                <BookOpen className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-900">No SOP for this day</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Follow the activity in your schedule. Ask your trainer if anything is unclear.
              </p>
            </div>
          )}
          <WatermarkOverlay text={sop.watermarkText} />
        </article>
      </div>
    </>
  );
}

export default SopReader;
