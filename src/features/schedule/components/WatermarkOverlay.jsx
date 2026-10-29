import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';
import { clamp } from '@/shared/utils/helpers';

const ANGLE_DEG = -24;
const ROW_HEIGHT = 96; // px between watermark rows (line + gap)
const COLUMN_GAP = 72; // px between repeats on a row
const CHAR_WIDTH = 8; // rough width of one character at text-sm
const MAX_ROWS = 300;
const MAX_COLUMNS = 40;
const DEFAULT_SIZE = { width: 960, height: 1400 };

/**
 * Size of a layer that, rotated by ANGLE_DEG around its centre, still covers a width x height box:
 * the bounding box of the box rotated the other way.
 */
function coveringSize({ width, height }) {
  const radians = (Math.abs(ANGLE_DEG) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    width: Math.ceil(width * cos + height * sin),
    height: Math.ceil(width * sin + height * cos),
  };
}

/**
 * Tiled, rotated watermark (the viewer's name and ID) laid over protected content (GP4).
 * Purely visual: pointer-events-none, select-none and hidden from assistive technology.
 * It measures its container so long SOPs stay covered from top to bottom.
 */
export function WatermarkOverlay({ text, className }) {
  const ref = useRef(null);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const hasText = Boolean(text);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const measure = (width, height) => {
      setSize((previous) =>
        Math.abs(previous.width - width) < 32 && Math.abs(previous.height - height) < 32
          ? previous
          : { width, height },
      );
    };
    measure(element.clientWidth || DEFAULT_SIZE.width, element.clientHeight || DEFAULT_SIZE.height);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) measure(box.width, box.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasText]);

  if (!hasText) return null;

  const layer = coveringSize(size);
  const tileWidth = Math.max(160, String(text).length * CHAR_WIDTH) + COLUMN_GAP;
  const rows = clamp(Math.ceil(layer.height / ROW_HEIGHT) + 1, 4, MAX_ROWS);
  const columns = clamp(Math.ceil(layer.width / tileWidth) + 2, 2, MAX_COLUMNS);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-watermark=""
      className={cn(
        'pointer-events-none absolute inset-0 z-10 select-none overflow-hidden',
        className,
      )}
    >
      <div
        className="absolute left-1/2 top-1/2 flex flex-col justify-around overflow-hidden whitespace-nowrap text-sm font-semibold tracking-wide text-slate-900/[0.06]"
        style={{
          width: layer.width,
          height: layer.height,
          transform: `translate(-50%, -50%) rotate(${ANGLE_DEG}deg)`,
        }}
      >
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="flex"
            style={{
              gap: COLUMN_GAP,
              marginLeft: row % 2 === 0 ? -tileWidth / 2 : 0,
            }}
          >
            {Array.from({ length: columns }, (_, column) => (
              <span key={column}>{text}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WatermarkOverlay;
