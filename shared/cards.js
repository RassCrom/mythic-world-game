// Mythic World: Dragons vs Unicorns — card database.
// Original card set: all names, rules text, and flavor written for this game.
// Mechanics follow the classic "collect creatures / stop plays" party-game formula.
//
// Factions:
//   Every player pledges to a faction in the lobby: the Dragon Clan or the
//   Unicorn Herd. Every creature card also belongs to a faction. A creature
//   in a stable of its own faction is LOYAL; in a rival stable it is WILD.
//   Wild creatures still count toward the goal, but Magical creatures only
//   use their abilities while loyal ("a unicorn won't sparkle for a dragon").
//   Faction passives (resolved by the engine, once per turn each):
//     dragon  — Ember:   the first time each turn you DESTROY another player's
//                        card, DRAW a card.
//     unicorn — Sparkle: the first time each turn another player destroys one
//                        of your loyal creatures, DRAW a card.
//
// Card types:
//   baby      — start-of-game card from the shared Nest; never in deck/hand/discard
//   basic     — no ability, counts toward the win condition
//   magical   — creature with a unique ability (active only while loyal)
//   upgrade   — attaches to a stable (usually yours); one per name per stable
//   downgrade — attaches to a stable (usually an opponent's); one per name per stable
//   magic     — one-shot effect, then discarded
//   instant   — playable in response to another card being played (Roar! / Neigh!)
//
// Sub-kinds: wyvern & hydra (dragons), pegasus (unicorns). Pegasi are FLYING:
// they can never be stolen.
//
// Effect steps are interpreted by the server-side engine (worker/src/engine.js).
// The client only uses name/type/faction/text/color for rendering.

export const FACTIONS = {
  dragon: {
    id: 'dragon',
    name: 'Dragon Clan',
    creature: 'Dragon',
    creatures: 'Dragons',
    baby: 'baby_dragon',
    instant: 'Roar!',
    color: '#ff8a4c',
    passiveName: 'Ember',
    passive: 'The first time each turn you DESTROY another player’s card, DRAW a card.',
    blurb: 'Fire, hoards and big feelings. Dragons win by burning down everyone else’s stable.',
  },
  unicorn: {
    id: 'unicorn',
    name: 'Unicorn Herd',
    creature: 'Unicorn',
    creatures: 'Unicorns',
    baby: 'baby_unicorn',
    instant: 'Neigh!',
    color: '#ff7ac8',
    passiveName: 'Sparkle',
    passive: 'The first time each turn another player destroys one of your loyal creatures, DRAW a card.',
    blurb: 'Rainbows, glitter and passive-aggressive kindness. Unicorns win by out-cuddling the competition.',
  },
};
export const FACTION_IDS = ['dragon', 'unicorn'];

export const BABY_IDS = { dragon: 'baby_dragon', unicorn: 'baby_unicorn' };
export const BABY_ID = 'baby_dragon'; // legacy alias
export const BABY_COUNT_PER_FACTION = 8;
export const BABY_COUNT = BABY_COUNT_PER_FACTION * 2;

const D = {};

function def(card) {
  D[card.id] = card;
}

/* ------------------------------------------------------------------ */
/* Babies (the Nest)                                                   */
/* ------------------------------------------------------------------ */

def({
  id: 'baby_dragon', name: 'Baby Dragon', type: 'baby', faction: 'dragon', qty: BABY_COUNT_PER_FACTION,
  color: '#e8905a',
  text: 'Fresh from the egg. If this card would leave your stable, return it to the Nest instead.',
  flavor: 'Mostly teeth, entirely trouble.',
});

def({
  id: 'baby_unicorn', name: 'Baby Unicorn', type: 'baby', faction: 'unicorn', qty: BABY_COUNT_PER_FACTION,
  color: '#f4a6d7',
  text: 'Still wobbly on its hooves. If this card would leave your stable, return it to the Nest instead.',
  flavor: 'Its horn is a nub. Its ego is not.',
});

/* ------------------------------------------------------------------ */
/* Basic creatures                                                     */
/* ------------------------------------------------------------------ */

const BASIC_DRAGONS = [
  ['basic_crimson', 'Crimson Drake', '#c0392b', 'All fire, no finesse.'],
  ['basic_azure', 'Azure Drake', '#2e86c1', 'It hoards rainwater and opinions.'],
  ['basic_verdant', 'Verdant Drake', '#27ae60', 'Sleeps in treetops. Snores pollen.'],
  ['basic_gilded', 'Gilded Drake', '#d4ac0d', 'Shiny enough to count twice. It does not.'],
  ['basic_obsidian', 'Obsidian Drake', '#5d6d7e', 'Broods dramatically at all hours.'],
  ['basic_ivory', 'Ivory Drake', '#aab7c4', 'Suspiciously polite for a fire hazard.'],
];
for (const [id, name, color, flavor] of BASIC_DRAGONS) {
  def({ id, name, type: 'basic', faction: 'dragon', qty: 3, color, text: 'A Basic Dragon. No ability — just ambition.', flavor });
}

