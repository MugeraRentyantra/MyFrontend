import { useCallback, useEffect, useState } from 'react';
import { Button, Card, CardBody, CardHeader, EmptyState, Modal } from '@/shared/components/ui';
import { ChevronLeft, ChevronRight, ImageIcon, Maximize2, ZoomIn, ZoomOut } from '@/shared/icons';
import { cn } from '@/shared/utils/cn';
import { formatBytes, pluralize } from '@/shared/utils/helpers';

const ZOOM_LEVELS = [1, 1.5, 2, 3];
const VIEWER_PADDING = 16;

function screenshotName(shot, index) {
  return shot?.name || `Screenshot ${index + 1}`;
}

function ImageUnavailable({ className }) {
  return (
    <span
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400',
        className,
      )}
    >
      <ImageIcon className="h-6 w-6" aria-hidden="true" />
      <span className="text-xs">Preview unavailable</span>
    </span>
  );
}

function Thumbnail({ shot, index, total, onOpen }) {
  const [failed, setFailed] = useState(false);
  const name = screenshotName(shot, index);

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onOpen(index)}
        aria-label={`Enlarge ${name} (${index + 1} of ${total})`}
        className="group relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <span className="block aspect-video">
          {failed || !shot?.url ? (
            <ImageUnavailable />
          ) : (
            <img
              src={shot.url}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover object-top transition-transform duration-200 group-hover:scale-[1.02]"
            />
          )}
        </span>
        <span
          className="absolute right-2 top-2 rounded-md bg-slate-900/70 p-1 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </span>
      </button>
      <p className="mt-1.5 truncate text-xs text-slate-500" title={name}>
        {name}
        {shot?.sizeBytes ? ` · ${formatBytes(shot.sizeBytes)}` : ''}
      </p>
    </li>
  );
}

/** Measures an element (and keeps measuring as it resizes). */
function useElementSize(element) {
  const [size, setSize] = useState(null);
  useEffect(() => {
    if (!element) return undefined;
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return size;
}

/**
 * Lightbox (KD10): fit-to-screen first, zoom in/out (buttons or + / - / 0), previous/next with the
 * buttons or the left/right arrow keys. Bigger-than-viewport images scroll to pan.
 */
function ScreenshotLightbox({ screenshots, index, onIndexChange, onClose }) {
  const total = screenshots.length;
  const shot = screenshots[index];
  const name = screenshotName(shot, index);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [natural, setNatural] = useState(null);
  const [failed, setFailed] = useState(false);
  const [viewer, setViewer] = useState(null);
  const box = useElementSize(viewer);
  const zoom = ZOOM_LEVELS[zoomIndex];
  const hasPrevious = index > 0;
  const hasNext = index < total - 1;

  const goTo = useCallback(
    (next) => {
      if (next < 0 || next >= total || next === index) return;
      setZoomIndex(0);
      setNatural(null);
      setFailed(false);
      onIndexChange(next);
    },
    [index, total, onIndexChange],
  );

  const zoomIn = useCallback(() => setZoomIndex((z) => Math.min(z + 1, ZOOM_LEVELS.length - 1)), []);
  const zoomOut = useCallback(() => setZoomIndex((z) => Math.max(z - 1, 0)), []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goTo(index - 1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          goTo(index + 1);
          break;
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          setZoomIndex(0);
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goTo, index, zoomIn, zoomOut]);

  let imageStyle;
  if (natural && box) {
    const fit = Math.min(
      (box.width - VIEWER_PADDING) / natural.width,
      (box.height - VIEWER_PADDING) / natural.height,
      1,
    );
    const scale = Math.max(fit, 0.05) * zoom;
    imageStyle = {
      width: Math.max(1, Math.round(natural.width * scale)),
      height: Math.max(1, Math.round(natural.height * scale)),
      maxWidth: 'none',
      maxHeight: 'none',
    };
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="full"
      title={`Screenshot ${index + 1} of ${total}`}
      description={name}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous screenshot"
              disabled={!hasPrevious}
              onClick={() => goTo(index - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="tabular min-w-[3.5rem] text-center text-sm text-slate-600" aria-hidden="true">
              {index + 1} / {total}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next screenshot"
              disabled={!hasNext}
              onClick={() => goTo(index + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom out"
              disabled={zoomIndex === 0 || failed}
              onClick={zoomOut}
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="tabular min-w-[3.5rem] text-center text-sm text-slate-600" aria-live="polite">
              <span className="sr-only">Zoom </span>
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom in"
              disabled={zoomIndex === ZOOM_LEVELS.length - 1 || failed}
              onClick={zoomIn}
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-10"
              disabled={zoomIndex === 0}
              onClick={() => setZoomIndex(0)}
            >
              Fit
            </Button>
          </div>
        </div>

        <div
          ref={setViewer}
          tabIndex={0}
          aria-label={`${name}. Scroll to pan when zoomed.`}
          role="group"
          className="scrollbar-thin h-[60vh] overflow-auto rounded-lg bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:h-auto sm:min-h-[16rem] sm:flex-1"
        >
          <div className="flex min-h-full w-max min-w-full p-2">
            {failed || !shot?.url ? (
              <ImageUnavailable className="m-auto min-h-[12rem] text-slate-300" />
            ) : (
              <img
                key={`${index}-${shot.url}`}
                src={shot.url}
                alt={name}
                decoding="async"
                onLoad={(event) =>
                  setNatural({
                    width: event.currentTarget.naturalWidth || 1,
                    height: event.currentTarget.naturalHeight || 1,
                  })
                }
                onError={() => setFailed(true)}
                style={imageStyle}
                className={cn(
                  'm-auto block select-none rounded bg-white',
                  !imageStyle && 'max-h-full max-w-full object-contain',
                )}
                draggable={false}
              />
            )}
          </div>
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">
          Tip: use ← and → to switch screenshots, + and − to zoom, 0 to fit.
        </p>
      </div>
    </Modal>
  );
}

/** KD10: grid of the submission's screenshots; selecting one opens the lightbox. */
export function ScreenshotGallery({ screenshots }) {
  const [openIndex, setOpenIndex] = useState(null);
  const list = Array.isArray(screenshots) ? screenshots.filter(Boolean) : [];

  return (
    <Card as="section" padding="none" aria-label="Screenshots">
      <CardHeader
        title="Screenshots"
        description={
          list.length ? `${pluralize(list.length, 'screenshot')} · select one to enlarge` : undefined
        }
      />
      <CardBody>
        {list.length === 0 ? (
          <EmptyState
            compact
            variant="muted"
            icon={ImageIcon}
            title="No screenshots attached"
            description="Use the description and the GitHub link to review this attempt."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {list.map((shot, index) => (
              <Thumbnail
                key={shot.storageKey ?? `${shot.url}-${index}`}
                shot={shot}
                index={index}
                total={list.length}
                onOpen={setOpenIndex}
              />
            ))}
          </ul>
        )}
      </CardBody>
      {openIndex !== null && list[openIndex] ? (
        <ScreenshotLightbox
          screenshots={list}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </Card>
  );
}

export default ScreenshotGallery;
