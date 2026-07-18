// Unstable Dragons — card database.
// Original card set: all names, rules text, and flavor written for this game.
// Mechanics follow the classic "collect dragons / stop plays" party-game formula.
//
// Card types:
//   baby      — start-of-game card from the shared Nest; never in deck/hand/discard
//   basic     — no ability, counts toward the win condition
//   magical   — dragon with a unique ability
//   upgrade   — attaches to a stable (usually yours); one per name per stable
//   downgrade — attaches to a stable (usually an opponent's); one per name per stable
//   magic     — one-shot effect, then discarded
//   instant   — playable in response to another card being played (the "Roar" window)
//
// Effect steps are interpreted by the server-side engine (worker/src/engine.js).
// The client only uses name/type/text/color for rendering.

export const BABY_ID = 'baby_dragon';
export const BABY_COUNT = 13;

const D = {};

function def(card) {
  D[card.id] = card;
}

/* ------------------------------------------------------------------ */
/* Baby Dragons (Nest)                                                 */
/* ------------------------------------------------------------------ */

def({
  id: 'baby_dragon',
  name: 'Baby Dragon',
  type: 'baby',
  qty: BABY_COUNT,
  color: '#e8905a',
  text: 'Fresh from the egg. If this card would leave your stable, return it to the Nest instead.',
});

/* ------------------------------------------------------------------ */
/* Basic Dragons                                                       */
/* ------------------------------------------------------------------ */

const BASICS = [
  ['basic_crimson', 'Crimson Drake', '#c0392b', 'All fire, no finesse.'],
  ['basic_azure', 'Azure Drake', '#2e86c1', 'It hoards rainwater and opinions.'],
  ['basic_verdant', 'Verdant Drake', '#27ae60', 'Sleeps in treetops. Snores pollen.'],
  ['basic_gilded', 'Gilded Drake', '#d4ac0d', 'Shiny enough to count twice. It does not.'],
  ['basic_obsidian', 'Obsidian Drake', '#5d6d7e', 'Broods dramatically at all hours.'],
  ['basic_ivory', 'Ivory Drake', '#aab7c4', 'Suspiciously polite for a fire hazard.'],
];
for (const [id, name, color, flavor] of BASICS) {
  def({ id, name, type: 'basic', qty: 4, color, text: 'A Basic Dragon. No ability — just ambition.', flavor });
}

/* ------------------------------------------------------------------ */
/* Magical Dragons                                                     */
/* ------------------------------------------------------------------ */

def({
  id: 'm_battering', name: 'Battering Wyrm', type: 'magical', qty: 1, color: '#8e6f3e',
  text: 'At the start of your turn, you may DESTROY a Dragon. If you do, skip straight to your End phase.',
  onTurnStart: {
    steps: [
      { do: 'destroy', chooser: 'owner', filter: { kind: 'dragon', zone: 'any' }, optional: true, saveDone: 'hit' },
      { do: 'ifVar', var: 'hit', then: [{ do: 'skipToEnd' }] },
    ],
  },
});

def({
  id: 'm_cataclysm', name: 'Cataclysm Dragon', type: 'magical', qty: 1, color: '#7d3c98',
  text: 'When this card enters your stable, each player must SACRIFICE a Dragon.',
  onEnter: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'sacrifice', who: 'each', filter: { kind: 'dragon' }, optional: false }] },
  ],
});

def({
  id: 'm_spellscale', name: 'Spellscale Whelp', type: 'magical', qty: 1, color: '#48c9b0',
  text: 'This card cannot be destroyed by Magic cards.',
  noMagicDestroy: true,
});

def({
  id: 'm_ironclaw', name: 'Ironclaw Dragon', type: 'magical', qty: 1, color: '#839192',
  text: 'When this card enters your stable, you may DESTROY an Upgrade in any stable or SACRIFICE a Downgrade in your stable.',
  onEnter: [{ do: 'destroyUpOrSacDown', optional: true }],
});