const BASIC_UNICORNS = [
  ['basic_rosebloom', 'Rosebloom Unicorn', '#ff8fb8', 'Smells like strawberries and judgement.'],
  ['basic_skyhoof', 'Skyhoof Unicorn', '#7ec8ff', 'Trots on clouds. Refuses stairs.'],
  ['basic_meadow', 'Meadow Unicorn', '#8fe3a1', 'Eats only the prettiest flowers.'],
  ['basic_starlit', 'Starlit Unicorn', '#ffd77a', 'Glows in the dark. Will not stop.'],
  ['basic_twilight', 'Twilight Unicorn', '#b48cff', 'Writes poetry about its own mane.'],
  ['basic_snowmane', 'Snowmane Unicorn', '#e8f4ff', 'Cool, calm, and secretly ticklish.'],
];
for (const [id, name, color, flavor] of BASIC_UNICORNS) {
  def({ id, name, type: 'basic', faction: 'unicorn', qty: 3, color, text: 'A Basic Unicorn. No ability — just sparkle.', flavor });
}

/* ------------------------------------------------------------------ */
/* Magical Dragons                                                     */
/* ------------------------------------------------------------------ */

def({
  id: 'm_battering', name: 'Battering Wyrm', type: 'magical', faction: 'dragon', qty: 1, color: '#8e6f3e',
  text: 'At the start of your turn, you may DESTROY a creature. If you do, skip straight to your End phase.',
  onTurnStart: {
    steps: [
      { do: 'destroy', chooser: 'owner', filter: { kind: 'creature', zone: 'any' }, optional: true, saveDone: 'hit' },
      { do: 'ifVar', var: 'hit', then: [{ do: 'skipToEnd' }] },
    ],
  },
});

def({
  id: 'm_cataclysm', name: 'Cataclysm Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#7d3c98',
  text: 'When this card enters your stable, each player must SACRIFICE a creature.',
  onEnter: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'sacrifice', who: 'each', filter: { kind: 'creature' }, optional: false }] },
  ],
});

def({
  id: 'm_spellscale', name: 'Spellscale Whelp', type: 'magical', faction: 'dragon', qty: 1, color: '#48c9b0',
  text: 'This card cannot be destroyed by Magic cards.',
  noMagicDestroy: true,
});

def({
  id: 'm_ironclaw', name: 'Ironclaw Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#839192',
  text: 'When this card enters your stable, you may DESTROY an Upgrade in any stable or SACRIFICE a Downgrade in your stable.',
  onEnter: [{ do: 'destroyUpOrSacDown', optional: true }],
});

def({
  id: 'm_harvest', name: 'Harvest Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#d68910',
  text: 'When this card enters your stable, DRAW 2 cards, then DISCARD a card.',
  onEnter: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'discard', who: 'owner', n: 1 },
  ],
});

def({
  id: 'm_phoenix', name: 'Phoenix Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#e74c3c',
  text: 'If this card would be sacrificed or destroyed, you may DISCARD a card instead.',
  wouldLeave: 'discardInstead',
});

def({
  id: 'm_colossal', name: 'Colossal Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#6c3483',
  text: 'This card counts as 2 creatures. You cannot play Instant cards.',
  countsAs: 2,
  mods: ['noInstantsSelf'],
});

def({
  id: 'm_stormwing', name: 'Stormwing', type: 'magical', faction: 'dragon', qty: 1, color: '#5dade2',
  text: 'When this card enters your stable, you may take a Magic card from the discard pile into your hand.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['magic'] }, to: 'hand', optional: true }],
});

def({
  id: 'm_galewing', name: 'Galewing', type: 'magical', faction: 'dragon', qty: 1, color: '#a3e4d7',
  text: 'When this card enters your stable, you may take an Instant card from the discard pile into your hand.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['instant'] }, to: 'hand', optional: true }],
});

def({
  id: 'm_hoardwing', name: 'Hoardwing', type: 'magical', faction: 'dragon', qty: 1, color: '#f4d03f',
  text: 'When this card enters your stable, DRAW a card.',
  onEnter: [{ do: 'draw', who: 'owner', n: 1 }],
});

