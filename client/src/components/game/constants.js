export const PHASE_LABEL = {
  start: 'Beginning',
  draw: 'Draw',
  action: 'Action',
  end: 'End',
};

export const FLIGHT_MS = 420;

// [short badge, tooltip]. Keyed by the engine's mod names.
export const MOD_BADGES = {
  uncounterable: ['Sigil', 'Their plays cannot be stopped by Instants'],
  dragonsSafe: ['Warded', 'Their creatures cannot be destroyed'],
  noUpgrades: ['No Upgrades', 'Cannot play Upgrade cards'],
  handVisible: ['Scryed', 'Hand visible to everyone'],
  toads: ['Toads!', 'Their creatures are Toads and do not count'],
  noInstants: ['Silenced', 'Cannot play Instant cards'],
  barbedWire: ['Caged', 'Discards when creatures enter or leave'],
  maxFive: ['Cramped', 'Max 5 creatures'],
  suppress: ['Fogged', 'Magical creatures lose abilities'],
  queensDecree: ['Decree', 'Basic creatures may only enter this stable'],
  magicWard: ['Shielded', 'Loyal creatures cannot be destroyed by Magic'],
  noStealFrom: ['Unstealable', 'Creatures here cannot be stolen'],
  allWild: ['Wild Heart', 'Every creature here is wild'],
  noDrawPhase: ['Asleep', 'Skips the Draw phase'],
  noMagic: ['Muddy', 'Cannot play Magic cards'],
  luckyShoe: ['Lucky', 'May discard to save a creature from Magic'],
};

// Negative (downgrade-ish) badges get the warning tint.
export const BAD_MODS = new Set([
  'toads', 'noInstants', 'barbedWire', 'suppress', 'noUpgrades', 'maxFive',
  'handVisible', 'allWild', 'noDrawPhase', 'noMagic',
]);
