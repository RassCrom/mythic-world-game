import { useLayoutEffect, useRef } from 'react';
import { FLIGHT_MS } from './constants.js';
import { sfx } from '../../sound.js';

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function triggerStableLandingEffect(element, options = {}) {
  if (!element) return;
  if (reducedMotion()) return;

  // Add landing impact slam animation
  element.classList.remove('card-landing-impact');
  void element.offsetWidth;
  element.classList.add('card-landing-impact');

  // Trigger summon sound
  if (!options.silent) {
    sfx.summonLanding();
  }

  // Create summoning shockwave ring burst
  const existingBurst = element.querySelector('.stable-summon-burst');
  if (existingBurst) existingBurst.remove();

  const burst = document.createElement('div');
  burst.className = 'stable-summon-burst';
  const cardColor = element.style.getPropertyValue('--card-color') || '#f59e42';
  burst.style.setProperty('--burst-color', cardColor);
  burst.innerHTML = `
    <div class="summon-ring ring-outer"></div>
    <div class="summon-ring ring-inner"></div>
    <div class="summon-spark s-1"></div>
    <div class="summon-spark s-2"></div>
    <div class="summon-spark s-3"></div>
    <div class="summon-spark s-4"></div>
  `;
  element.appendChild(burst);

  // Trigger impact recoil on parent player panel if present
  const panel = element.closest('.player-panel');
  if (panel) {
    panel.classList.remove('stable-impact-bump');
    void panel.offsetWidth;
    panel.classList.add('stable-impact-bump');
    setTimeout(() => {
      panel.classList.remove('stable-impact-bump');
    }, 450);
  }

  setTimeout(() => {
    element.classList.remove('card-landing-impact');
    burst.remove();
  }, 750);
}

// FLIP animation pass: cards glide from their previous zone to their next one with arc physics.
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
        delete element.dataset.flyingToStable;
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
      const toStable = Boolean(element.closest('.stable'));
      const tilt = Math.max(-14, Math.min(14, (dx / 24)));

      element.dataset.flying = '1';
      if (toStable) element.dataset.flyingToStable = '1';
      element.style.transition = 'none';
      element.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${scale * (toStable ? 1.08 : 1)}) rotate(${toStable ? tilt : 0}deg)`;
      element.style.zIndex = toStable ? '90' : '60';
      void element.offsetWidth;
      element.style.transition = `transform ${FLIGHT_MS}ms cubic-bezier(0.18, 0.9, 0.28, 1), filter ${FLIGHT_MS}ms ease-out`;
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
      }, FLIGHT_MS + 40);
    }

    prevRects.current = nextRects;
  }, [view]);
}