def({
  id: 'm_baron', name: 'Baron Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#943126',
  text: 'When this card enters your stable, pull a random card from another player’s hand into yours.',
  onEnter: [{ do: 'randomSteal', who: 'owner', optional: false }],
});

def({
  id: 'm_bonescale', name: 'Bonescale Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#909497',
  text: 'When this card enters your stable, you may DISCARD a creature card. If you do, bring a creature from the discard pile into your stable.',
  onEnter: [{
    do: 'costDiscardThen', who: 'owner', filter: { types: ['basic', 'magical'] },
    then: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'stable', optional: false }],
  }],
});

def({
  id: 'm_alluring', name: 'Alluring Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#af7ac5',
  text: 'When this card enters your stable, you may STEAL an Upgrade.',
  onEnter: [{ do: 'steal', chooser: 'owner', filter: { kind: 'upgrade', zone: 'others' }, optional: true }],
});

def({
  id: 'm_enchanting', name: 'Enchanting Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#f1948a',
  text: 'When this card enters your stable, you may DISCARD a card. If you do, STEAL a creature.',
  onEnter: [{
    do: 'costDiscardThen', who: 'owner',
    then: [{ do: 'steal', chooser: 'owner', filter: { kind: 'creature', zone: 'others' }, optional: false }],
  }],
});

def({
  id: 'm_queen', name: 'Queen Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#c39bd3',
  text: 'While this card is in your stable, Basic creatures cannot enter any stable but yours.',
  mods: ['queensDecree'],
});

def({
  id: 'm_guardian', name: 'Guardian Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#7fb3d5',
  text: 'If another creature in your stable would be destroyed, you may SACRIFICE this card instead.',
  guardian: true,
});

def({
  id: 'm_elder', name: 'Elder Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#76848c',
  text: 'When this card enters your stable, you may search the deck for a Wyvern card and add it to your hand, then shuffle the deck.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { sub: 'wyvern' }, optional: true }],
});

def({
  id: 'm_gilded_wyv', name: 'Gilded Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#d5b556',
  text: 'When this card enters your stable, you may search the deck for an Upgrade card and add it to your hand, then shuffle the deck.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['upgrade'] }, optional: true }],
});

def({
  id: 'm_scrappy', name: 'Scrappy Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#a04000',
  text: 'When this card enters your stable, you may search the deck for a Downgrade card and add it to your hand, then shuffle the deck.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['downgrade'] }, optional: true }],
});

def({
  id: 'm_razorfin', name: 'Razorfin Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#2e86ab',
  text: 'At the start of your turn, you may SACRIFICE this card. If you do, DESTROY a creature.',
  onTurnStart: {
    steps: [{
      do: 'costSacrificeSelfThen',
      then: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'creature', zone: 'any' }, optional: false }],
    }],
  },
});

def({
  id: 'm_torpedo', name: 'Torpedo Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#1a5276',
  text: 'When this card enters your stable, SACRIFICE all Downgrades in your stable.',
  onEnter: [{ do: 'sacrificeAll', who: 'owner', filter: { kind: 'downgrade' } }],
});

def({
  id: 'm_spiteclaw', name: 'Spiteclaw Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#922b21',
  text: 'If this card is sacrificed or destroyed, you may DESTROY a creature.',
  onLeave: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'creature', zone: 'any' }, optional: true }],
});

def({
  id: 'm_stray', name: 'Stray Whelp', type: 'magical', faction: 'dragon', qty: 1, color: '#b9770e',
  text: 'At the start of each player’s turn, this card moves to that player’s stable. This card cannot be sacrificed or destroyed.',
  protected: true,
  wanders: true,
});

def({
  id: 'm_seraph', name: 'Seraph Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#f7dc6f',
  text: 'If this card is sacrificed or destroyed, you may bring a Baby from the Nest into your stable.',
  onLeave: [{ do: 'babyFromNest', who: 'owner', optional: true }],
});

def({
  id: 'm_tidal', name: 'Tidal Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#45b39d',
  text: 'When this card enters your stable, you may return a card in another player’s stable to their hand.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: true }],
});

def({
  id: 'm_nagging', name: 'Nagging Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#cd6155',
  text: 'When this card enters your stable, each player must DISCARD a card.',
  onEnter: [{ do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }] }],
});

def({
  id: 'm_pest', name: 'Pest Drake', type: 'magical', faction: 'dragon', qty: 1, color: '#82e0aa',
  text: 'When this card enters your stable, you may choose another player. That player must DISCARD a card.',
  onEnter: [{ do: 'targetDiscard', chooser: 'owner', optional: true }],
});

