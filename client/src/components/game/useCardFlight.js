import { useLayoutEffect, useRef } from 'react';
import { FLIGHT_MS } from './constants.js';
import { sfx } from '../../sound.js';

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function getCardZone(element) {
  const panel = element.closest('.player-panel');
  if (panel) {
    return panel.classList.contains('is-me') ? 'stable:me' : `stable:${panel.querySelector('.player-name')?.textContent || 'opp'}`;
  }
  if (element.closest('.hand')) return 'hand';
  if (element.closest('.chain')) return 'chain';
  if (element.closest('[data-zone="deck"]')) return 'deck';
  if (element.closest('.pile-nest')) return 'nest';
  if (element.closest('.pile')) return 'pile';
  return 'other';
}

export function triggerStableLandingEffect(element, options = {}) {
  if (!element || reducedMotion()) return;

  element.classList.remove('card-landing-impact');
  void element.offsetWidth;
  element.classList.add('card-landing-impact');

  if (!options.silent) {
    sfx.summonLanding();
  }

  setTimeout(() => {
    element.classList.remove('card-landing-impact');
  }, 400);
}

// FLIP animation pass: ONLY cards changing zones glide to their destination.
export function useCardFlight(view) {
  const prevRects = useRef(new Map());
  const prevZones = useRef(new Map());

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
        delete element.dataset.flyingToStable;
      }
    }

    const deckRect = document.querySelector('[data-zone="deck"]')?.getBoundingClientRect() || null;
    const nextRects = new Map();
    const nextZones = new Map();
    const skipAnimation = reducedMotion();
    const firstPass = prevRects.current.size === 0;

    for (const element of elements) {
      const iid = element.dataset.iid;
      const rect = element.getBoundingClientRect();
      if (!rect.width) continue;

      const currentZone = getCardZone(element);
      nextRects.set(iid, rect);
      nextZones.set(iid, currentZone);

      if (skipAnimation) continue;

      let from = prevRects.current.get(iid);
      const prevZone = prevZones.current.get(iid);

      // If a card was already sitting in this same zone (e.g. existing cards in stable),
      // DO NOT animate or bump it when other cards enter/leave.
      if (prevZone && prevZone === currentZone) {
        continue;
      }

      if (!from && !firstPass && deckRect && element.closest('.hand, .stable')) {
        from = deckRect;
      }
      if (!from) continue;

      const dx = from.left - rect.left;
      const dy = from.top - rect.top;
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) continue;

      const isEnteringStable = currentZone.startsWith('stable:');
      const scale = from.width && rect.width ? from.width / rect.width : 1;

      element.dataset.flying = '1';
      if (isEnteringStable) element.dataset.flyingToStable = '1';

      element.style.transition = 'none';
      element.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`;
      element.style.zIndex = isEnteringStable ? '80' : '60';
      void element.offsetWidth;
      element.style.transition = `transform ${FLIGHT_MS}ms cubic-bezier(0.2, 0.85, 0.25, 1)`;
      element.style.transform = '';

      setTimeout(() => {
        if (element.dataset.flying) {
          element.style.transition = '';
          element.style.zIndex = '';
          delete element.dataset.flying;
          const wasToStable = element.dataset.flyingToStable;
          delete element.dataset.flyingToStable;
          if (wasToStable) {
            triggerStableLandingEffect(element);
          }
        }
      }, FLIGHT_MS + 30);
    }

    prevRects.current = nextRects;
    prevZones.current = nextZones;
  }, [view]);
}

