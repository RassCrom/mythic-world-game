// The Hollow is the animated field: a looping video with the WebP as poster
// and still fallback. Everything else is a static image.
export const HOLLOW_VIDEO = Object.freeze({
  hd: { av1: '/battlefield-hollow-1440p.av1.mp4', h264: '/battlefield-hollow-1440p.h264.mp4' },
  sd: { av1: '/battlefield-hollow-720p.av1.mp4', h264: '/battlefield-hollow-720p.h264.mp4' },
});
export const HOLLOW_POSTER = Object.freeze({ large: '/battlefield-hollow.webp', small: '/battlefield-hollow-sm.webp' });

// Every battlefield is a 10-second loop with the WebP as poster and still
// fallback. `video` carries two tiers, each as AV1 with an H.264 fallback.
function field(id, name, file, ambience) {
  return {
    id,
    name,
    image: `/battlefield-${file}.webp`,
    imageSmall: `/battlefield-${file}-sm.webp`,
    ambience,
    video: Object.freeze({
      hd: { av1: `/battlefield-${file}-1080p.av1.mp4`, h264: `/battlefield-${file}-1080p.h264.mp4` },
      sd: { av1: `/battlefield-${file}-720p.av1.mp4`, h264: `/battlefield-${file}-720p.h264.mp4` },
    }),
  };
}

export const BATTLEFIELDS = Object.freeze([
  { id: 'the-hollow', name: 'The Hollow', image: '/battlefield-hollow.webp', imageSmall: '/battlefield-hollow-sm.webp', ambience: 'fireflies', video: HOLLOW_VIDEO },
  field('ancient-grove', 'Ancient Grove', 'arena', 'fireflies'),
  field('ember-peaks', 'Ember Peaks', 'ember-peaks', 'ash'),
  field('moonlit-ruins', 'Moonlit Ruins', 'moonlit-ruins', 'snow'),
  field('celestial-observatory', 'Celestial Observatory', 'celestial-observatory', 'aurora'),
  field('sunken-sanctum', 'Sunken Sanctum', 'sunken-sanctum', 'underwater'),
  field('clockwork-garden', 'Clockwork Garden', 'clockwork-garden', 'rain'),
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