def({
  id: 'm_chronodrake', name: 'Chronodrake', type: 'magical', faction: 'dragon', qty: 1, color: '#1f8f91',
  text: 'When this card enters your stable, reverse the direction of play.',
  onEnter: [{ do: 'reverseTurnOrder' }],
});

def({
  id: 'm_mirrorwing', name: 'Mirrorwing Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#9b8fc8',
  text: 'When this card enters your stable, you may copy the entrance ability of another Magical creature in any stable.',
  onEnter: [{ do: 'copyEntrance', optional: true }],
});

def({
  id: 'm_riftcoil', name: 'Riftcoil Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#7048bd',
  text: 'When this card enters your stable, you may swap it with a creature in another player’s stable.',
  onEnter: [{ do: 'swapDragon', optional: true }],
});

def({
  id: 'm_hydra', name: 'Hydra Dragon', sub: 'hydra', type: 'magical', faction: 'dragon', qty: 1, color: '#0e6655',
  text: 'If this card is sacrificed or destroyed, you may bring up to 2 Babies from the Nest into your stable.',
  onLeave: [{ do: 'babyFromNest', who: 'owner', n: 2, optional: true }],
});

def({
  id: 'm_volcanic', name: 'Volcanic Wyrm', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#c0392b',
  text: 'When this card enters your stable, you may SACRIFICE all other creatures in your stable. If you do, DESTROY 2 cards for each creature sacrificed this way.',
  onEnter: [{ do: 'volcanicPurge' }],
});

def({
  id: 'm_emberling', name: 'Emberling', type: 'magical', faction: 'dragon', qty: 1, color: '#ff6b35',
  text: 'When this card enters your stable, if you have 3 or more loyal Dragons, DESTROY a card.',
  onEnter: [
    { do: 'countVar', var: 'pack', filter: { kind: 'creature', zone: 'own', faction: 'dragon', loyal: true } },
    { do: 'ifVar', var: 'pack', atLeast: 3, then: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: false }] },
  ],
});

