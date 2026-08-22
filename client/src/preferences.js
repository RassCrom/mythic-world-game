export const BATTLEFIELDS = Object.freeze([
  { id: 'ancient-grove', name: 'Ancient Grove', image: '/battlefield-arena.webp', ambience: 'fireflies' },
  { id: 'ember-peaks', name: 'Ember Peaks', image: '/battlefield-ember-peaks.webp', ambience: 'ash' },
  { id: 'moonlit-ruins', name: 'Moonlit Ruins', image: '/battlefield-moonlit-ruins.webp', ambience: 'snow' },
  { id: 'celestial-observatory', name: 'Celestial Observatory', image: '/battlefield-celestial-observatory.webp', ambience: 'aurora' },
  { id: 'sunken-sanctum', name: 'Sunken Sanctum', image: '/battlefield-sunken-sanctum.webp', ambience: 'underwater' },
  { id: 'clockwork-garden', name: 'Clockwork Garden', image: '/battlefield-clockwork-garden.webp', ambience: 'rain' },
]);

export const AMBIENCES = Object.freeze([
  { id: 'auto', name: 'Auto (match battlefield)' },
  { id: 'rain', name: 'Rain' },
  { id: 'snow', name: 'Drifting snow' },
  { id: 'fireflies', name: 'Fireflies' },
  { id: 'ash', name: 'Falling ash' },
  { id: 'underwater', name: 'Underwater particles' },
  { id: 'aurora', name: 'Auroras' },
  { id: 'none', name: 'Off' },
]);

const BATTLEFIELD_KEY = 'ud_battlefield';
const AMBIENCE_KEY = 'ud_ambience';
const REDUCED_EFFECTS_KEY = 'ud_reduced_effects';

function getBattlefield(id) {
  return BATTLEFIELDS.find((battlefield) => battlefield.id === id) || BATTLEFIELDS[0];
}

function getAmbience(id) {
  return AMBIENCES.find((ambience) => ambience.id === id) || AMBIENCES[0];
}

export function loadPreferences() {
  return {
    battlefield: getBattlefield(localStorage.getItem(BATTLEFIELD_KEY)).id,
    ambience: getAmbience(localStorage.getItem(AMBIENCE_KEY)).id,
    reducedEffects: localStorage.getItem(REDUCED_EFFECTS_KEY) === '1',
  };
}

export function applyPreferences(preferences) {
  const root = document.documentElement;
  const battlefield = getBattlefield(preferences.battlefield);
  const ambience = getAmbience(preferences.ambience);
  root.style.setProperty('--battlefield-image', `url("${battlefield.image}")`);
  root.dataset.battlefield = battlefield.id;
  root.dataset.ambience = ambience.id === 'auto' ? battlefield.ambience : ambience.id;
  root.dataset.effects = preferences.reducedEffects ? 'reduced' : 'full';
}

export function savePreferences(preferences) {
  const next = {
    battlefield: getBattlefield(preferences.battlefield).id,
    ambience: getAmbience(preferences.ambience).id,
    reducedEffects: Boolean(preferences.reducedEffects),
  };
  localStorage.setItem(BATTLEFIELD_KEY, next.battlefield);
  localStorage.setItem(AMBIENCE_KEY, next.ambience);
  localStorage.setItem(REDUCED_EFFECTS_KEY, next.reducedEffects ? '1' : '0');
  applyPreferences(next);
  return next;
}

export function initializePreferences() {
  applyPreferences(loadPreferences());
}
