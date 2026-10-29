import { useCallback, useState, useSyncExternalStore } from 'react';

/** Tailwind `lg`: the board layout is offered from here; smaller screens always get the list. */
export const BOARD_MEDIA_QUERY = '(min-width: 1024px)';

export const TASK_VIEWS = Object.freeze({ BOARD: 'board', LIST: 'list' });

const VIEW_STORAGE_KEY = 'ip.tasks.view';

function readView() {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === TASK_VIEWS.LIST ? TASK_VIEWS.LIST : TASK_VIEWS.BOARD;
  } catch {
    return TASK_VIEWS.BOARD;
  }
}

function writeView(view) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // storage unavailable (private mode): the choice lasts for this visit only
  }
}

function canMatchMedia() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/** Live `window.matchMedia(query).matches` (false where matchMedia is unavailable, e.g. tests). */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (!canMatchMedia()) return () => {};
      const media = window.matchMedia(query);
      if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
      }
      media.addListener?.(onChange);
      return () => media.removeListener?.(onChange);
    },
    [query],
  );
  const getSnapshot = () => (canMatchMedia() ? window.matchMedia(query).matches : false);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Board/list preference of the task board (remembered per browser). Returns
 * { view, setView, canShowBoard } — `view` is always 'list' below the lg breakpoint.
 */
export function useTaskBoardView() {
  const canShowBoard = useMediaQuery(BOARD_MEDIA_QUERY);
  const [preferred, setPreferred] = useState(() =>
    typeof window === 'undefined' ? TASK_VIEWS.BOARD : readView(),
  );

  const setView = useCallback((next) => {
    const value = next === TASK_VIEWS.LIST ? TASK_VIEWS.LIST : TASK_VIEWS.BOARD;
    setPreferred(value);
    writeView(value);
  }, []);

  return {
    view: canShowBoard ? preferred : TASK_VIEWS.LIST,
    preferredView: preferred,
    setView,
    canShowBoard,
  };
}

export default useTaskBoardView;