def({
  id: 'm_dragonmother', name: 'Dragon Mother', type: 'magical', faction: 'dragon', qty: 1, color: '#b03a2e',
  text: 'At the start of your turn, if there is no Baby in your stable, bring a Baby from the Nest into your stable.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'babies', filter: { kind: 'baby', zone: 'own' } },
      { do: 'ifVar', var: 'babies', atMost: 0, then: [{ do: 'babyFromNest', who: 'owner', optional: false }] },
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Magical Unicorns                                                    */
/* ------------------------------------------------------------------ */

def({
  id: 'mu_rainbow', name: 'Rainbow Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ff8ad4',
  text: 'When this card enters your stable, you may bring a Baby from the Nest into your stable.',
  onEnter: [{ do: 'babyFromNest', who: 'owner', optional: true }],
  flavor: 'Every step leaves a tiny rainbow. The cleaning bill is enormous.',
});

def({
  id: 'mu_mending', name: 'Mending Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#9fe6c8',
  text: 'When this card enters your stable, you may take a creature card from the discard pile into your hand.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'hand', optional: true }],
});

def({
  id: 'mu_glitterhoof', name: 'Glitterhoof', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffd1f0',
  text: 'At the start of your turn, you may DRAW an extra card.',
  onTurnStart: {
    steps: [
      { do: 'ask', text: 'Draw an extra card with Glitterhoof?', saveDone: 'y' },
      { do: 'ifVar', var: 'y', then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'mu_blossom', name: 'Blossom Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffb3c6',
  text: 'When this card enters your stable, if you have 3 or more loyal Unicorns, DRAW 2 cards.',
  onEnter: [
    { do: 'countVar', var: 'herd', filter: { kind: 'creature', zone: 'own', faction: 'unicorn', loyal: true } },
    { do: 'ifVar', var: 'herd', atLeast: 3, then: [{ do: 'draw', who: 'owner', n: 2 }] },
  ],
});

def({
  id: 'mu_starfall', name: 'Starfall Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#c9b6ff',
  text: 'When this card enters your stable, you may return an Upgrade or Downgrade in any stable to its owner’s hand.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'upDown', zone: 'any' }, optional: true }],
});

def({
  id: 'mu_moonlit', name: 'Moonlit Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#a9c7ff',
  text: 'This card cannot be stolen, swapped, or returned to a hand.',
  rooted: true,
});

def({
  id: 'mu_lullaby', name: 'Lullaby Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#d9c4ff',
  text: 'When this card enters your stable, each other player must DISCARD a card.',
  onEnter: [{ do: 'eachPlayer', include: 'others', steps: [{ do: 'discard', who: 'each', n: 1 }] }],
});

def({
  id: 'mu_prism', name: 'Prism Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#f6f0ff',
  text: 'This card counts as 2 creatures. You cannot play Upgrade cards.',
  countsAs: 2,
  mods: ['noUpgradesSelf'],
});

def({
  id: 'mu_shieldhorn', name: 'Shieldhorn Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#8fd3ff',
  text: 'Loyal creatures in your stable cannot be destroyed by Magic cards.',
  mods: ['magicWard'],
});

def({
  id: 'mu_dream', name: 'Dreamweaver Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#c084fc',
  text: 'When this card enters your stable, look at another player’s hand and take a card from it.',
  onEnter: [{ do: 'lookTake', who: 'owner' }],
});

def({
  id: 'mu_whisper', name: 'Whisperhorn Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffe2a8',
  text: 'When this card enters your stable, you may TAME a wild creature in your stable. It becomes loyal to you.',
  onEnter: [{ do: 'tame', optional: true }],
});

def({
  id: 'mu_charming', name: 'Charming Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ff9ecf',
  text: 'When this card enters your stable, you may move a Downgrade from your stable to another player’s stable.',
  onEnter: [{ do: 'moveUpDown', chooser: 'owner', filter: { kind: 'downgrade', zone: 'own' }, optional: true }],
});

def({
  id: 'mu_everbloom', name: 'Everbloom Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#a8f0b0',
  text: 'At the start of your turn, if there is no Baby in your stable, bring a Baby from the Nest into your stable.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'babies', filter: { kind: 'baby', zone: 'own' } },
      { do: 'ifVar', var: 'babies', atMost: 0, then: [{ do: 'babyFromNest', who: 'owner', optional: false }] },
    ],
  },
});

def({
  id: 'mu_mirror', name: 'Mirrormane Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#e0e7ff',
  text: 'When this card enters your stable, you may copy the entrance ability of another Magical creature in any stable.',
  onEnter: [{ do: 'copyEntrance', optional: true }],
});

def({
  id: 'mu_guardian', name: 'Guardian Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffd6e7',
  text: 'If another creature in your stable would be destroyed, you may SACRIFICE this card instead.',
  guardian: true,
});

/* Pegasi — winged unicorns. Flying: cannot be stolen. */

const FLY = ' (Flying: cannot be stolen.)';

def({
  id: 'mu_peg_cloud', name: 'Cloudhoof Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#dff3ff', flying: true,
  text: 'When this card enters your stable, you may search the deck for a Pegasus card and add it to your hand, then shuffle the deck.' + FLY,
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { sub: 'pegasus' }, optional: true }],
});

def({
  id: 'mu_peg_gale', name: 'Galestride Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#b5e8ff', flying: true,
  text: 'When this card enters your stable, you may return a creature in another player’s stable to their hand.' + FLY,
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'creature', zone: 'others' }, optional: true }],
});

def({
  id: 'mu_peg_dawn', name: 'Dawnwing Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#ffd9a8', flying: true,
  text: 'If this card would be sacrificed or destroyed, return it to your hand instead.' + FLY,
  wouldLeave: 'returnInstead',
});

def({
  id: 'mu_peg_thunder', name: 'Thunderhoof Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#9fb4ff', flying: true,
  text: 'When this card enters your stable, you may DESTROY an Upgrade in another player’s stable.' + FLY,
  onEnter: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'upgrade', zone: 'others' }, optional: true }],
});

