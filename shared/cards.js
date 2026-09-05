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
  llama: {
    id: 'llama',
    name: 'Llama Caravan',
    creature: 'Llama',
    creatures: 'Llamas',
    baby: 'baby_llama',
    instant: 'Spit!',
    color: '#62c6ff',
    passiveName: 'Cud',
    passive: 'The first time each turn you DISCARD a card, DRAW a card.',
    blurb: 'Wool, spit and unbothered calm. Llamas win by chewing through whatever you throw at them.',
  },
};
export const FACTION_IDS = ['dragon', 'unicorn', 'llama'];

export const BABY_IDS = { dragon: 'baby_dragon', unicorn: 'baby_unicorn', llama: 'baby_llama' };
export const BABY_ID = 'baby_dragon'; // legacy alias
export const BABY_COUNT_PER_FACTION = 8;
export const BABY_COUNT = BABY_COUNT_PER_FACTION * FACTION_IDS.length;

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
  flavor: 'Knocks first. Never waits to be let in.',
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
  flavor: 'It arrives, and everyone loses something. Even its friends.',
  onEnter: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'sacrifice', who: 'each', filter: { kind: 'creature' }, optional: false }] },
  ],
});

def({
  id: 'm_spellscale', name: 'Spellscale Whelp', type: 'magical', faction: 'dragon', qty: 1, color: '#48c9b0',
  text: 'This card cannot be destroyed by Magic cards.',
  flavor: 'Spells slide off it like rain off a kettle.',
  noMagicDestroy: true,
});

def({
  id: 'm_ironclaw', name: 'Ironclaw Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#839192',
  text: 'When this card enters your stable, you may DESTROY an Upgrade in any stable or SACRIFICE a Downgrade in your stable.',
  flavor: 'Whatever is nailed down, it un-nails.',
  onEnter: [{ do: 'destroyUpOrSacDown', optional: true }],
});

def({
  id: 'm_harvest', name: 'Harvest Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#d68910',
  text: 'When this card enters your stable, DRAW 2 cards, then DISCARD a card.',
  flavor: 'Takes the whole field. Leaves the weeds.',
  onEnter: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'discard', who: 'owner', n: 1 },
  ],
});

def({
  id: 'm_phoenix', name: 'Phoenix Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#e74c3c',
  text: 'If this card would be sacrificed or destroyed, you may DISCARD a card instead.',
  flavor: 'Dying is a habit it keeps meaning to quit.',
  wouldLeave: 'discardInstead',
});

def({
  id: 'm_colossal', name: 'Colossal Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#6c3483',
  text: 'This card counts as 2 creatures. You cannot play Instant cards.',
  flavor: 'Counts for two. Roars for nobody.',
  countsAs: 2,
  mods: ['noInstantsSelf'],
});

def({
  id: 'm_stormwing', name: 'Stormwing', type: 'magical', faction: 'dragon', qty: 1, color: '#5dade2',
  text: 'When this card enters your stable, you may take a Magic card from the discard pile into your hand.',
  flavor: 'Whatever the storm dropped, it picks back up.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['magic'] }, to: 'hand', optional: true }],
});

def({
  id: 'm_galewing', name: 'Galewing', type: 'magical', faction: 'dragon', qty: 1, color: '#a3e4d7',
  text: 'When this card enters your stable, you may take an Instant card from the discard pile into your hand.',
  flavor: 'Catches the echo of a roar and hands it back.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['instant'] }, to: 'hand', optional: true }],
});

def({
  id: 'm_hoardwing', name: 'Hoardwing', type: 'magical', faction: 'dragon', qty: 1, color: '#f4d03f',
  text: 'When this card enters your stable, DRAW a card.',
  flavor: 'One more for the pile. Always one more.',
  onEnter: [{ do: 'draw', who: 'owner', n: 1 }],
});

def({
  id: 'm_baron', name: 'Baron Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#943126',
  text: 'When this card enters your stable, pull a random card from another player’s hand into yours.',
  flavor: 'Taxes are collected at the Baron’s discretion.',
  onEnter: [{ do: 'randomSteal', who: 'owner', optional: false }],
});

def({
  id: 'm_bonescale', name: 'Bonescale Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#909497',
  text: 'When this card enters your stable, you may DISCARD a creature card. If you do, bring a creature from the discard pile into your stable.',
  flavor: 'Buries one friend to dig up another.',
  onEnter: [{
    do: 'costDiscardThen', who: 'owner', filter: { types: ['basic', 'magical'] },
    then: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'stable', optional: false }],
  }],
});

def({
  id: 'm_alluring', name: 'Alluring Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#af7ac5',
  text: 'When this card enters your stable, you may STEAL an Upgrade.',
  flavor: 'Compliments your ward. Wears it home.',
  onEnter: [{ do: 'steal', chooser: 'owner', filter: { kind: 'upgrade', zone: 'others' }, optional: true }],
});

def({
  id: 'm_enchanting', name: 'Enchanting Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#f1948a',
  text: 'When this card enters your stable, you may DISCARD a card. If you do, STEAL a creature.',
  flavor: 'Says something nice, and they simply follow it home.',
  onEnter: [{
    do: 'costDiscardThen', who: 'owner',
    then: [{ do: 'steal', chooser: 'owner', filter: { kind: 'creature', zone: 'others' }, optional: false }],
  }],
});

def({
  id: 'm_queen', name: 'Queen Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#c39bd3',
  text: 'While this card is in your stable, Basic creatures cannot enter any stable but yours.',
  flavor: 'Every commoner in the valley ends up at her court.',
  mods: ['queensDecree'],
});

def({
  id: 'm_guardian', name: 'Guardian Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#7fb3d5',
  text: 'If another creature in your stable would be destroyed, you may SACRIFICE this card instead.',
  flavor: 'Big wings. Bigger heart. Terrible at ducking.',
  guardian: true,
});

def({
  id: 'm_elder', name: 'Elder Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#76848c',
  text: 'When this card enters your stable, you may search the deck for a Wyvern card and add it to your hand, then shuffle the deck.',
  flavor: 'Remembers every wyvern’s name. Summons them by it.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { sub: 'wyvern' }, optional: true }],
});

def({
  id: 'm_gilded_wyv', name: 'Gilded Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#d5b556',
  text: 'When this card enters your stable, you may search the deck for an Upgrade card and add it to your hand, then shuffle the deck.',
  flavor: 'Never leaves the hoard without something shiny.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['upgrade'] }, optional: true }],
});

def({
  id: 'm_scrappy', name: 'Scrappy Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#a04000',
  text: 'When this card enters your stable, you may search the deck for a Downgrade card and add it to your hand, then shuffle the deck.',
  flavor: 'Finds the nastiest thing in the pile. Brings it, wagging.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['downgrade'] }, optional: true }],
});

def({
  id: 'm_razorfin', name: 'Razorfin Wyvern', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#2e86ab',
  text: 'At the start of your turn, you may SACRIFICE this card. If you do, DESTROY a creature.',
  flavor: 'Goes out the way it came in: pointed at somebody.',
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
  flavor: 'Hits its own lair first. Clears out the mess.',
  onEnter: [{ do: 'sacrificeAll', who: 'owner', filter: { kind: 'downgrade' } }],
});

def({
  id: 'm_spiteclaw', name: 'Spiteclaw Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#922b21',
  text: 'If this card is sacrificed or destroyed, you may DESTROY a creature.',
  flavor: 'If it goes, someone goes with it.',
  onLeave: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'creature', zone: 'any' }, optional: true }],
});

def({
  id: 'm_stray', name: 'Stray Whelp', type: 'magical', faction: 'dragon', qty: 1, color: '#b9770e',
  text: 'At the start of each player’s turn, this card moves to that player’s stable. This card cannot be sacrificed or destroyed.',
  flavor: 'Belongs to nobody. Visits everyone.',
  protected: true,
  wanders: true,
});

