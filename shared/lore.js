// Mythic World: Dragons vs Unicorns — setting and lore.
//
// Everything here is presentational: the engine never reads it. The client
// shows it on the home screen, in the lobby, on the battlefield picker and in
// the Codex. Strings are English and double as translation keys (see
// client/src/i18n/translations.js), so keep them stable once shipped.
//
// The premise ties every rule to a piece of the world:
//   the Nest      — one warm hatching-ground both sides share (shared Nest, babies)
//   the Hollow    — the valley between the two homelands (the battlefields)
//   a keeper      — a player; their stable is a roost/meadow they must fill (goal of 7)
//   loyal / wild  — creatures taken across the line grow homesick (abilities sleep)
//   the Old Word  — Roar! / Neigh!: the one truce law that lets anyone stop a play
//   Ember/Sparkle — how each side turns loss into strength (faction passives)

export const WORLD = {
  title: 'The Legend of the Hollow',
  eyebrow: 'The story so far',
  paragraphs: [
    'Between the Ember Peaks and the Glimmering Reach lies the Hollow: a green valley with a single warm stone circle at its heart. That circle is the Nest, and every dragon and unicorn ever born hatched there, side by side, before anyone taught them to disagree.',
    'Once a season the two sides send their keepers down into the Hollow. Each keeper builds a stable, and the first to fill it with seven creatures claims the valley until the next hatching. Nobody remembers who started the contest. Everybody remembers who won last time.',
    'Creatures carried across the line grow homesick. A stolen unicorn will stand in a dragon’s stable and count for the tally, but it will not sparkle for anyone; a wild dragon keeps its fire to itself. Only patience, or a Whisperhorn, can make a wild heart loyal again.',
    'One rule outranks every other. Any keeper may shout the Old Word, a Roar, a Neigh or a Spit, and the play in front of them simply stops. The Hollow is the only place in the world where a single loud “no” is law.',
    'Lately a third banner has appeared on the ridge. The Llama Caravan came over the high passes to trade salt and wool, looked at the contest, and quietly joined it. Nobody invited them. Nobody has managed to make them leave.',
  ],
};

export const FACTION_LORE = {
  dragon: {
    motto: 'Ash today, hoard tomorrow.',
    story: 'The Dragon Clan roosts in the Ember Peaks, where the Dragon Mother keeps the count of every egg and the Baron keeps the count of everything else. Dragons feel things enormously and forgive nothing, and they learned long ago that a rival’s ruin is the fastest way to a fuller hoard. That is the Ember: burn something down, and the clan finds you a new card in the ashes.',
    passiveLore: 'Ember: the first time each turn you destroy a rival’s card, the ashes hand you a new one.',
  },
  unicorn: {
    motto: 'Kindness, applied firmly.',
    story: 'The Unicorn Herd grazes the Glimmering Reach, a meadow that glows after dark because the Herd refuses to let it do otherwise. Unicorns are relentlessly nice about everything, including winning. When one of their loyal creatures falls, the whole meadow flares in answer. That is the Sparkle: grief, turned immediately into a fresh idea.',
    passiveLore: 'Sparkle: the first time each turn someone destroys one of your loyal creatures, the meadow flares and you draw.',
  },
  llama: {
    motto: 'Hum. Chew. Outlast.',
    story: 'The Llama Caravan pledges to no Peak and no Reach. They camp on the ridge above the Hollow, graze whatever grows, and treat both older sides as customers who have not paid yet. Llamas lose things constantly and never seem to lose. That is the Cud: whatever you make them put down, a llama has already chewed it into something useful.',
    passiveLore: 'Cud: the first time each turn you discard a card, you chew it over and draw a new one.',
  },
};

export const NEST_LORE = {
  title: 'The Nest',
  text: 'Eight dragon eggs, eight unicorn foals and, since the Caravan arrived, eight llama crias lie in the warm circle at the centre of the Hollow, and every keeper starts with one of their own. Babies never leave the valley: send one away and it simply toddles back to the Nest.',
};

// Keyed by battlefield id (client/src/preferences.js).
export const BATTLEFIELD_LORE = {
  'the-hollow': {
    tagline: 'The valley itself, awake',
    description: 'The whole Hollow at dusk: the Peaks smoking on one side, the Reach glittering on the other, and the Nest between them. Embers drift, the falls run, the sky ripples. This is what both sides are fighting over.',
  },
  'ancient-grove': {
    tagline: 'Where the first eggs were laid',
    description: 'The oldest ring in the Hollow, half swallowed by roots. Fireflies gather here every night, drawn to warmth nobody can find the source of.',
  },
  'ember-peaks': {
    tagline: 'The Dragon Clan’s doorstep',
    description: 'Lava scars the slopes below the Dragon Mother’s roost. Ash falls all year, and the unicorns who play here keep a scarf over their nose and their opinions to themselves.',
  },
  'moonlit-ruins': {
    tagline: 'A truce carved in stone, then abandoned',
    description: 'Once both sides met here to argue the rules of the contest. They never agreed, the roof fell in, and now snow drifts through the arches where the Old Word was first shouted.',
  },
  'celestial-observatory': {
    tagline: 'Where the Herd reads the sky',
    description: 'Unicorn scholars built the observatory to count the stars. They count them wrong on purpose so the auroras will keep coming back to correct them.',
  },
  'sunken-sanctum': {
    tagline: 'A flooded Nest from a forgotten season',
    description: 'Long ago the river changed its mind and took a whole hatching-ground with it. Bubbles still rise from the old stone circle, and sometimes something small and scaly rises with them.',
  },
  'clockwork-garden': {
    tagline: 'Built by dragons, tended by unicorns',
    description: 'A Gilded Wyvern hoarded gears until it had a garden. The Herd planted flowers in the works. Rain keeps everything turning, and neither side will admit it likes the result.',
  },
};

// Everything the client needs to translate, in one flat list.
export function loreStrings() {
  const out = [WORLD.title, WORLD.eyebrow, ...WORLD.paragraphs, NEST_LORE.title, NEST_LORE.text];
  for (const f of Object.values(FACTION_LORE)) out.push(f.motto, f.story, f.passiveLore);
  for (const b of Object.values(BATTLEFIELD_LORE)) out.push(b.tagline, b.description);
  return out;
}