def({
  id: 'mu_peg_sun', name: 'Sunchaser Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#ffe680', flying: true,
  text: 'At the start of your turn, you may DRAW a card. If you do, DISCARD a card.' + FLY,
  onTurnStart: {
    steps: [
      { do: 'ask', text: 'Draw a card with Sunchaser Pegasus? (You will then discard a card.)', saveDone: 'y' },
      { do: 'ifVar', var: 'y', then: [{ do: 'draw', who: 'owner', n: 1 }, { do: 'discard', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'mu_peg_night', name: 'Nightglide Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#7f7fd5', flying: true,
  text: 'When this card enters your stable, you may take an Instant card from the discard pile into your hand.' + FLY,
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['instant'] }, to: 'hand', optional: true }],
});

def({
  id: 'mu_peg_storm', name: 'Stormfeather Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#8ecae6', flying: true,
  text: 'When this card enters your stable, DRAW a card.' + FLY,
  onEnter: [{ do: 'draw', who: 'owner', n: 1 }],
});

/* ------------------------------------------------------------------ */
/* Upgrades                                                            */
/* ------------------------------------------------------------------ */

def({
  id: 'u_sigil', name: 'Ancient Sigil', type: 'upgrade', faction: 'dragon', qty: 2, color: '#f5b041',
  text: 'Cards you play cannot be stopped by Instant cards.',
  mods: ['uncounterable'],
});

def({
  id: 'u_armor', name: 'Dragonscale Ward', type: 'upgrade', faction: 'dragon', qty: 2, color: '#5499c7',
  text: 'Creatures in this stable cannot be destroyed.',
  mods: ['dragonsSafe'],
});

def({
  id: 'u_tail', name: 'Spiked Tail', type: 'upgrade', faction: 'dragon', qty: 2, color: '#58d68d',
  text: 'This card can only enter a stable that holds a Basic creature. At the start of your turn, you may DRAW an extra card.',
  requiresBasic: true,
  onTurnStart: {
    steps: [
      { do: 'ask', text: 'Draw an extra card with Spiked Tail?', saveDone: 'y' },
      { do: 'ifVar', var: 'y', then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'u_keg', name: 'Powder Keg', type: 'upgrade', faction: 'dragon', qty: 2, color: '#dc7633',
  text: 'At the start of your turn, you may SACRIFICE a card. If you do, DESTROY a card.',
  onTurnStart: {
    steps: [
      { do: 'sacrifice', who: 'owner', filter: { kind: 'any' }, optional: true, saveDone: 'lit' },
      { do: 'ifVar', var: 'lit', then: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'any', zone: 'any' }, optional: false }] },
    ],
  },
});

def({
  id: 'u_twinheads', name: 'Twin Heads', type: 'upgrade', faction: 'dragon', qty: 2, color: '#af7ac5',
  text: 'At the start of your turn, gain an extra action for this turn (play a card or draw a card).',
  onTurnStart: { steps: [{ do: 'extraAction' }] },
});

def({
  id: 'u_snare', name: 'Dragon Snare', type: 'upgrade', faction: 'dragon', qty: 2, color: '#7e5109',
  text: 'At the start of your turn, you may STEAL a creature. Return it to its stable at the end of your turn.',
  onTurnStart: { steps: [{ do: 'snareSteal' }] },
});

def({
  id: 'u_mane', name: 'Rainbow Mane', type: 'upgrade', faction: 'unicorn', qty: 2, color: '#ff9ad5',
  text: 'Creatures in this stable cannot be stolen.',
  mods: ['noStealFrom'],
});

def({
  id: 'u_meadow', name: 'Cozy Meadow', type: 'upgrade', faction: 'unicorn', qty: 1, color: '#a3e4a8',
  text: 'At the start of your turn, if there is no Baby in this stable, bring a Baby from the Nest into it.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'babies', filter: { kind: 'baby', zone: 'own' } },
      { do: 'ifVar', var: 'babies', atMost: 0, then: [{ do: 'babyFromNest', who: 'owner', optional: false }] },
    ],
  },
});

def({
  id: 'u_horseshoe', name: 'Lucky Horseshoe', type: 'upgrade', faction: 'unicorn', qty: 2, color: '#ffd166',
  text: 'If a creature in this stable would be destroyed by a Magic card, its owner may DISCARD a card instead.',
  mods: ['luckyShoe'],
});

/* ------------------------------------------------------------------ */
/* Downgrades                                                          */
/* ------------------------------------------------------------------ */

def({
  id: 'd_cage', name: 'Thorned Cage', type: 'downgrade', faction: 'dragon', qty: 1, color: '#6e2c00',
  text: 'Each time a creature enters or leaves this stable, its owner must DISCARD a card.',
  mods: ['barbedWire'],
});

def({
  id: 'd_fog', name: 'Dampening Fog', type: 'downgrade', faction: 'dragon', qty: 1, color: '#85929e',
  text: 'All creatures in this stable are considered Basic creatures with no abilities.',
  mods: ['suppress'],
});

def({
  id: 'd_lair', name: 'Ruined Lair', type: 'downgrade', faction: 'dragon', qty: 1, color: '#4d5656',
  text: 'This stable’s owner cannot play Upgrade cards.',
  mods: ['noUpgrades'],
});

def({
  id: 'd_orb', name: 'Scrying Orb', type: 'downgrade', faction: 'dragon', qty: 1, color: '#a569bd',
  text: 'This stable’s owner must keep their hand visible to all players.',
  mods: ['handVisible'],
});

def({
  id: 'd_toadcurse', name: 'Toadcurse', type: 'downgrade', faction: 'dragon', qty: 1, color: '#52be80',
  text: 'All creatures in this stable are considered Toads. Cards that affect creatures do not affect Toads, and Toads do not count toward winning.',
  mods: ['toads'],
});

