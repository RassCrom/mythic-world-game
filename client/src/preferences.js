export const BATTLEFIELDS = Object.freeze([
  { id: 'ancient-grove', name: 'Ancient Grove', image: '/battlefield-arena.webp' },
  { id: 'ember-peaks', name: 'Ember Peaks', image: '/battlefield-ember-peaks.webp' },
  { id: 'moonlit-ruins', name: 'Moonlit Ruins', image: '/battlefield-moonlit-ruins.webp' },
]);

const BATTLEFIELD_KEY = 'ud_battlefield';
const REDUCED_EFFECTS_KEY = 'ud_reduced_effects';

function getBattlefield(id) {
  return BATTLEFIELDS.find((battlefield) => battlefield.id === id) || BATTLEFIELDS[0];
}

export function loadPreferences() {
  return {
    battlefield: getBattlefield(localStorage.getItem(BATTLEFIELD_KEY)).id,
    reducedEffects: localStorage.getItem(REDUCED_EFFECTS_KEY) === '1',
  };
}

export function applyPreferences(preferences) {
  const root = document.documentElement;
  const battlefield = getBattlefield(preferences.battlefield);
  root.style.setProperty('--battlefield-image', `url("${battlefield.image}")`);
  root.dataset.battlefield = battlefield.id;
  root.dataset.effects = preferences.reducedEffects ? 'reduced' : 'full';
}

export function savePreferences(preferences) {
  const next = {
    battlefield: getBattlefield(preferences.battlefield).id,
    reducedEffects: Boolean(preferences.reducedEffects),
  };
  localStorage.setItem(BATTLEFIELD_KEY, next.battlefield);
  localStorage.setItem(REDUCED_EFFECTS_KEY, next.reducedEffects ? '1' : '0');
  applyPreferences(next);
  return next;
}

export function initializePreferences() {
  applyPreferences(loadPreferences());
}