def({
  id: 'm_harvest', name: 'Harvest Dragon', type: 'magical', qty: 1, color: '#d68910',
  text: 'When this card enters your stable, DRAW 2 cards, then DISCARD a card.',
  onEnter: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'discard', who: 'owner', n: 1 },
  ],
});

def({
  id: 'm_phoenix', name: 'Phoenix Dragon', type: 'magical', qty: 1, color: '#e74c3c',
  text: 'If this card would be sacrificed or destroyed, you may DISCARD a card instead.',
  wouldLeave: 'discardInstead',
});

def({
  id: 'm_colossal', name: 'Colossal Dragon', type: 'magical', qty: 1, color: '#6c3483',
  text: 'This card counts as 2 Dragons. You cannot play Instant cards.',
  countsAs: 2,
  mods: ['noInstantsSelf'],
});

def({
  id: 'm_stormwing', name: 'Stormwing', type: 'magical', qty: 1, color: '#5dade2',
  text: 'When this card enters your stable, you may take a Magic card from the discard pile into your hand.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['magic'] }, to: 'hand', optional: true }],
});

def({
  id: 'm_galewing', name: 'Galewing', type: 'magical', qty: 1, color: '#a3e4d7',
  text: 'When this card enters your stable, you may take an Instant card from the discard pile into your hand.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['instant'] }, to: 'hand', optional: true }],
});

def({
  id: 'm_hoardwing', name: 'Hoardwing', type: 'magical', qty: 1, color: '#f4d03f',
  text: 'When this card enters your stable, DRAW a card.',
  onEnter: [{ do: 'draw', who: 'owner', n: 1 }],
});

def({
  id: 'm_baron', name: 'Baron Dragon', type: 'magical', qty: 1, color: '#943126',
  text: 'When this card enters your stable, pull a random card from another player’s hand into yours.',
  onEnter: [{ do: 'randomSteal', who: 'owner', optional: false }],
});

def({
  id: 'm_bonescale', name: 'Bonescale Dragon', type: 'magical', qty: 1, color: '#909497',
  text: 'When this card enters your stable, you may DISCARD a Dragon card. If you do, bring a Dragon from the discard pile into your stable.',
  onEnter: [{
    do: 'costDiscardThen', who: 'owner', filter: { types: ['basic', 'magical'] },
    then: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'stable', optional: false }],
  }],
});

def({
  id: 'm_alluring', name: 'Alluring Wyvern', type: 'magical', sub: 'wyvern', qty: 1, color: '#af7ac5',
  text: 'When this card enters your stable, you may STEAL an Upgrade.',
  onEnter: [{ do: 'steal', chooser: 'owner', filter: { kind: 'upgrade', zone: 'others' }, optional: true }],
});

def({
  id: 'm_enchanting', name: 'Enchanting Dragon', type: 'magical', qty: 1, color: '#f1948a',
  text: 'When this card enters your stable, you may DISCARD a card. If you do, STEAL a Dragon.',
  onEnter: [{
    do: 'costDiscardThen', who: 'owner',
    then: [{ do: 'steal', chooser: 'owner', filter: { kind: 'dragon', zone: 'others' }, optional: false }],
  }],
});

def({
  id: 'm_queen', name: 'Queen Dragon', type: 'magical', qty: 1, color: '#c39bd3',
  text: 'While this card is in your stable, Basic Dragons cannot enter any stable but yours.',
  mods: ['queensDecree'],
});

def({
  id: 'm_guardian', name: 'Guardian Dragon', type: 'magical', qty: 1, color: '#7fb3d5',
  text: 'If another Dragon in your stable would be destroyed, you may SACRIFICE this card instead.',
  guardian: true,
});

def({
  id: 'm_elder', name: 'Elder Wyvern', type: 'magical', sub: 'wyvern', qty: 1, color: '#76848c',
  text: 'When this card enters your stable, you may search the deck for a Wyvern card and add it to your hand, then shuffle the deck.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { sub: 'wyvern' }, optional: true }],
});

def({
  id: 'm_gilded_wyv', name: 'Gilded Wyvern', type: 'magical', sub: 'wyvern', qty: 1, color: '#d5b556',
  text: 'When this card enters your stable, you may search the deck for an Upgrade card and add it to your hand, then shuffle the deck.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['upgrade'] }, optional: true }],
});