def({
  id: 'd_tithe', name: 'Blood Tithe', type: 'downgrade', faction: 'dragon', qty: 1, color: '#78281f',
  text: 'At the start of your turn, SACRIFICE a creature. If you do, DRAW a card.',
  onTurnStart: {
    steps: [
      { do: 'sacrifice', who: 'owner', filter: { kind: 'creature' }, optional: false, saveDone: 'paid' },
      { do: 'ifVar', var: 'paid', then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'd_chains', name: 'Heavy Chains', type: 'downgrade', faction: 'dragon', qty: 1, color: '#515a5a',
  text: 'This stable’s owner cannot play Instant cards.',
  mods: ['noInstants'],
});

def({
  id: 'd_cave', name: 'Cramped Cave', type: 'downgrade', faction: 'dragon', qty: 1, color: '#7b7d7d',
  text: 'If this stable ever holds more than 5 creatures, its owner must SACRIFICE a creature.',
  mods: ['maxFive'],
});

def({
  id: 'd_wildheart', name: 'Wild Heart', type: 'downgrade', faction: 'unicorn', qty: 1, color: '#c77dff',
  text: 'All creatures in this stable are considered wild — Magical creatures lose their abilities and faction passives do not trigger.',
  mods: ['allWild'],
});

def({
  id: 'd_slumber', name: 'Slumber Spell', type: 'downgrade', faction: 'unicorn', qty: 1, color: '#7b8cde',
  text: 'This stable’s owner skips their Draw phase.',
  mods: ['noDrawPhase'],
});

def({
  id: 'd_muddy', name: 'Muddy Hooves', type: 'downgrade', faction: 'unicorn', qty: 1, color: '#a3785a',
  text: 'This stable’s owner cannot play Magic cards.',
  mods: ['noMagic'],
});

/* ------------------------------------------------------------------ */
/* Magic                                                               */
/* ------------------------------------------------------------------ */

def({
  id: 's_venom', name: 'Dragonbane Venom', type: 'magic', faction: 'dragon', qty: 3, color: '#1e8449',
  text: 'DESTROY a creature.',
  steps: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'creature', zone: 'any' }, optional: false, byMagic: true }],
});

def({
  id: 's_tailswipe', name: 'Tail Swipe', type: 'magic', faction: 'dragon', qty: 2, color: '#ca6f1e',
  text: 'Return a card in another player’s stable to their hand.',
  steps: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: false }],
});

def({
  id: 's_claws', name: 'Sticky Claws', type: 'magic', faction: 'dragon', qty: 2, color: '#9c640c',
  text: 'Look at another player’s hand and take a card from it.',
  steps: [{ do: 'lookTake', who: 'owner' }],
});

def({
  id: 's_fate', name: 'Twist of Fate', type: 'magic', faction: 'neutral', qty: 1, color: '#5b2c6f',
  text: 'DRAW 2 cards, then DISCARD 3 cards.',
  steps: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'discard', who: 'owner', n: 3 },
  ],
});

def({
  id: 's_gust', name: 'Wing Gust', type: 'magic', faction: 'dragon', qty: 2, color: '#85c1e9',
  text: 'Return one card in each player’s stable (including yours) to its owner’s hand.',
  steps: [{ do: 'returnEach' }],
});

def({
  id: 's_lucky', name: 'Lucky Find', type: 'magic', faction: 'neutral', qty: 2, color: '#f8c471',
  text: 'DRAW 3 cards, then DISCARD a card.',
  steps: [
    { do: 'draw', who: 'owner', n: 3 },
    { do: 'discard', who: 'owner', n: 1 },
  ],
});

def({
  id: 's_maelstrom', name: 'Arcane Maelstrom', type: 'magic', faction: 'neutral', qty: 1, color: '#2874a6',
  text: 'Each player must DISCARD a card. Then shuffle the discard pile into the deck.',
  steps: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }] },
    { do: 'shuffleDiscardIntoDeck' },
  ],
});

def({
  id: 's_shift', name: 'Curse Shift', type: 'magic', faction: 'neutral', qty: 2, color: '#a569bd',
  text: 'Move an Upgrade or Downgrade from any stable to any other stable.',
  steps: [{ do: 'moveUpDown', chooser: 'owner' }],
});

def({
  id: 's_slate', name: 'Clean Slate', type: 'magic', faction: 'neutral', qty: 1, color: '#aeb6bf',
  text: 'Every player must SACRIFICE all Upgrades and Downgrades in their stable. Then shuffle the discard pile into the deck.',
  steps: [
    { do: 'massSacUpDown' },
    { do: 'shuffleDiscardIntoDeck' },
  ],
});