def({
  id: 'm_seraph', name: 'Seraph Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#f7dc6f',
  text: 'If this card is sacrificed or destroyed, you may bring a Baby from the Nest into your stable.',
  flavor: 'Its last breath is a lullaby for the Nest.',
  onLeave: [{ do: 'babyFromNest', who: 'owner', optional: true }],
});

def({
  id: 'm_tidal', name: 'Tidal Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#45b39d',
  text: 'When this card enters your stable, you may return a card in another player’s stable to their hand.',
  flavor: 'The tide takes things back. It rarely asks.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: true }],
});

def({
  id: 'm_nagging', name: 'Nagging Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#cd6155',
  text: 'When this card enters your stable, each player must DISCARD a card.',
  flavor: 'Won’t stop until everyone has put something down.',
  onEnter: [{ do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }] }],
});

def({
  id: 'm_pest', name: 'Pest Drake', type: 'magical', faction: 'dragon', qty: 1, color: '#82e0aa',
  text: 'When this card enters your stable, you may choose another player. That player must DISCARD a card.',
  flavor: 'Small. Loud. Always in someone’s business.',
  onEnter: [{ do: 'targetDiscard', chooser: 'owner', optional: true }],
});

def({
  id: 'm_chronodrake', name: 'Chronodrake', type: 'magical', faction: 'dragon', qty: 1, color: '#1f8f91',
  text: 'When this card enters your stable, reverse the direction of play.',
  flavor: 'It yawned, and yesterday came around again.',
  onEnter: [{ do: 'reverseTurnOrder' }],
});

def({
  id: 'm_mirrorwing', name: 'Mirrorwing Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#9b8fc8',
  text: 'When this card enters your stable, you may copy the entrance ability of another Magical creature in any stable.',
  flavor: 'Whatever you can do, it does back at you.',
  onEnter: [{ do: 'copyEntrance', optional: true }],
});

def({
  id: 'm_riftcoil', name: 'Riftcoil Dragon', type: 'magical', faction: 'dragon', qty: 1, color: '#7048bd',
  text: 'When this card enters your stable, you may swap it with a creature in another player’s stable.',
  flavor: 'Steps through a crack in the air. Something else steps out.',
  onEnter: [{ do: 'swapDragon', optional: true }],
});

def({
  id: 'm_hydra', name: 'Hydra Dragon', sub: 'hydra', type: 'magical', faction: 'dragon', qty: 1, color: '#0e6655',
  text: 'If this card is sacrificed or destroyed, you may bring up to 2 Babies from the Nest into your stable.',
  flavor: 'Cut off one head. Get two hatchlings.',
  onLeave: [{ do: 'babyFromNest', who: 'owner', n: 2, optional: true }],
});

def({
  id: 'm_volcanic', name: 'Volcanic Wyrm', type: 'magical', faction: 'dragon', sub: 'wyvern', qty: 1, color: '#c0392b',
  text: 'When this card enters your stable, you may SACRIFICE all other creatures in your stable. If you do, DESTROY 2 cards for each creature sacrificed this way.',
  flavor: 'It does not have friends. It has fuel.',
  onEnter: [{ do: 'volcanicPurge' }],
});

def({
  id: 'm_emberling', name: 'Emberling', type: 'magical', faction: 'dragon', qty: 1, color: '#ff6b35',
  text: 'When this card enters your stable, if you have 3 or more loyal Dragons, DESTROY a card.',
  flavor: 'Tiny spark. Needs a bonfire behind it.',
  onEnter: [
    { do: 'countVar', var: 'pack', filter: { kind: 'creature', zone: 'own', faction: 'dragon', loyal: true } },
    { do: 'ifVar', var: 'pack', atLeast: 3, then: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: false }] },
  ],
});

def({
  id: 'm_dragonmother', name: 'Dragon Mother', type: 'magical', faction: 'dragon', qty: 1, color: '#b03a2e',
  text: 'At the start of your turn, if there is no Baby in your stable, bring a Baby from the Nest into your stable.',
  flavor: 'The Nest is never empty while she is watching.',
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
  flavor: 'Picks up the pieces. Keeps the pieces.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'hand', optional: true }],
});

def({
  id: 'mu_glitterhoof', name: 'Glitterhoof', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffd1f0',
  text: 'At the start of your turn, you may DRAW an extra card.',
  flavor: 'Wherever it steps, something turns up.',
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
  flavor: 'Only opens when the whole meadow is watching.',
  onEnter: [
    { do: 'countVar', var: 'herd', filter: { kind: 'creature', zone: 'own', faction: 'unicorn', loyal: true } },
    { do: 'ifVar', var: 'herd', atLeast: 3, then: [{ do: 'draw', who: 'owner', n: 2 }] },
  ],
});

def({
  id: 'mu_starfall', name: 'Starfall Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#c9b6ff',
  text: 'When this card enters your stable, you may return an Upgrade or Downgrade in any stable to its owner’s hand.',
  flavor: 'When a wish falls, whatever it lands on lifts off.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'upDown', zone: 'any' }, optional: true }],
});

def({
  id: 'mu_moonlit', name: 'Moonlit Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#a9c7ff',
  text: 'This card cannot be stolen, swapped, or returned to a hand.',
  flavor: 'You cannot catch moonlight. Many have tried.',
  rooted: true,
});

def({
  id: 'mu_lullaby', name: 'Lullaby Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#d9c4ff',
  text: 'When this card enters your stable, each other player must DISCARD a card.',
  flavor: 'One verse, and everyone drops what they’re holding.',
  onEnter: [{ do: 'eachPlayer', include: 'others', steps: [{ do: 'discard', who: 'each', n: 1 }] }],
});

def({
  id: 'mu_prism', name: 'Prism Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#f6f0ff',
  text: 'This card counts as 2 creatures. You cannot play Upgrade cards.',
  flavor: 'Already twice as bright. Refuses accessories.',
  countsAs: 2,
  mods: ['noUpgradesSelf'],
});

def({
  id: 'mu_shieldhorn', name: 'Shieldhorn Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#8fd3ff',
  text: 'Loyal creatures in your stable cannot be destroyed by Magic cards.',
  flavor: 'Lowers its horn, and the spell goes elsewhere.',
  mods: ['magicWard'],
});

def({
  id: 'mu_dream', name: 'Dreamweaver Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#c084fc',
  text: 'When this card enters your stable, look at another player’s hand and take a card from it.',
  flavor: 'Wanders into your dreams. Leaves with the good ones.',
  onEnter: [{ do: 'lookTake', who: 'owner' }],
});

def({
  id: 'mu_whisper', name: 'Whisperhorn Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffe2a8',
  text: 'When this card enters your stable, you may TAME a wild creature in your stable. It becomes loyal to you.',
  flavor: 'Says the one word every wild thing wants to hear.',
  onEnter: [{ do: 'tame', optional: true }],
});

def({
  id: 'mu_charming', name: 'Charming Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ff9ecf',
  text: 'When this card enters your stable, you may move a Downgrade from your stable to another player’s stable.',
  flavor: 'Passes on its problems with a smile.',
  onEnter: [{ do: 'moveUpDown', chooser: 'owner', filter: { kind: 'downgrade', zone: 'own' }, optional: true }],
});

def({
  id: 'mu_everbloom', name: 'Everbloom Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#a8f0b0',
  text: 'At the start of your turn, if there is no Baby in your stable, bring a Baby from the Nest into your stable.',
  flavor: 'Never a spring without a foal in the meadow.',
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
  flavor: 'Does your trick back at you, but sparklier.',
  onEnter: [{ do: 'copyEntrance', optional: true }],
});

def({
  id: 'mu_guardian', name: 'Guardian Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffd6e7',
  text: 'If another creature in your stable would be destroyed, you may SACRIFICE this card instead.',
  flavor: 'Stands in front. Always has.',
  guardian: true,
});