def({
  id: 'm_scrappy', name: 'Scrappy Wyvern', type: 'magical', sub: 'wyvern', qty: 1, color: '#a04000',
  text: 'When this card enters your stable, you may search the deck for a Downgrade card and add it to your hand, then shuffle the deck.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['downgrade'] }, optional: true }],
});

def({
  id: 'm_razorfin', name: 'Razorfin Wyvern', type: 'magical', sub: 'wyvern', qty: 1, color: '#2e86ab',
  text: 'At the start of your turn, you may SACRIFICE this card. If you do, DESTROY a Dragon.',
  onTurnStart: {
    steps: [{
      do: 'costSacrificeSelfThen',
      then: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'dragon', zone: 'any' }, optional: false }],
    }],
  },
});

def({
  id: 'm_torpedo', name: 'Torpedo Wyvern', type: 'magical', sub: 'wyvern', qty: 1, color: '#1a5276',
  text: 'When this card enters your stable, SACRIFICE all Downgrades in your stable.',
  onEnter: [{ do: 'sacrificeAll', who: 'owner', filter: { kind: 'downgrade' } }],
});

def({
  id: 'm_spiteclaw', name: 'Spiteclaw Dragon', type: 'magical', qty: 1, color: '#922b21',
  text: 'If this card is sacrificed or destroyed, you may DESTROY a Dragon.',
  onLeave: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'dragon', zone: 'any' }, optional: true }],
});

def({
  id: 'm_stray', name: 'Stray Whelp', type: 'magical', qty: 1, color: '#b9770e',
  text: 'At the start of each player’s turn, this card moves to that player’s stable. This card cannot be sacrificed or destroyed.',
  protected: true,
  wanders: true,
});

def({
  id: 'm_seraph', name: 'Seraph Dragon', type: 'magical', qty: 1, color: '#f7dc6f',
  text: 'If this card is sacrificed or destroyed, you may bring a Baby Dragon from the Nest into your stable.',
  onLeave: [{ do: 'babyFromNest', who: 'owner', optional: true }],
});

def({
  id: 'm_tidal', name: 'Tidal Dragon', type: 'magical', qty: 1, color: '#45b39d',
  text: 'When this card enters your stable, you may return a card in another player’s stable to their hand.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: true }],
});

def({
  id: 'm_nagging', name: 'Nagging Dragon', type: 'magical', qty: 1, color: '#cd6155',
  text: 'When this card enters your stable, each player must DISCARD a card.',
  onEnter: [{ do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }] }],
});

def({
  id: 'm_pest', name: 'Pest Drake', type: 'magical', qty: 1, color: '#82e0aa',
  text: 'When this card enters your stable, you may choose another player. That player must DISCARD a card.',
  onEnter: [{ do: 'targetDiscard', chooser: 'owner', optional: true }],
});

/* ------------------------------------------------------------------ */
/* Upgrades                                                            */
/* ------------------------------------------------------------------ */

def({
  id: 'u_sigil', name: 'Ancient Sigil', type: 'upgrade', qty: 2, color: '#f5b041',
  text: 'Cards you play cannot be stopped by Instant cards.',
  mods: ['uncounterable'],
});

def({
  id: 'u_armor', name: 'Dragonscale Ward', type: 'upgrade', qty: 2, color: '#5499c7',
  text: 'Dragons in this stable cannot be destroyed.',
  mods: ['dragonsSafe'],
});

def({
  id: 'u_tail', name: 'Spiked Tail', type: 'upgrade', qty: 2, color: '#58d68d',
  text: 'This card can only enter a stable that holds a Basic Dragon. At the start of your turn, you may DRAW an extra card.',
  requiresBasic: true,
  onTurnStart: {
    steps: [
      { do: 'ask', text: 'Draw an extra card with Spiked Tail?', saveDone: 'y' },
      { do: 'ifVar', var: 'y', then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'u_keg', name: 'Powder Keg', type: 'upgrade', qty: 2, color: '#dc7633',
  text: 'At the start of your turn, you may SACRIFICE a card. If you do, DESTROY a card.',
  onTurnStart: {
    steps: [
      { do: 'sacrifice', who: 'owner', filter: { kind: 'any' }, optional: true, saveDone: 'lit' },
      { do: 'ifVar', var: 'lit', then: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'any', zone: 'any' }, optional: false }] },
    ],
  },
});

