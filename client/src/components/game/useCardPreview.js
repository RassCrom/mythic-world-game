import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFS } from '../../../../shared/cards.js';

const TOUCH_PREVIEW_MS = 4_500;

// The card the pointer is resting on, or the one a touch opened. Only the
// anchor rectangle travels with the preview; the popup measures itself and
// picks a side, so a tap on a phone reads beside the card it came from.
export function useCardPreview() {
  const [preview, setPreview] = useState(null);
  const dismissTimer = useRef(null);

  useEffect(() => () => clearTimeout(dismissTimer.current), []);

  const show = useCallback((defId, event) => {
    if (!defId || !DEFS[defId]) return;
    clearTimeout(dismissTimer.current);
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    const cursorX = Number.isFinite(event?.clientX) && event.clientX > 0
      ? event.clientX : (rect ? rect.right : window.innerWidth / 2);
    const cursorY = Number.isFinite(event?.clientY) && event.clientY > 0
      ? event.clientY : (rect ? rect.top : window.innerHeight / 2);
    setPreview({
      defId,
      x: cursorX,
      y: cursorY,
      anchor: rect
        ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        : null,
    });
    // A tap has no pointer-leave to close it, so it times out instead.
    if (event?.type === 'click') {
      dismissTimer.current = setTimeout(() => setPreview(null), TOUCH_PREVIEW_MS);
    }
  }, []);

  const hide = useCallback(() => {
    clearTimeout(dismissTimer.current);
    setPreview(null);
  }, []);

  return { preview, show, hide };
}
