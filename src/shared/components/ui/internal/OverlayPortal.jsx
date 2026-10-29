import { createPortal } from 'react-dom';

/** Renders overlays at the end of <body> so they are never clipped by overflow containers. */
export function OverlayPortal({ children }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

export default OverlayPortal;