/* Pegasi — winged unicorns. Flying: cannot be stolen. */

const FLY = ' (Flying: cannot be stolen.)';

def({
  id: 'mu_peg_cloud', name: 'Cloudhoof Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#dff3ff', flying: true,
  text: 'When this card enters your stable, you may search the deck for a Pegasus card and add it to your hand, then shuffle the deck.' + FLY,
  flavor: 'Calls the flock down from the clouds.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { sub: 'pegasus' }, optional: true }],
});

def({
  id: 'mu_peg_gale', name: 'Galestride Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#b5e8ff', flying: true,
  text: 'When this card enters your stable, you may return a creature in another player’s stable to their hand.' + FLY,
  flavor: 'One gust, and somebody is walking home.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'creature', zone: 'others' }, optional: true }],
});

def({
  id: 'mu_peg_dawn', name: 'Dawnwing Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#ffd9a8', flying: true,
  text: 'If this card would be sacrificed or destroyed, return it to your hand instead.' + FLY,
  flavor: 'Sets in the evening. Rises in your hand.',
  wouldLeave: 'returnInstead',
});

def({
  id: 'mu_peg_thunder', name: 'Thunderhoof Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#9fb4ff', flying: true,
  text: 'When this card enters your stable, you may DESTROY an Upgrade in another player’s stable.' + FLY,
  flavor: 'Lightning has opinions about your decor.',
  onEnter: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'upgrade', zone: 'others' }, optional: true }],
});

def({
  id: 'mu_peg_sun', name: 'Sunchaser Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#ffe680', flying: true,
  text: 'At the start of your turn, you may DRAW a card. If you do, DISCARD a card.' + FLY,
  flavor: 'Always chasing something better than what it has.',
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
  flavor: 'Finds the neigh you dropped in the dark.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['instant'] }, to: 'hand', optional: true }],
});

def({
  id: 'mu_peg_storm', name: 'Stormfeather Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#8ecae6', flying: true,
  text: 'When this card enters your stable, DRAW a card.' + FLY,
  flavor: 'Rides in on a squall. Brings something with it.',
  onEnter: [{ do: 'draw', who: 'owner', n: 1 }],
});

/* ------------------------------------------------------------------ */
/* Upgrades                                                            */
/* ------------------------------------------------------------------ */

def({
  id: 'u_sigil', name: 'Ancient Sigil', type: 'upgrade', faction: 'dragon', qty: 2, color: '#f5b041',
  text: 'Cards you play cannot be stopped by Instant cards.',
  flavor: 'Older than roaring. Louder than it, too.',
  mods: ['uncounterable'],
});

def({
  id: 'u_armor', name: 'Dragonscale Ward', type: 'upgrade', faction: 'dragon', qty: 2, color: '#5499c7',
  text: 'Creatures in this stable cannot be destroyed.',
  flavor: 'Every scale a shield. Every shield a grudge.',
  mods: ['dragonsSafe'],
});

def({
  id: 'u_tail', name: 'Spiked Tail', type: 'upgrade', faction: 'dragon', qty: 2, color: '#58d68d',
  text: 'This card can only enter a stable that holds a Basic creature. At the start of your turn, you may DRAW an extra card.',
  flavor: 'Even the plainest drake looks dangerous from behind.',
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
  flavor: 'Everything is a fuse if you are angry enough.',
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
  flavor: 'Two heads, one hoard, no agreement.',
  onTurnStart: { steps: [{ do: 'extraAction' }] },
});

def({
  id: 'u_snare', name: 'Dragon Snare', type: 'upgrade', faction: 'dragon', qty: 2, color: '#7e5109',
  text: 'At the start of your turn, you may STEAL a creature. Return it to its stable at the end of your turn.',
  flavor: 'Borrowed. Thoroughly.',
  onTurnStart: { steps: [{ do: 'snareSteal' }] },
});

def({
  id: 'u_mane', name: 'Rainbow Mane', type: 'upgrade', faction: 'unicorn', qty: 2, color: '#ff9ad5',
  text: 'Creatures in this stable cannot be stolen.',
  flavor: 'Try to take it. Your hands come back glittery, and empty.',
  mods: ['noStealFrom'],
});

def({
  id: 'u_meadow', name: 'Cozy Meadow', type: 'upgrade', faction: 'unicorn', qty: 1, color: '#a3e4a8',
  text: 'At the start of your turn, if there is no Baby in this stable, bring a Baby from the Nest into it.',
  flavor: 'Soft grass, warm sun, foals wherever you look.',
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
  flavor: 'Lost a card. Kept a friend. Lucky.',
  mods: ['luckyShoe'],
});

/* ------------------------------------------------------------------ */
/* Downgrades                                                          */
/* ------------------------------------------------------------------ */

def({
  id: 'd_cage', name: 'Thorned Cage', type: 'downgrade', faction: 'dragon', qty: 1, color: '#6e2c00',
  text: 'Each time a creature enters or leaves this stable, its owner must DISCARD a card.',
  flavor: 'Nobody comes or goes without leaving a bit of themselves.',
  mods: ['barbedWire'],
});

def({
  id: 'd_fog', name: 'Dampening Fog', type: 'downgrade', faction: 'dragon', qty: 1, color: '#85929e',
  text: 'All creatures in this stable are considered Basic creatures with no abilities.',
  flavor: 'In the fog, every creature is just a shape.',
  mods: ['suppress'],
});

def({
  id: 'd_lair', name: 'Ruined Lair', type: 'downgrade', faction: 'dragon', qty: 1, color: '#4d5656',
  text: 'This stable’s owner cannot play Upgrade cards.',
  flavor: 'Hard to hang a trophy when the walls are down.',
  mods: ['noUpgrades'],
});

def({
  id: 'd_orb', name: 'Scrying Orb', type: 'downgrade', faction: 'dragon', qty: 1, color: '#a569bd',
  text: 'This stable’s owner must keep their hand visible to all players.',
  flavor: 'It shows everything. It especially shows your hand.',
  mods: ['handVisible'],
});

def({
  id: 'd_toadcurse', name: 'Toadcurse', type: 'downgrade', faction: 'dragon', qty: 1, color: '#52be80',
  text: 'All creatures in this stable are considered Toads. Cards that affect creatures do not affect Toads, and Toads do not count toward winning.',
  flavor: 'Ribbit. That’s it. That’s the whole creature now.',
  mods: ['toads'],
});

def({
  id: 'd_tithe', name: 'Blood Tithe', type: 'downgrade', faction: 'dragon', qty: 1, color: '#78281f',
  text: 'At the start of your turn, SACRIFICE a creature. If you do, DRAW a card.',
  flavor: 'The mountain asks a price. The mountain always gets paid.',
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
  flavor: 'Hard to roar with your jaw bound.',
  mods: ['noInstants'],
});

def({
  id: 'd_cave', name: 'Cramped Cave', type: 'downgrade', faction: 'dragon', qty: 1, color: '#7b7d7d',
  text: 'If this stable ever holds more than 5 creatures, its owner must SACRIFICE a creature.',
  flavor: 'Cozy for four. Tragic for six.',
  mods: ['maxFive'],
});

def({
  id: 'd_wildheart', name: 'Wild Heart', type: 'downgrade', faction: 'unicorn', qty: 1, color: '#c77dff',
  text: 'All creatures in this stable are considered wild — Magical creatures lose their abilities and faction passives do not trigger.',
  flavor: 'They remember the wild, and they stop taking orders.',
  mods: ['allWild'],
});

def({
  id: 'd_slumber', name: 'Slumber Spell', type: 'downgrade', faction: 'unicorn', qty: 1, color: '#7b8cde',
  text: 'This stable’s owner skips their Draw phase.',
  flavor: 'Sweet dreams. No new ideas.',
  mods: ['noDrawPhase'],
});

