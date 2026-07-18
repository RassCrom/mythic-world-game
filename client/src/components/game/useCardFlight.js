import { useLayoutEffect, useRef } from 'react';
import { FLIGHT_MS } from './constants.js';

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// FLIP animation pass: cards glide from their previous zone to their next one.
export function useCardFlight(view) {
  const prevRects = useRef(new Map());

  useLayoutEffect(() => {
    const elements = [...document.querySelectorAll('[data-iid]')]
      .filter((element) => !element.closest('.modal'));

    // Finish interrupted animations before measuring resting positions.
    for (const element of elements) {
      if (element.dataset.flying) {
        element.style.transition = '';
        element.style.transform = '';
        element.style.zIndex = '';
        delete element.dataset.flying;
      }
    }

    const deckRect = document.querySelector('[data-zone="deck"]')?.getBoundingClientRect() || null;
    const nextRects = new Map();
    const skipAnimation = reducedMotion();
    const firstPass = prevRects.current.size === 0;

    for (const element of elements) {
      const iid = element.dataset.iid;
      const rect = element.getBoundingClientRect();
      if (!rect.width) continue;
      nextRects.set(iid, rect);
      if (skipAnimation) continue;

      let from = prevRects.current.get(iid);
      if (!from && !firstPass && deckRect && element.closest('.hand, .stable')) from = deckRect;
      if (!from) continue;

      const dx = from.left - rect.left;
      const dy = from.top - rect.top;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) continue;

      const scale = from.width && rect.width ? from.width / rect.width : 1;
      element.dataset.flying = '1';
      element.style.transition = 'none';
      element.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      element.style.zIndex = '60';
      void element.offsetWidth;
      element.style.transition = `transform ${FLIGHT_MS}ms cubic-bezier(.22,.8,.28,1)`;
      element.style.transform = '';
      setTimeout(() => {
        if (element.dataset.flying) {
          element.style.transition = '';
          element.style.zIndex = '';
          delete element.dataset.flying;
        }
      }, FLIGHT_MS + 60);
    }

    prevRects.current = nextRects;
  }, [view]);
}
