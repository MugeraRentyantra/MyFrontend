import { useEffect, useRef, useState } from 'react';
import { Button, Modal } from '@/shared/components/ui';
import { ChevronLeft, ChevronRight, ImageIcon, ZoomIn, ZoomOut } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';

const ZOOM_LEVELS = [1, 1.5, 2, 3];

/**
 * Full-size screenshot viewer (GP9): Modal with zoom in/out and previous/next.
 * Keyboard: ← / → switch screenshots, + / − zoom, 0 resets; Esc closes (Modal).
 * Controlled: `index` + `onIndexChange(nextIndex)`; `open` + `onClose`.
 */
export function ScreenshotLightbox({
  open,
  onClose,
  screenshots = [],
  index = 0,
  onIndexChange,
  title = 'Screenshots',
}) {
  const [zoomStep, setZoomStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const count = screenshots.length;
  const safeIndex = count ? Math.min(Math.max(0, index), count - 1) : 0;
  const current = count ? screenshots[safeIndex] : null;
  const zoom = ZOOM_LEVELS[zoomStep];
  const isOpen = Boolean(open && current);

  useEffect(() => {
    setZoomStep(0);
    setFailed(false);
  }, [safeIndex, isOpen]);

  const go = (delta) => {
    if (count < 2 || !onIndexChange) return;
    onIndexChange((safeIndex + delta + count) % count);
  };
  const zoomIn = () => setZoomStep((step) => Math.min(ZOOM_LEVELS.length - 1, step + 1));
  const zoomOut = () => setZoomStep((step) => Math.max(0, step - 1));

  // The document listener always calls the latest `go` (it depends on the current index).
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          goRef.current(1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          goRef.current(-1);
          break;
        case '+':
        case '=':
          event.preventDefault();
          setZoomStep((step) => Math.min(ZOOM_LEVELS.length - 1, step + 1));
          break;
        case '-':
        case '_':
          event.preventDefault();
          setZoomStep((step) => Math.max(0, step - 1));
          break;
        case '0':
          event.preventDefault();
          setZoomStep(0);
          break;
        default:
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const name = current?.name || `Screenshot ${safeIndex + 1}`;
  const fitted = zoom === 1;

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1" role="group" aria-label="Zoom">
        <Button
          variant="outline"
          size="icon"
          aria-label="Zoom out"
          onClick={zoomOut}
          disabled={zoomStep === 0}
        >
          <ZoomOut className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="tabular w-14 text-center text-sm font-medium text-slate-600" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Zoom in"
          onClick={zoomIn}
          disabled={zoomStep === ZOOM_LEVELS.length - 1}
        >
          <ZoomIn className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      {count > 1 ? (
        <div className="flex items-center gap-1" role="group" aria-label="Screenshots">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous screenshot"
            onClick={() => go(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="tabular w-14 text-center text-sm font-medium text-slate-600">
            {safeIndex + 1} / {count}
          </span>
          <Button variant="outline" size="icon" aria-label="Next screenshot" onClick={() => go(1)}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={title}
      description={current ? `${safeIndex + 1} of ${count} · ${name}` : undefined}
      size="2xl"
      footer={footer}
    >
      {current ? (
        <div
          className={cn(
            'h-[55vh] min-h-[14rem] overflow-auto rounded-lg bg-slate-900',
            fitted && 'flex items-center justify-center',
          )}
        >
          {failed || !current.url ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-300">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
              This screenshot could not be loaded.
            </div>
          ) : (
            <img
              src={current.url}
              alt={name}
              draggable={false}
              onError={() => setFailed(true)}
              className={cn(
                'select-none',
                fitted ? 'max-h-full max-w-full object-contain' : 'block max-w-none',
              )}
              style={fitted ? undefined : { width: `${zoom * 100}%` }}
            />
          )}
        </div>
      ) : null}
      <p className="mt-2 hidden text-xs text-slate-500 sm:block">
        Tip: use ← and → to switch screenshots and + or − to zoom.
      </p>
    </Modal>
  );
}

export default ScreenshotLightbox;