def({
  id: 'd_muddy', name: 'Muddy Hooves', type: 'downgrade', faction: 'unicorn', qty: 1, color: '#a3785a',
  text: 'This stable’s owner cannot play Magic cards.',
  flavor: 'Hard to cast anything when your feet won’t leave the ground.',
  mods: ['noMagic'],
});

/* ------------------------------------------------------------------ */
/* Magic                                                               */
/* ------------------------------------------------------------------ */

def({
  id: 's_venom', name: 'Dragonbane Venom', type: 'magic', faction: 'dragon', qty: 3, color: '#1e8449',
  text: 'DESTROY a creature.',
  flavor: 'One drop. One fewer creature.',
  steps: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'creature', zone: 'any' }, optional: false, byMagic: true }],
});

def({
  id: 's_tailswipe', name: 'Tail Swipe', type: 'magic', faction: 'dragon', qty: 2, color: '#ca6f1e',
  text: 'Return a card in another player’s stable to their hand.',
  flavor: 'Not destroyed. Just… elsewhere.',
  steps: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: false }],
});

def({
  id: 's_claws', name: 'Sticky Claws', type: 'magic', faction: 'dragon', qty: 2, color: '#9c640c',
  text: 'Look at another player’s hand and take a card from it.',
  flavor: 'Some things stick to a dragon whether it means to or not.',
  steps: [{ do: 'lookTake', who: 'owner' }],
});

def({
  id: 's_fate', name: 'Twist of Fate', type: 'magic', faction: 'neutral', qty: 1, color: '#5b2c6f',
  text: 'DRAW 2 cards, then DISCARD 3 cards.',
  flavor: 'Fate hands you two things and takes three. Fate is like that.',
  steps: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'discard', who: 'owner', n: 3 },
  ],
});

def({
  id: 's_gust', name: 'Wing Gust', type: 'magic', faction: 'dragon', qty: 2, color: '#85c1e9',
  text: 'Return one card in each player’s stable (including yours) to its owner’s hand.',
  flavor: 'One flap, and everyone’s roof is gone.',
  steps: [{ do: 'returnEach' }],
});

def({
  id: 's_lucky', name: 'Lucky Find', type: 'magic', faction: 'neutral', qty: 2, color: '#f8c471',
  text: 'DRAW 3 cards, then DISCARD a card.',
  flavor: 'Under the third rock, of course.',
  steps: [
    { do: 'draw', who: 'owner', n: 3 },
    { do: 'discard', who: 'owner', n: 1 },
  ],
});

def({
  id: 's_maelstrom', name: 'Arcane Maelstrom', type: 'magic', faction: 'neutral', qty: 1, color: '#2874a6',
  text: 'Each player must DISCARD a card. Then shuffle the discard pile into the deck.',
  flavor: 'Everything lost swirls back into the world. Some of it yours.',
  steps: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }] },
    { do: 'shuffleDiscardIntoDeck' },
  ],
});

def({
  id: 's_shift', name: 'Curse Shift', type: 'magic', faction: 'neutral', qty: 2, color: '#a569bd',
  text: 'Move an Upgrade or Downgrade from any stable to any other stable.',
  flavor: 'Bad luck is only bad luck until you hand it to someone.',
  steps: [{ do: 'moveUpDown', chooser: 'owner' }],
});

def({
  id: 's_slate', name: 'Clean Slate', type: 'magic', faction: 'neutral', qty: 1, color: '#aeb6bf',
  text: 'Every player must SACRIFICE all Upgrades and Downgrades in their stable. Then shuffle the discard pile into the deck.',
  flavor: 'Every wall and every curse, wiped. Start again.',
  steps: [
    { do: 'massSacUpDown' },
    { do: 'shuffleDiscardIntoDeck' },
  ],
});

def({
  id: 's_molt', name: 'Molting Season', type: 'magic', faction: 'dragon', qty: 1, color: '#d98880',
  text: 'Shuffle your hand and the discard pile into the deck, then DRAW 5 cards.',
  flavor: 'Shed the old skin. See what grows back.',
  steps: [{ do: 'moltHand', who: 'owner' }],
});

def({
  id: 's_bargain', name: 'Sacrificial Bargain', type: 'magic', faction: 'dragon', qty: 2, color: '#6e2c00',
  text: 'SACRIFICE a card. If you do, DESTROY 2 cards.',
  flavor: 'Give the mountain one. It takes two from someone else.',
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
  flavor: 'Nobody is quite sure who got cheated.',
  steps: [{ do: 'tradeHands', who: 'owner' }],
});

def({
  id: 's_bridge', name: 'Rainbow Bridge', type: 'magic', faction: 'unicorn', qty: 2, color: '#ff9ecf',
  text: 'Swap a creature in your stable with a creature in another player’s stable.',
  flavor: 'Two creatures walk across. They come back in the wrong order.',
  steps: [{ do: 'swapCreatures', chooser: 'owner' }],
});

def({
  id: 's_glitterbomb', name: 'Glitter Bomb', type: 'magic', faction: 'unicorn', qty: 2, color: '#ffd1f0',
  text: 'Each player must DISCARD a card, then DRAW a card.',
  flavor: 'Everybody loses something. Everybody finds glitter.',
  steps: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }, { do: 'draw', who: 'each', n: 1 }] },
  ],
});

def({
  id: 's_taming', name: 'Taming Bond', type: 'magic', faction: 'unicorn', qty: 2, color: '#ffe2a8',
  text: 'TAME a wild creature in your stable. It becomes loyal to you.',
  flavor: 'Not a leash. A promise.',
  steps: [{ do: 'tame', optional: false }],
});

def({
  id: 's_horn', name: 'Horn of Renewal', type: 'magic', faction: 'unicorn', qty: 1, color: '#9fe6c8',
  text: 'DISCARD a card. If you do, bring a creature from the discard pile into your stable.',
  flavor: 'Give something up. Something comes back.',
  steps: [{
    do: 'costDiscardThen', who: 'owner',
    then: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'stable', optional: false }],
  }],
});

def({
  id: 's_purify', name: 'Purifying Light', type: 'magic', faction: 'unicorn', qty: 1, color: '#fff3b0',
  text: 'Every player must SACRIFICE all Downgrades in their stable.',
  flavor: 'The light asks no questions. The curses simply leave.',
  steps: [{ do: 'massSacUpDown', types: ['downgrade'] }],
});

def({
  id: 's_stampede', name: 'Stampede', type: 'magic', faction: 'unicorn', qty: 1, color: '#c9b6ff',
  text: 'Each other player must SACRIFICE an Upgrade or Downgrade in their stable.',
  flavor: 'A thousand hooves, and nothing bolted down survives.',
  steps: [{ do: 'eachPlayer', include: 'others', steps: [{ do: 'sacrifice', who: 'each', filter: { kind: 'upDown' }, optional: false }] }],
});

/* ------------------------------------------------------------------ */
/* Instants                                                            */
/* ------------------------------------------------------------------ */

def({
  id: 'i_roar', name: 'Roar!', type: 'instant', faction: 'dragon', qty: 9, color: '#c0392b',
  text: 'Play only when another card is being played. STOP that card and send it to the discard pile.',
  flavor: 'The oldest word in the valley. It means “no”.',
});

def({
  id: 'i_primordial', name: 'Primordial Roar', type: 'instant', faction: 'dragon', qty: 1, color: '#641e16',
  text: 'STOP a card being played and send it to the discard pile. This card cannot be stopped.',
  flavor: 'The first roar ever roared. Nothing talks back to it.',
  uncounterable: true,
});

def({
  id: 'i_neigh', name: 'Neigh!', type: 'instant', faction: 'unicorn', qty: 9, color: '#ff5fa8',
  text: 'Play only when another card is being played. STOP that card and send it to the discard pile.',
  flavor: 'Polite. Firm. Final.',
});