def({
  id: 'u_twinheads', name: 'Twin Heads', type: 'upgrade', qty: 2, color: '#af7ac5',
  text: 'At the start of your turn, gain an extra action for this turn (play a card or draw a card).',
  onTurnStart: { steps: [{ do: 'extraAction' }] },
});

def({
  id: 'u_snare', name: 'Dragon Snare', type: 'upgrade', qty: 2, color: '#7e5109',
  text: 'At the start of your turn, you may STEAL a Dragon. Return it to its stable at the end of your turn.',
  onTurnStart: { steps: [{ do: 'snareSteal' }] },
});

/* ------------------------------------------------------------------ */
/* Downgrades                                                          */
/* ------------------------------------------------------------------ */

def({
  id: 'd_cage', name: 'Thorned Cage', type: 'downgrade', qty: 2, color: '#6e2c00',
  text: 'Each time a Dragon enters or leaves this stable, its owner must DISCARD a card.',
  mods: ['barbedWire'],
});

def({
  id: 'd_fog', name: 'Dampening Fog', type: 'downgrade', qty: 1, color: '#85929e',
  text: 'All Dragons in this stable are considered Basic Dragons with no abilities.',
  mods: ['suppress'],
});

def({
  id: 'd_lair', name: 'Ruined Lair', type: 'downgrade', qty: 2, color: '#4d5656',
  text: 'This stable’s owner cannot play Upgrade cards.',
  mods: ['noUpgrades'],
});

def({
  id: 'd_orb', name: 'Scrying Orb', type: 'downgrade', qty: 1, color: '#a569bd',
  text: 'This stable’s owner must keep their hand visible to all players.',
  mods: ['handVisible'],
});

def({
  id: 'd_toadcurse', name: 'Toadcurse', type: 'downgrade', qty: 1, color: '#52be80',
  text: 'All Dragons in this stable are considered Toads. Cards that affect Dragons do not affect Toads, and Toads do not count toward winning.',
  mods: ['toads'],
});

def({
  id: 'd_tithe', name: 'Blood Tithe', type: 'downgrade', qty: 2, color: '#78281f',
  text: 'At the start of your turn, SACRIFICE a Dragon. If you do, DRAW a card.',
  onTurnStart: {
    steps: [
      { do: 'sacrifice', who: 'owner', filter: { kind: 'dragon' }, optional: false, saveDone: 'paid' },
      { do: 'ifVar', var: 'paid', then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'd_chains', name: 'Heavy Chains', type: 'downgrade', qty: 2, color: '#515a5a',
  text: 'This stable’s owner cannot play Instant cards.',
  mods: ['noInstants'],
});

def({
  id: 'd_cave', name: 'Cramped Cave', type: 'downgrade', qty: 1, color: '#7b7d7d',
  text: 'If this stable ever holds more than 5 Dragons, its owner must SACRIFICE a Dragon.',
  mods: ['maxFive'],
});

/* ------------------------------------------------------------------ */
/* Magic                                                               */
/* ------------------------------------------------------------------ */

def({
  id: 's_venom', name: 'Dragonbane Venom', type: 'magic', qty: 3, color: '#1e8449',
  text: 'DESTROY a Dragon.',
  steps: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'dragon', zone: 'any' }, optional: false, byMagic: true }],
});

def({
  id: 's_tailswipe', name: 'Tail Swipe', type: 'magic', qty: 2, color: '#ca6f1e',
  text: 'Return a card in another player’s stable to their hand.',
  steps: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: false }],
});

def({
  id: 's_claws', name: 'Sticky Claws', type: 'magic', qty: 2, color: '#9c640c',
  text: 'Look at another player’s hand and take a card from it.',
  steps: [{ do: 'lookTake', who: 'owner' }],
});