def({
  id: 's_molt', name: 'Molting Season', type: 'magic', faction: 'dragon', qty: 1, color: '#d98880',
  text: 'Shuffle your hand and the discard pile into the deck, then DRAW 5 cards.',
  steps: [{ do: 'moltHand', who: 'owner' }],
});

def({
  id: 's_bargain', name: 'Sacrificial Bargain', type: 'magic', faction: 'dragon', qty: 2, color: '#6e2c00',
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
  id: 's_trade', name: 'Crooked Trade', type: 'magic', faction: 'neutral', qty: 1, color: '#b7950b',
  text: 'Trade hands with another player.',
  steps: [{ do: 'tradeHands', who: 'owner' }],
});

def({
  id: 's_bridge', name: 'Rainbow Bridge', type: 'magic', faction: 'unicorn', qty: 2, color: '#ff9ecf',
  text: 'Swap a creature in your stable with a creature in another player’s stable.',
  steps: [{ do: 'swapCreatures', chooser: 'owner' }],
});

def({
  id: 's_glitterbomb', name: 'Glitter Bomb', type: 'magic', faction: 'unicorn', qty: 2, color: '#ffd1f0',
  text: 'Each player must DISCARD a card, then DRAW a card.',
  steps: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }, { do: 'draw', who: 'each', n: 1 }] },
  ],
});

def({
  id: 's_taming', name: 'Taming Bond', type: 'magic', faction: 'unicorn', qty: 2, color: '#ffe2a8',
  text: 'TAME a wild creature in your stable. It becomes loyal to you.',
  steps: [{ do: 'tame', optional: false }],
});

def({
  id: 's_horn', name: 'Horn of Renewal', type: 'magic', faction: 'unicorn', qty: 1, color: '#9fe6c8',
  text: 'DISCARD a card. If you do, bring a creature from the discard pile into your stable.',
  steps: [{
    do: 'costDiscardThen', who: 'owner',
    then: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'stable', optional: false }],
  }],
});

def({
  id: 's_purify', name: 'Purifying Light', type: 'magic', faction: 'unicorn', qty: 1, color: '#fff3b0',
  text: 'Every player must SACRIFICE all Downgrades in their stable.',
  steps: [{ do: 'massSacUpDown', types: ['downgrade'] }],
});

def({
  id: 's_stampede', name: 'Stampede', type: 'magic', faction: 'unicorn', qty: 1, color: '#c9b6ff',
  text: 'Each other player must SACRIFICE an Upgrade or Downgrade in their stable.',
  steps: [{ do: 'eachPlayer', include: 'others', steps: [{ do: 'sacrifice', who: 'each', filter: { kind: 'upDown' }, optional: false }] }],
});

/* ------------------------------------------------------------------ */
/* Instants                                                            */
/* ------------------------------------------------------------------ */

def({
  id: 'i_roar', name: 'Roar!', type: 'instant', faction: 'dragon', qty: 9, color: '#c0392b',
  text: 'Play only when another card is being played. STOP that card and send it to the discard pile.',
});

def({
  id: 'i_primordial', name: 'Primordial Roar', type: 'instant', faction: 'dragon', qty: 1, color: '#641e16',
  text: 'STOP a card being played and send it to the discard pile. This card cannot be stopped.',
  uncounterable: true,
});

def({
  id: 'i_neigh', name: 'Neigh!', type: 'instant', faction: 'unicorn', qty: 9, color: '#ff5fa8',
  text: 'Play only when another card is being played. STOP that card and send it to the discard pile.',
});

def({
  id: 'i_superneigh', name: 'Super Neigh', type: 'instant', faction: 'unicorn', qty: 1, color: '#b5179e',
  text: 'STOP a card being played and send it to the discard pile. This card cannot be stopped.',
  uncounterable: true,
});

/* ------------------------------------------------------------------ */

export const DEFS = D;

export function isDragonType(type) {
  return type === 'baby' || type === 'basic' || type === 'magical';
}
export const isCreatureType = isDragonType;

export function isBabyId(defId) {
  return DEFS[defId]?.type === 'baby';
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

// Expanded list of baby ids that make up the Nest.
export function buildNestList() {
  const list = [];
  for (const card of Object.values(D)) {
    if (card.type !== 'baby') continue;
    for (let i = 0; i < card.qty; i++) list.push(card.id);
  }
  return list;
}

export const SUB_LABEL = { wyvern: 'Wyvern', hydra: 'Hydra', pegasus: 'Pegasus' };