def({
  id: 'i_superneigh', name: 'Super Neigh', type: 'instant', faction: 'unicorn', qty: 1, color: '#b5179e',
  text: 'STOP a card being played and send it to the discard pile. This card cannot be stopped.',
  flavor: 'The neigh other neighs tell stories about.',
  uncounterable: true,
});

/* ------------------------------------------------------------------ */
/* Unicorn Herd — balance pass                                          */
/*                                                                      */
/* The faction-sensitive slots (magicals, upgrades, downgrades, magic)   */
/* were dragon-heavy, and because Magical abilities only work while      */
/* LOYAL that skew handed Dragon keepers a live ability far more often   */
/* than Unicorn keepers. These cards close the gap by addition, so no    */
/* existing card was cut or weakened. Every effect below reuses steps    */
/* the engine already implements.                                       */
/* ------------------------------------------------------------------ */

def({
  id: 'mu_sugarplum', name: 'Sugarplum Unicorn', type: 'magical', faction: 'unicorn', qty: 2, color: '#f3a8d8',
  text: 'When this card enters your stable, you may return a card from the discard pile to your hand.',
  flavor: 'Nothing sweet is ever really gone.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', optional: true }],
});

def({
  id: 'mu_peg_lull', name: 'Lullwing Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 2, color: '#c8b6f0', flying: true,
  text: 'When this card enters your stable, DRAW a card.',
  flavor: 'Lands like a yawn.',
  onEnter: [{ do: 'draw', who: 'owner', n: 1 }],
});

def({
  id: 'mu_peppermint', name: 'Peppermint Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ff9bb0',
  text: 'At the start of your turn, you may DISCARD a card to DRAW two cards.',
  flavor: 'Strong opinions, stronger breath.',
  onTurnStart: {
    steps: [
      { do: 'costDiscardThen', who: 'owner', then: [{ do: 'draw', who: 'owner', n: 2 }] },
    ],
  },
});

def({
  id: 'mu_lantern', name: 'Lanternlight Unicorn', type: 'magical', faction: 'unicorn', qty: 2, color: '#ffe1a0',
  text: 'When this card enters your stable, you may SEARCH the deck for a Basic creature, add it to your hand, then shuffle.',
  flavor: 'Holds the light so nobody trips.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['basic'] }, optional: true }],
});

def({
  id: 'mu_peg_thistle', name: 'Thistledown Pegasus', type: 'magical', faction: 'unicorn', sub: 'pegasus', qty: 1, color: '#bfe6c8', flying: true,
  text: 'When this card enters your stable, you may RETURN a Downgrade in your stable to its owner\u2019s hand.',
  flavor: 'Blows the bad weather back where it came from.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'downgrade', zone: 'own' }, optional: true }],
});

def({
  id: 'mu_kindly', name: 'Kindly Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#ffd6e8',
  text: 'When this card enters your stable, each player DRAWS a card.',
  flavor: 'Insufferably nice about it, too.',
  onEnter: [{ do: 'eachPlayer', steps: [{ do: 'draw', who: 'each', n: 1 }] }],
});

def({
  id: 'mu_marshmallow', name: 'Marshmallow Unicorn', type: 'magical', faction: 'unicorn', qty: 2, color: '#fff0f5',
  text: 'If this card is sacrificed or destroyed, DRAW a card.',
  flavor: 'Squishes. Does not break.',
  onLeave: [{ do: 'draw', who: 'owner', n: 1 }],
});

def({
  id: 'mu_starlace', name: 'Starlace Unicorn', type: 'magical', faction: 'unicorn', qty: 1, color: '#a9c9ff',
  text: 'When this card enters your stable, you may bring a Baby from the Nest into your stable.',
  flavor: 'Knits constellations into cradles.',
  onEnter: [{ do: 'babyFromNest', who: 'owner', optional: true }],
});

def({
  id: 'u_garland', name: 'Blossom Garland', type: 'upgrade', faction: 'unicorn', qty: 2, color: '#ffb3d1',
  text: 'At the start of your turn, if there are no Downgrades in this stable, DRAW a card.',
  flavor: 'Blooms only where nothing is rotting.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'dn', filter: { kind: 'downgrade', zone: 'own' } },
      { do: 'ifVar', var: 'dn', atMost: 0, then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'u_canopy', name: 'Starlight Canopy', type: 'upgrade', faction: 'unicorn', qty: 3, color: '#9fb8f5',
  text: 'At the start of your turn, if there are three or more Unicorns in this stable, DRAW a card.',
  flavor: 'A roof made of other people\u2019s wishes.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'herd', filter: { kind: 'creature', zone: 'own', faction: 'unicorn' } },
      { do: 'ifVar', var: 'herd', atLeast: 3, then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'u_hearthring', name: 'Hearth Ring', type: 'upgrade', faction: 'unicorn', qty: 2, color: '#f5c99b',
  text: 'At the start of your turn, you may DISCARD a card to return a card from the discard pile to your hand.',
  flavor: 'Trade a cold ember for a warm one.',
  onTurnStart: {
    steps: [
      {
        do: 'costDiscardThen', who: 'owner',
        then: [{ do: 'fromDiscard', who: 'owner', optional: true }],
      },
    ],
  },
});

def({
  id: 'd_glitterfog', name: 'Glitterfog', type: 'downgrade', faction: 'unicorn', qty: 3, color: '#cdb4f6',
  text: 'At the start of this stable\u2019s turn, its owner DISCARDS a card.',
  flavor: 'Beautiful. Impossible to see through. Gets everywhere.',
  onTurnStart: {
    steps: [
      { do: 'discard', who: 'owner', n: 1, reasonText: 'Glitterfog' },
    ],
  },
});

def({
  id: 'd_braid', name: 'Tangled Braid', type: 'downgrade', faction: 'unicorn', qty: 2, color: '#e79ab5',
  text: 'This stable\u2019s owner cannot play Upgrades.',
  flavor: 'Someone plaited your whole hoard together.',
  mods: ['noUpgradesSelf'],
});

def({
  id: 's_wellwish', name: 'Well Wishes', type: 'magic', faction: 'unicorn', qty: 2, color: '#ffc2e2',
  text: 'DRAW two cards, then each other player DRAWS a card.',
  flavor: 'You cannot be smug alone.',
  steps: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'eachPlayer', include: 'others', steps: [{ do: 'draw', who: 'each', n: 1 }] },
  ],
});

def({
  id: 's_mendwing', name: 'Mending Wings', type: 'magic', faction: 'unicorn', qty: 1, color: '#a8e6d0',
  text: 'Return a card from the discard pile to your hand, then DRAW a card.',
  flavor: 'Feather by feather, nothing stays broken.',
  steps: [
    { do: 'fromDiscard', who: 'owner', optional: true },
    { do: 'draw', who: 'owner', n: 1 },
  ],
});

/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Harmony — ported from the Deck Duel model (archive/deck-duel)        */
/*                                                                      */
/* There it read "counts double while a Unicorn shares your stable".    */
/* Here it is tied to loyalty instead, so it says something about the   */
/* faction system: a stolen creature fills a slot but keeps nobody      */
/* company. Symmetric across both factions so the balance test holds.   */
/* ------------------------------------------------------------------ */

def({
  id: 'mu_harmony', name: 'Harmony Unicorn', type: 'magical', faction: 'unicorn', qty: 2, color: '#bfe3f0',
  harmonyBonus: true,
  text: 'This card counts as TWO creatures while another loyal creature shares your stable.',
  flavor: 'Sings only in company. Sulks alone.',
});

def({
  id: 'm_hearthbound', name: 'Hearthbound Wyrm', type: 'magical', faction: 'dragon', qty: 2, color: '#e0a05c',
  harmonyBonus: true,
  text: 'This card counts as TWO creatures while another loyal creature shares your stable.',
  flavor: 'A hoard of one is just a pile.',
});