def({
  id: 's_fate', name: 'Twist of Fate', type: 'magic', qty: 1, color: '#5b2c6f',
  text: 'DRAW 2 cards, then DISCARD 3 cards.',
  steps: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'discard', who: 'owner', n: 3 },
  ],
});

def({
  id: 's_gust', name: 'Wing Gust', type: 'magic', qty: 2, color: '#85c1e9',
  text: 'Return one card in each player’s stable (including yours) to its owner’s hand.',
  steps: [{ do: 'returnEach' }],
});

def({
  id: 's_lucky', name: 'Lucky Find', type: 'magic', qty: 2, color: '#f8c471',
  text: 'DRAW 3 cards, then DISCARD a card.',
  steps: [
    { do: 'draw', who: 'owner', n: 3 },
    { do: 'discard', who: 'owner', n: 1 },
  ],
});

def({
  id: 's_maelstrom', name: 'Arcane Maelstrom', type: 'magic', qty: 1, color: '#2874a6',
  text: 'Each player must DISCARD a card. Then shuffle the discard pile into the deck.',
  steps: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }] },
    { do: 'shuffleDiscardIntoDeck' },
  ],
});

def({
  id: 's_shift', name: 'Curse Shift', type: 'magic', qty: 2, color: '#a569bd',
  text: 'Move an Upgrade or Downgrade from any stable to any other stable.',
  steps: [{ do: 'moveUpDown', chooser: 'owner' }],
});

def({
  id: 's_slate', name: 'Clean Slate', type: 'magic', qty: 1, color: '#aeb6bf',
  text: 'Every player must SACRIFICE all Upgrades and Downgrades in their stable. Then shuffle the discard pile into the deck.',
  steps: [
    { do: 'massSacUpDown' },
    { do: 'shuffleDiscardIntoDeck' },
  ],
});

def({
  id: 's_molt', name: 'Molting Season', type: 'magic', qty: 1, color: '#d98880',
  text: 'Shuffle your hand and the discard pile into the deck, then DRAW 5 cards.',
  steps: [{ do: 'moltHand', who: 'owner' }],
});

def({
  id: 's_bargain', name: 'Sacrificial Bargain', type: 'magic', qty: 2, color: '#6e2c00',
  text: 'SACRIFICE a card. If you do, DESTROY 2 cards.',
  steps: [
    { do: 'sacrifice', who: 'owner', filter: { kind: 'any' }, optional: false, saveDone: 'paid' },
    {
      do: 'ifVar', var: 'paid', then: [
        { do: 'destroy', chooser: 'owner', filter: { kind: 'any', zone: 'any' }, optional: false, byMagic: true },
        { do: 'destroy', chooser: 'owner', filter: { kind: 'any', zone: 'any' }, optional: false, byMagic: true },
      ],
    },
  ],
});

def({
  id: 's_trade', name: 'Crooked Trade', type: 'magic', qty: 1, color: '#b7950b',
  text: 'Trade hands with another player.',
  steps: [{ do: 'tradeHands', who: 'owner' }],
});

/* ------------------------------------------------------------------ */
/* Instants                                                            */
/* ------------------------------------------------------------------ */

def({
  id: 'i_roar', name: 'Roar!', type: 'instant', qty: 13, color: '#c0392b',
  text: 'Play only when another card is being played. STOP that card and send it to the discard pile.',
});

def({
  id: 'i_primordial', name: 'Primordial Roar', type: 'instant', qty: 1, color: '#641e16',
  text: 'STOP a card being played and send it to the discard pile. This card cannot be stopped.',
  uncounterable: true,
});

/* ------------------------------------------------------------------ */

export const DEFS = D;

export function isDragonType(type) {
  return type === 'baby' || type === 'basic' || type === 'magical';
}

// Expanded list of def ids that make up the draw deck (babies excluded).
export function buildDeckList() {
  const list = [];
  for (const card of Object.values(D)) {
    if (card.type === 'baby') continue;
    for (let i = 0; i < card.qty; i++) list.push(card.id);
  }
  return list;
}