def({
  id: 'd_discord', name: 'Discord', type: 'downgrade', faction: 'unicorn', qty: 2, color: '#9b8aa8',
  text: 'Cards in this stable no longer count as two creatures for Harmony.',
  flavor: 'One flat note, held forever.',
  mods: ['breakHarmony'],
});

def({
  id: 'd_snarlwind', name: 'Snarlwind', type: 'downgrade', faction: 'dragon', qty: 2, color: '#7d6a55',
  text: 'Cards in this stable no longer count as two creatures for Harmony.',
  flavor: 'Too loud in here to hear anyone else.',
  mods: ['breakHarmony'],
});

/* ------------------------------------------------------------------ */
/* The Llama Caravan                                                   */
/* Third faction: wool, spit and unbothered calm. Theme: discard and    */
/* recycle (Cud), returning cards to hand (spit), guarding and         */
/* stubbornness. Alpacas are the sub-kind: WOOLLY creatures cannot be  */
/* destroyed by Magic cards. Deck counts per type mirror the other two */
/* factions exactly (engine.test.js asserts the split).                */
/* ------------------------------------------------------------------ */

def({
  id: 'baby_llama', name: 'Baby Llama', type: 'baby', faction: 'llama', qty: BABY_COUNT_PER_FACTION,
  color: '#bfe9ff',
  text: 'A cria, all legs and fluff. If this card would leave your stable, return it to the Nest instead.',
  flavor: 'Hums when happy. Hums when not.',
});

const BASIC_LLAMAS = [
  ['basic_snowcap', 'Snowcap Llama', '#eef6ff', 'Lives above the clouds. Looks down on everyone, politely.'],
  ['basic_caramel', 'Caramel Llama', '#e0a96d', 'Sweet until you touch the ears.'],
  ['basic_sooty', 'Sooty Llama', '#6b6b7a', 'Rolled in a campfire once. Never washed since.'],
  ['basic_pebble', 'Pebble Llama', '#b8b2a6', 'Blends into any hillside. Refuses to explain how.'],
  ['basic_sunset', 'Sunset Llama', '#ffb08a', 'Wool the colour of the last hour of light.'],
  ['basic_moss', 'Moss Llama', '#9fd6a8', 'Grazes so slowly that things grow on it.'],
];
for (const [id, name, color, flavor] of BASIC_LLAMAS) {
  def({ id, name, type: 'basic', faction: 'llama', qty: 3, color, text: 'A Basic Llama. No ability — just attitude.', flavor });
}

const WOOL = ' (Woolly: cannot be destroyed by Magic.)';

/* Magical Llamas */

def({
  id: 'l_hummer', name: 'Humming Llama', type: 'magical', faction: 'llama', qty: 1, color: '#bfe9ff',
  text: 'When this card enters your stable, DRAW a card.',
  flavor: 'The hum means it found something.',
  onEnter: [{ do: 'draw', who: 'owner', n: 1 }],
});

def({
  id: 'l_cud', name: 'Cud-Chewer', type: 'magical', faction: 'llama', qty: 2, color: '#c9d98c',
  text: 'When this card enters your stable, you may return a card from the discard pile to your hand.',
  flavor: 'Nothing is ever finished. It is just chewed slower.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', optional: true }],
});

def({
  id: 'l_spitter', name: 'Spitting Llama', type: 'magical', faction: 'llama', qty: 1, color: '#a7f0d0',
  text: 'When this card enters your stable, you may return a creature in another player’s stable to their hand.',
  flavor: 'Aim is excellent. Manners are not.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'creature', zone: 'others' }, optional: true }],
});

def({
  id: 'l_pack', name: 'Pack Llama', type: 'magical', faction: 'llama', qty: 1, color: '#d4b483',
  text: 'At the start of your turn, you may DRAW a card. If you do, DISCARD a card.',
  flavor: 'Carries everything. Keeps only the good bits.',
  onTurnStart: {
    steps: [
      { do: 'ask', text: 'Draw a card with Pack Llama? (You will then discard a card.)', saveDone: 'y' },
      { do: 'ifVar', var: 'y', then: [{ do: 'draw', who: 'owner', n: 1 }, { do: 'discard', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'l_guard', name: 'Guard Llama', type: 'magical', faction: 'llama', qty: 2, color: '#8fb8de',
  text: 'If another creature in your stable would be destroyed, you may SACRIFICE this card instead.',
  flavor: 'Hired to watch sheep. Watches everyone.',
  guardian: true,
});

def({
  id: 'l_stubborn', name: 'Stubborn Llama', type: 'magical', faction: 'llama', qty: 1, color: '#c6a58a',
  text: 'This card cannot be stolen, swapped, or returned to a hand.',
  flavor: 'Has decided. Will not be un-deciding.',
  rooted: true,
});

def({
  id: 'l_alp_cloud', name: 'Cloud Alpaca', type: 'magical', faction: 'llama', sub: 'alpaca', qty: 1, color: '#f4f9ff', woolly: true,
  text: 'When this card enters your stable, you may search the deck for an Alpaca card and add it to your hand, then shuffle the deck.' + WOOL,
  flavor: 'Fluffier than the weather.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { sub: 'alpaca' }, optional: true }],
});

def({
  id: 'l_alp_cozy', name: 'Cozy Alpaca', type: 'magical', faction: 'llama', sub: 'alpaca', qty: 1, color: '#ffe3c8', woolly: true,
  text: 'When this card enters your stable, each player DRAWS a card.' + WOOL,
  flavor: 'Everyone gets a blanket. No exceptions.',
  onEnter: [{ do: 'eachPlayer', steps: [{ do: 'draw', who: 'each', n: 1 }] }],
});

def({
  id: 'l_alp_dusty', name: 'Dusty Alpaca', type: 'magical', faction: 'llama', sub: 'alpaca', qty: 1, color: '#d9c7a3', woolly: true,
  text: 'When this card enters your stable, you may DISCARD a card. If you do, DESTROY an Upgrade or Downgrade.' + WOOL,
  flavor: 'One good shake and the room needs sweeping.',
  onEnter: [{
    do: 'costDiscardThen', who: 'owner',
    then: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'upDown', zone: 'any' }, optional: false }],
  }],
});

def({
  id: 'l_alp_snuggle', name: 'Snuggle Alpaca', type: 'magical', faction: 'llama', sub: 'alpaca', qty: 1, color: '#ffd6e0', woolly: true,
  text: 'If this card is sacrificed or destroyed, DRAW a card.' + WOOL,
  flavor: 'Leaves a warm spot behind.',
  onLeave: [{ do: 'draw', who: 'owner', n: 1 }],
});

def({
  id: 'l_alp_braided', name: 'Braided Alpaca', type: 'magical', faction: 'llama', sub: 'alpaca', qty: 2, color: '#e8d5ff', woolly: true,
  harmonyBonus: true,
  text: 'This card counts as TWO creatures while another loyal creature shares your stable.' + WOOL,
  flavor: 'Two plaits, one very smug animal.',
});

def({
  id: 'l_alp_thistle', name: 'Thistle Alpaca', type: 'magical', faction: 'llama', sub: 'alpaca', qty: 1, color: '#c8e6c0', woolly: true,
  text: 'When this card enters your stable, you may RETURN a Downgrade in your stable to its owner’s hand.' + WOOL,
  flavor: 'Eats the prickly things so you don’t have to.',
  onEnter: [{ do: 'return', chooser: 'owner', filter: { kind: 'downgrade', zone: 'own' }, optional: true }],
});

def({
  id: 'l_caravan', name: 'Caravan Master', type: 'magical', faction: 'llama', qty: 1, color: '#b07d4f',
  text: 'When this card enters your stable, DRAW 2 cards, then DISCARD a card.',
  flavor: 'Knows every pass. Charges for all of them.',
  onEnter: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'discard', who: 'owner', n: 1 },
  ],
});

def({
  id: 'l_matriarch', name: 'Herd Matriarch', type: 'magical', faction: 'llama', qty: 1, color: '#d69fb0',
  text: 'At the start of your turn, if there is no Baby in your stable, bring a Baby from the Nest into your stable.',
  flavor: 'Counts the crias twice. Just in case.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'babies', filter: { kind: 'baby', zone: 'own' } },
      { do: 'ifVar', var: 'babies', atMost: 0, then: [{ do: 'babyFromNest', who: 'owner', optional: false }] },
    ],
  },
});

def({
  id: 'l_echo', name: 'Echo Llama', type: 'magical', faction: 'llama', qty: 1, color: '#b5c9e8',
  text: 'When this card enters your stable, you may copy the entrance ability of another Magical creature in any stable.',
  flavor: 'Does exactly what you did, a beat later, louder.',
  onEnter: [{ do: 'copyEntrance', optional: true }],
});

def({
  id: 'l_nosy', name: 'Nosy Llama', type: 'magical', faction: 'llama', qty: 1, color: '#f0c6a0',
  text: 'When this card enters your stable, look at another player’s hand and take a card from it.',
  flavor: 'Long neck. Longer reach.',
  onEnter: [{ do: 'lookTake', who: 'owner' }],
});

def({
  id: 'l_bell', name: 'Bell Llama', type: 'magical', faction: 'llama', qty: 1, color: '#ffe08a',
  text: 'When this card enters your stable, each other player must DISCARD a card.',
  flavor: 'You can hear it three valleys away. You cannot make it stop.',
  onEnter: [{ do: 'eachPlayer', include: 'others', steps: [{ do: 'discard', who: 'each', n: 1 }] }],
});

def({
  id: 'l_woolmountain', name: 'Woolmountain Llama', type: 'magical', faction: 'llama', qty: 1, color: '#fff7e6',
  text: 'This card counts as 2 creatures. You cannot play Magic cards.',
  flavor: 'Too much wool to see the spellbook.',
  countsAs: 2,
  mods: ['noMagicSelf'],
});

def({
  id: 'l_shepherd', name: 'Shepherd Llama', type: 'magical', faction: 'llama', qty: 1, color: '#9dc7b5',
  text: 'Loyal creatures in your stable cannot be destroyed by Magic cards.',
  flavor: 'Stands between the herd and the weather. All the weather.',
  mods: ['magicWard'],
});

def({
  id: 'l_kicking', name: 'Kicking Llama', type: 'magical', faction: 'llama', qty: 1, color: '#e39a8a',
  text: 'When this card enters your stable, you may DESTROY an Upgrade in another player’s stable.',
  flavor: 'Hind legs first. Questions never.',
  onEnter: [{ do: 'destroy', chooser: 'owner', filter: { kind: 'upgrade', zone: 'others' }, optional: true }],
});

def({
  id: 'l_lucky', name: 'Lucky Llama', type: 'magical', faction: 'llama', qty: 1, color: '#ffe9a8',
  text: 'When this card enters your stable, you may SEARCH the deck for a Basic creature, add it to your hand, then shuffle.',
  flavor: 'Finds friends under rocks.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['basic'] }, optional: true }],
});

def({
  id: 'l_spitfire', name: 'Spitfire Llama', type: 'magical', faction: 'llama', qty: 1, color: '#8ad6ff',
  text: 'When this card enters your stable, you may take an Instant card from the discard pile into your hand.',
  flavor: 'Saves its best spit for later.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['instant'] }, to: 'hand', optional: true }],
});

def({
  id: 'l_grumpy', name: 'Grumpy Llama', type: 'magical', faction: 'llama', qty: 1, color: '#a89aa8',
  text: 'When this card enters your stable, you may choose another player. That player must DISCARD a card.',
  flavor: 'Woke up like this. Will stay like this.',
  onEnter: [{ do: 'targetDiscard', chooser: 'owner', optional: true }],
});

def({
  id: 'l_saddlebag', name: 'Saddlebag Llama', type: 'magical', faction: 'llama', qty: 1, color: '#c98a5a',
  text: 'At the start of your turn, you may DISCARD a card to DRAW two cards.',
  flavor: 'Two pockets on every side.',
  onTurnStart: {
    steps: [
      { do: 'costDiscardThen', who: 'owner', then: [{ do: 'draw', who: 'owner', n: 2 }] },
    ],
  },
});

def({
  id: 'l_whistling', name: 'Whistling Llama', type: 'magical', faction: 'llama', qty: 1, color: '#d8f0ff',
  text: 'When this card enters your stable, you may TAME a wild creature in your stable. It becomes loyal to you.',
  flavor: 'One note, and the wild thing walks over.',
  onEnter: [{ do: 'tame', optional: true }],
});

def({
  id: 'l_switcheroo', name: 'Switcheroo Llama', type: 'magical', faction: 'llama', qty: 1, color: '#b48cff',
  text: 'When this card enters your stable, you may swap it with a creature in another player’s stable.',
  flavor: 'Was here. Is now there. Do not ask.',
  onEnter: [{ do: 'swapDragon', optional: true }],
});

def({
  id: 'l_bellwether', name: 'Bellwether Llama', type: 'magical', faction: 'llama', qty: 1, color: '#ffd166',
  text: 'When this card enters your stable, if you have 3 or more loyal Llamas, DRAW 2 cards.',
  flavor: 'Where it goes, the herd goes. Where the herd goes, snacks go.',
  onEnter: [
    { do: 'countVar', var: 'herd', filter: { kind: 'creature', zone: 'own', faction: 'llama', loyal: true } },
    { do: 'ifVar', var: 'herd', atLeast: 3, then: [{ do: 'draw', who: 'owner', n: 2 }] },
  ],
});

def({
  id: 'l_dustbath', name: 'Dustbath Llama', type: 'magical', faction: 'llama', qty: 1, color: '#d6c3a5',
  text: 'When this card enters your stable, you may move a Downgrade from your stable to another player’s stable.',
  flavor: 'Rolls in trouble. Shakes it onto you.',
  onEnter: [{ do: 'moveUpDown', chooser: 'owner', filter: { kind: 'downgrade', zone: 'own' }, optional: true }],
});

def({
  id: 'l_elder', name: 'Elder Llama', type: 'magical', faction: 'llama', qty: 1, color: '#cfcfd8',
  text: 'When this card enters your stable, you may search the deck for an Upgrade card and add it to your hand, then shuffle the deck.',
  flavor: 'Has seen every pass and every argument. Prefers the passes.',
  onEnter: [{ do: 'searchDeck', who: 'owner', filter: { types: ['upgrade'] }, optional: true }],
});

def({
  id: 'l_haystack', name: 'Haystack Llama', type: 'magical', faction: 'llama', qty: 1, color: '#f2dc9b',
  text: 'When this card enters your stable, you may take a creature card from the discard pile into your hand.',
  flavor: 'Something is always in the hay. Usually a friend.',
  onEnter: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'hand', optional: true }],
});

def({
  id: 'l_napping', name: 'Napping Llama', type: 'magical', faction: 'llama', qty: 2, color: '#dcd0ff',
  text: 'If this card would be sacrificed or destroyed, you may DISCARD a card instead.',
  flavor: 'Too asleep to be destroyed. Try later.',
  wouldLeave: 'discardInstead',
});

def({
  id: 'l_rescue', name: 'Rescue Llama', type: 'magical', faction: 'llama', qty: 1, color: '#ffb3a7',
  text: 'If this card is sacrificed or destroyed, you may bring a Baby from the Nest into your stable.',
  flavor: 'Carries the little ones down the mountain, then goes back up.',
  onLeave: [{ do: 'babyFromNest', who: 'owner', optional: true }],
});

/* Llama Upgrades */

def({
  id: 'u_woolcoat', name: 'Wool Coat', type: 'upgrade', faction: 'llama', qty: 2, color: '#f7f1e3',
  text: 'Loyal creatures in this stable cannot be destroyed by Magic cards.',
  flavor: 'Spells bounce. Rain beads. Compliments stick.',
  mods: ['magicWard'],
});

def({
  id: 'u_compost', name: 'Compost Heap', type: 'upgrade', faction: 'llama', qty: 2, color: '#8a9a5b',
  text: 'At the start of your turn, you may DISCARD a card to return a card from the discard pile to your hand.',
  flavor: 'Everything comes back, a little warmer.',
  onTurnStart: {
    steps: [
      { do: 'costDiscardThen', who: 'owner', then: [{ do: 'fromDiscard', who: 'owner', optional: true }] },
    ],
  },
});

def({
  id: 'u_bell', name: 'Caravan Bell', type: 'upgrade', faction: 'llama', qty: 2, color: '#ffd166',
  text: 'At the start of your turn, if there are three or more Llamas in this stable, DRAW a card.',
  flavor: 'Rings when the herd is big enough to matter.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'herd', filter: { kind: 'creature', zone: 'own', faction: 'llama' } },
      { do: 'ifVar', var: 'herd', atLeast: 3, then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

def({
  id: 'u_fence', name: 'Woolly Fence', type: 'upgrade', faction: 'llama', qty: 2, color: '#c4a484',
  text: 'Creatures in this stable cannot be stolen.',
  flavor: 'Soft on the outside. Very much a fence.',
  mods: ['noStealFrom'],
});

def({
  id: 'u_trough', name: 'Feeding Trough', type: 'upgrade', faction: 'llama', qty: 2, color: '#a3d5a8',
  text: 'At the start of your turn, if there is no Baby in this stable, bring a Baby from the Nest into it.',
  flavor: 'Fill it and something small always turns up.',
  onTurnStart: {
    steps: [
      { do: 'countVar', var: 'babies', filter: { kind: 'baby', zone: 'own' } },
      { do: 'ifVar', var: 'babies', atMost: 0, then: [{ do: 'babyFromNest', who: 'owner', optional: false }] },
    ],
  },
});

def({
  id: 'u_saltlick', name: 'Salt Lick', type: 'upgrade', faction: 'llama', qty: 2, color: '#e8e2d8',
  text: 'This card can only enter a stable that holds a Basic creature. At the start of your turn, you may DRAW an extra card.',
  flavor: 'Basic llamas queue for it. Politely, mostly.',
  requiresBasic: true,
  onTurnStart: {
    steps: [
      { do: 'ask', text: 'Draw an extra card with Salt Lick?', saveDone: 'y' },
      { do: 'ifVar', var: 'y', then: [{ do: 'draw', who: 'owner', n: 1 }] },
    ],
  },
});

/* Llama Downgrades */

def({
  id: 'd_mudwallow', name: 'Mud Wallow', type: 'downgrade', faction: 'llama', qty: 2, color: '#8b6b4a',
  text: 'This stable’s owner cannot play Magic cards.',
  flavor: 'Hard to concentrate with mud in your wool.',
  mods: ['noMagic'],
});

def({
  id: 'd_sheared', name: 'Sheared', type: 'downgrade', faction: 'llama', qty: 2, color: '#d9d2c5',
  text: 'At the start of this stable’s turn, its owner DISCARDS a card.',
  flavor: 'Cold, embarrassed, and lighter by one card.',
  onTurnStart: {
    steps: [
      { do: 'discard', who: 'owner', n: 1, reasonText: 'Sheared' },
    ],
  },
});

def({
  id: 'd_sulk', name: 'The Sulk', type: 'downgrade', faction: 'llama', qty: 2, color: '#7a6f8a',
  text: 'This stable’s owner skips their Draw phase.',
  flavor: 'Lies down in the road. The road waits.',
  mods: ['noDrawPhase'],
});

def({
  id: 'd_matted', name: 'Matted Wool', type: 'downgrade', faction: 'llama', qty: 2, color: '#a08c78',
  text: 'Cards in this stable no longer count as two creatures for Harmony.',
  flavor: 'Everything tangled into one lump. One lump counts as one.',
  mods: ['breakHarmony'],
});

def({
  id: 'd_overpacked', name: 'Overpacked', type: 'downgrade', faction: 'llama', qty: 2, color: '#b89b6b',
  text: 'If this stable ever holds more than 5 creatures, its owner must SACRIFICE a creature.',
  flavor: 'The bags were fine. The bags on the bags were not.',
  mods: ['maxFive'],
});

/* Llama Magic */

def({
  id: 's_spitball', name: 'Spitball', type: 'magic', faction: 'llama', qty: 2, color: '#a7f0d0',
  text: 'Return a card in another player’s stable to their hand.',
  flavor: 'Direct. Wet. Effective.',
  steps: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'others' }, optional: false }],
});

def({
  id: 's_shearing', name: 'Shearing Day', type: 'magic', faction: 'llama', qty: 2, color: '#f7f1e3',
  text: 'Each player must DISCARD a card, then DRAW a card.',
  flavor: 'Everyone loses a layer. Everyone grows a new one.',
  steps: [
    { do: 'eachPlayer', include: 'all', steps: [{ do: 'discard', who: 'each', n: 1 }, { do: 'draw', who: 'each', n: 1 }] },
  ],
});

def({
  id: 's_freshhay', name: 'Fresh Hay', type: 'magic', faction: 'llama', qty: 2, color: '#f2dc9b',
  text: 'DISCARD a card. If you do, bring a creature from the discard pile into your stable.',
  flavor: 'Shake the bale. See who was sleeping in it.',
  steps: [{
    do: 'costDiscardThen', who: 'owner',
    then: [{ do: 'fromDiscard', who: 'owner', filter: { types: ['basic', 'magical'] }, to: 'stable', optional: false }],
  }],
});

def({
  id: 's_caravanswap', name: 'Caravan Swap', type: 'magic', faction: 'llama', qty: 2, color: '#d4b483',
  text: 'Swap a creature in your stable with a creature in another player’s stable.',
  flavor: 'A fair trade, by llama standards.',
  steps: [{ do: 'swapCreatures', chooser: 'owner' }],
});

def({
  id: 's_herdcall', name: 'Herd Call', type: 'magic', faction: 'llama', qty: 2, color: '#d8f0ff',
  text: 'TAME a wild creature in your stable. It becomes loyal to you.',
  flavor: 'Come along, then. There’s hay.',
  steps: [{ do: 'tame', optional: false }],
});

def({
  id: 's_pasture', name: 'Sunny Pasture', type: 'magic', faction: 'llama', qty: 2, color: '#c8f5b0',
  text: 'DRAW two cards, then each other player DRAWS a card.',
  flavor: 'There is enough grass. There is always enough grass.',
  steps: [
    { do: 'draw', who: 'owner', n: 2 },
    { do: 'eachPlayer', include: 'others', steps: [{ do: 'draw', who: 'each', n: 1 }] },
  ],
});

/* Llama Instants */

def({
  id: 'i_spit', name: 'Spit!', type: 'instant', faction: 'llama', qty: 9, color: '#62c6ff',
  text: 'Play only when another card is being played. STOP that card and send it to the discard pile.',
  flavor: 'It travels farther than you think.',
});

def({
  id: 'i_greatspit', name: 'Great Spit', type: 'instant', faction: 'llama', qty: 1, color: '#1f6fa8',
  text: 'STOP a card being played and send it to the discard pile. This card cannot be stopped.',
  flavor: 'Talked about in hushed tones. From a distance.',
  uncounterable: true,
});


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

export const SUB_LABEL = { wyvern: 'Wyvern', hydra: 'Hydra', pegasus: 'Pegasus', alpaca: 'Alpaca' };
