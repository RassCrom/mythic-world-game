import { DEFS, buildDeckList } from '../../../shared/cards.js';

export const STORAGE_KEY = 'ud_card_studio_data_v1';

export const CARD_TYPES = [
  { id: 'baby', label: 'Baby Dragon', icon: '🐣', color: '#e8905a' },
  { id: 'basic', label: 'Basic Dragon', icon: '🐉', color: '#27ae60' },
  { id: 'magical', label: 'Magical Dragon', icon: '✨', color: '#7d3c98' },
  { id: 'upgrade', label: 'Upgrade', icon: '🛡️', color: '#f5b041' },
  { id: 'downgrade', label: 'Downgrade', icon: '⛓️', color: '#6e2c00' },
  { id: 'magic', label: 'Magic Spell', icon: '📜', color: '#1e8449' },
  { id: 'instant', label: 'Instant (Roar)', icon: '⚡', color: '#c0392b' },
];

export const DEV_STATUSES = [
  { id: 'active', label: 'Active in Game', color: '#27ae60', bg: 'rgba(39, 174, 96, 0.15)' },
  { id: 'balanced', label: 'Balanced', color: '#2980b9', bg: 'rgba(41, 128, 185, 0.15)' },
  { id: 'testing', label: 'Playtesting', color: '#f39c12', bg: 'rgba(243, 156, 18, 0.15)' },
  { id: 'draft', label: 'First Draft', color: '#8e44ad', bg: 'rgba(142, 68, 173, 0.15)' },
  { id: 'archived', label: 'Archived / Cut', color: '#7f8c8d', bg: 'rgba(127, 140, 141, 0.15)' },
];

export const DEFAULT_FACTIONS = [
  {
    id: 'pyre',
    name: 'Pyre Clan',
    icon: '🔥',
    color: '#c0392b',
    description: 'Fierce and aggressive dragons that ignite chaos, sacrifice their own for bursts of destructive power, and burn down opposing stables.',
    playstyle: 'Aggro / High Tempo / Destruction',
    mechanics: ['destroy', 'sacrifice', 'tempo'],
    tier: 'Core Faction',
    notes: 'Signature dragons: Crimson Drake, Phoenix Dragon, Spiteclaw Dragon, Baron Dragon.',
  },
  {
    id: 'abyssal',
    name: 'Abyssal Tide',
    icon: '🌊',
    color: '#2e86c1',
    description: 'Aquatic and aerial wyverns mastering hand disruption, tidal bounces, and surgical card manipulation.',
    playstyle: 'Control / Hand Advantage / Bounces',
    mechanics: ['return', 'steal', 'disruption', 'wyvern'],
    tier: 'Core Faction',
    notes: 'Signature dragons: Azure Drake, Tidal Dragon, Razorfin Wyvern, Torpedo Wyvern.',
  },
  {
    id: 'verdant',
    name: 'Verdant Canopy',
    icon: '🍃',
    color: '#27ae60',
    description: 'Nature-bound guardians of the Nest who flourish through dragon swarming, continuous draws, and life regeneration.',
    playstyle: 'Ramp / Swarm / Nest Synergy',
    mechanics: ['draw', 'nest', 'swarm'],
    tier: 'Core Faction',
    notes: 'Signature dragons: Verdant Drake, Harvest Dragon, Seraph Dragon, Pest Drake.',
  },
  {
    id: 'gilded',
    name: 'Gilded Hoard',
    icon: '🪙',
    color: '#d4ac0d',
    description: 'Greedy hoarders who covet shiny upgrades, search the deck for prized artifacts, and steal valuables from other stables.',
    playstyle: 'Tutor / Upgrades / Economy',
    mechanics: ['searchDeck', 'stealUpgrade', 'extraAction'],
    tier: 'Core Faction',
    notes: 'Signature dragons: Gilded Drake, Hoardwing, Gilded Wyvern, Alluring Wyvern.',
  },
  {
    id: 'shadow',
    name: 'Shadow Brood',
    icon: '💀',
    color: '#6c3483',
    description: 'Dark necromantic dragons mastering graveyard reanimation, crippling downgrades, toad curses, and spiteful retribution.',
    playstyle: 'Graveyard Reanimation / Debuffs / Curses',
    mechanics: ['reanimate', 'downgrade', 'curses', 'onLeave'],
    tier: 'Core Faction',
    notes: 'Signature dragons: Obsidian Drake, Bonescale Dragon, Cataclysm Dragon, Toadcurse.',
  },
  {
    id: 'astral',
    name: 'Astral Ascendants',
    icon: '✨',
    color: '#f39c12',
    description: 'Celestial protectors and spellscale wards who prevent destruction, grant uncounterable plays, and bring divine order.',
    playstyle: 'Protective / Spell Wards / Defense',
    mechanics: ['protection', 'uncounterable', 'ward', 'guardian'],
    tier: 'Core Faction',
    notes: 'Signature dragons: Ivory Drake, Spellscale Whelp, Guardian Dragon, Queen Dragon, Ancient Sigil.',
  },
  {
    id: 'chrono',
    name: 'Chrono & Rift',
    icon: '⏳',
    color: '#16a085',
    description: 'Temporal wyrms and rift weavers that alter turn direction, copy mystical abilities, and twist the flow of fate.',
    playstyle: 'Combo / Turn Warping / Ability Copy',
    mechanics: ['reverseTurnOrder', 'copyEntrance', 'swapDragon', 'tradeHands'],
    tier: 'Exotic Faction',
    notes: 'Signature dragons: Chronodrake, Mirrorwing Dragon, Riftcoil Dragon, Twist of Fate.',
  },
  {
    id: 'unicorn',
    name: 'Unicorn Herd',
    icon: '🦄',
    color: '#e91e9c',
    description: 'Magical unicorn-dragon hybrids channeling prismatic energy, healing allies, purifying curses, and projecting dazzling rainbow barriers that dazzle foes.',
    playstyle: 'Heal / Purify / Shield / Midrange',
    mechanics: ['purify', 'heal', 'shield', 'rainbowBarrier'],
    tier: 'Expansion Faction',
    notes: 'Future expansion faction. Signature mechanic: purify downgrades without sacrificing, protect stables with rainbow shields.',
  },
  {
    id: 'feral',
    name: 'Feral Pack',
    icon: '🐺',
    color: '#795548',
    description: 'Wild beast-dragon hybrids that hunt in coordinated packs, multiplying their strength with each additional dragon and overwhelming stables through sheer numbers.',
    playstyle: 'Pack Synergy / Swarm Aggro / Tribal',
    mechanics: ['packBonus', 'swarm', 'tribal', 'hunt'],
    tier: 'Expansion Faction',
    notes: 'Future expansion faction. Signature mechanic: dragons get stronger for each other dragon of same faction in your stable.',
  },
  {
    id: 'neutral',
    name: 'Unaligned / Arcana',
    icon: '⚙️',
    color: '#7f8c8d',
    description: 'Universal dragon nestlings, standard Roar counters, and versatile elemental spells shared across all dragon keepers.',
    playstyle: 'Universal Utility / Counterplay',
    mechanics: ['instant', 'utility', 'baby'],
    tier: 'Universal',
    notes: 'Baby Dragon, Roar!, Primordial Roar, Wing Gust, Arcane Maelstrom, Clean Slate.',
  },
];

// Map existing cards to appropriate draft factions
export const INITIAL_CARD_FACTIONS = {
  // Baby
  baby_dragon: 'neutral',

  // Basics
  basic_crimson: 'pyre',
  basic_azure: 'abyssal',
  basic_verdant: 'verdant',
  basic_gilded: 'gilded',
  basic_obsidian: 'shadow',
  basic_ivory: 'astral',

  // Magical Dragons
  m_battering: 'pyre',
  m_cataclysm: 'shadow',
  m_spellscale: 'astral',
  m_ironclaw: 'gilded',
  m_harvest: 'verdant',
  m_phoenix: 'pyre',
  m_colossal: 'pyre',
  m_stormwing: 'abyssal',
  m_galewing: 'abyssal',
  m_hoardwing: 'gilded',
  m_baron: 'pyre',
  m_bonescale: 'shadow',
  m_alluring: 'gilded',
  m_enchanting: 'gilded',
  m_queen: 'astral',
  m_guardian: 'astral',
  m_elder: 'abyssal',
  m_gilded_wyv: 'gilded',
  m_scrappy: 'shadow',
  m_razorfin: 'abyssal',
  m_torpedo: 'abyssal',
  m_spiteclaw: 'pyre',
  m_stray: 'neutral',
  m_seraph: 'verdant',
  m_tidal: 'abyssal',
  m_nagging: 'pyre',
  m_pest: 'verdant',
  m_chronodrake: 'chrono',
  m_mirrorwing: 'chrono',
  m_riftcoil: 'chrono',
  m_hydra: 'verdant',
  m_volcanic: 'pyre',

  // Upgrades
  u_sigil: 'astral',
  u_armor: 'astral',
  u_tail: 'verdant',
  u_keg: 'pyre',
  u_twinheads: 'chrono',
  u_snare: 'gilded',

  // Downgrades
  d_cage: 'shadow',
  d_fog: 'abyssal',
  d_lair: 'shadow',
  d_orb: 'chrono',
  d_toadcurse: 'shadow',
  d_tithe: 'shadow',
  d_chains: 'astral',
  d_cave: 'shadow',

  // Spells
  s_venom: 'shadow',
  s_tailswipe: 'abyssal',
  s_claws: 'gilded',
  s_fate: 'chrono',
  s_gust: 'abyssal',
  s_lucky: 'gilded',
  s_maelstrom: 'abyssal',
  s_shift: 'chrono',
  s_slate: 'astral',
  s_molt: 'verdant',
  s_bargain: 'pyre',
  s_trade: 'chrono',

  // Instants
  i_roar: 'neutral',
  i_primordial: 'pyre',
};

// Generate default studio state from base game definitions
export function getDefaultStudioData() {
  const cards = {};

  for (const [id, def] of Object.entries(DEFS)) {
    const faction = INITIAL_CARD_FACTIONS[id] || 'neutral';
    cards[id] = {
      ...def,
      faction,
      status: 'active',
      powerRating: def.type === 'baby' ? 2 : def.type === 'basic' ? 2 : 4,
      complexity: def.type === 'basic' || def.type === 'baby' ? 'low' : def.type === 'magical' ? 'medium' : 'high',
      devNotes: `Core Unstable Dragons card.`,
      tags: extractMechanicTags(def),
      changelog: [
        { date: '2026-08-24', note: 'Imported core card definition' },
      ],
    };
  }

  return {
    version: 1,
    factions: DEFAULT_FACTIONS,
    cards,
    draftCards: {},
    settings: {
      autoSave: true,
      lastModified: new Date().toISOString(),
    },
  };
}

export function extractMechanicTags(def) {
  const tags = new Set();
  const text = (def.text || '').toUpperCase();

  if (text.includes('DESTROY')) tags.add('Destroy');
  if (text.includes('SACRIFICE')) tags.add('Sacrifice');
  if (text.includes('STEAL')) tags.add('Steal');
  if (text.includes('DRAW')) tags.add('Draw');
  if (text.includes('DISCARD')) tags.add('Discard');
  if (text.includes('STOP') || def.type === 'instant') tags.add('Counter');
  if (text.includes('NEST') || def.type === 'baby') tags.add('Nest');
  if (text.includes('UPGRADE')) tags.add('Upgrade');
  if (text.includes('DOWNGRADE')) tags.add('Downgrade');
  if (text.includes('RETURN')) tags.add('Bounce');
  if (def.uncounterable) tags.add('Uncounterable');
  if (def.guardian) tags.add('Guardian');
  if (def.protected || def.noMagicDestroy) tags.add('Protected');
  if (def.sub === 'wyvern') tags.add('Wyvern');
  if (def.onTurnStart) tags.add('Turn Start Trigger');
  if (def.onEnter) tags.add('Enter Trigger');
  if (def.onLeave) tags.add('Leave Trigger');
  if (def.mods) tags.add('Continuous Effect');

  return Array.from(tags);
}

export function loadStudioData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStudioData();
    const data = JSON.parse(raw);
    if (!data.cards || !data.factions) return getDefaultStudioData();
    return data;
  } catch (err) {
    console.error('Failed to load card studio data from localStorage:', err);
    return getDefaultStudioData();
  }
}

export function saveStudioData(data) {
  try {
    const updated = {
      ...data,
      settings: {
        ...data.settings,
        lastModified: new Date().toISOString(),
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save card studio data:', err);
    return false;
  }
}

export function resetStudioData() {
  const defaults = getDefaultStudioData();
  saveStudioData(defaults);
  return defaults;
}

// Compute deck balance, curves, and health metrics
export function computeDeckAnalytics(cardsMap, factionsList) {
  const cards = Object.values(cardsMap);
  let totalCardsInDeck = 0;
  let uniqueCardsCount = cards.length;
  let babyCount = 0;

  const typeCounts = {
    baby: 0,
    basic: 0,
    magical: 0,
    upgrade: 0,
    downgrade: 0,
    magic: 0,
    instant: 0,
  };

  const factionCounts = {};
  factionsList.forEach((f) => { factionCounts[f.id] = { unique: 0, total: 0 }; });

  const statusCounts = {
    active: 0,
    balanced: 0,
    testing: 0,
    draft: 0,
    archived: 0,
  };

  const mechanicCounts = {
    Destroy: 0,
    Sacrifice: 0,
    Steal: 0,
    Draw: 0,
    Discard: 0,
    Counter: 0,
    Nest: 0,
    Bounce: 0,
    Uncounterable: 0,
    Protected: 0,
  };

  const warnings = [];

  cards.forEach((c) => {
    const qty = Number(c.qty) || 1;
    if (c.type === 'baby') {
      babyCount += qty;
    } else if (c.status !== 'archived') {
      totalCardsInDeck += qty;
    }

    if (typeCounts[c.type] != null) {
      typeCounts[c.type] += (c.status !== 'archived' ? qty : 0);
    }

    const factionKey = c.faction || 'neutral';
    if (!factionCounts[factionKey]) {
      factionCounts[factionKey] = { unique: 0, total: 0 };
    }
    factionCounts[factionKey].unique += 1;
    if (c.status !== 'archived') {
      factionCounts[factionKey].total += qty;
    }

    if (statusCounts[c.status] != null) {
      statusCounts[c.status] += 1;
    }

    const tags = c.tags || extractMechanicTags(c);
    tags.forEach((tag) => {
      if (mechanicCounts[tag] != null && c.status !== 'archived') {
        mechanicCounts[tag] += qty;
      }
    });

    // Health Checks
    if (!c.name || !c.name.trim()) {
      warnings.push({ level: 'error', cardId: c.id, message: `Card ${c.id} has no name.` });
    }
    if (!c.text || !c.text.trim()) {
      warnings.push({ level: 'warning', cardId: c.id, message: `Card "${c.name || c.id}" has empty rules text.` });
    }
    if (!c.faction) {
      warnings.push({ level: 'info', cardId: c.id, message: `Card "${c.name || c.id}" has no assigned faction.` });
    }
  });

  return {
    totalCardsInDeck,
    uniqueCardsCount,
    babyCount,
    typeCounts,
    factionCounts,
    statusCounts,
    mechanicCounts,
    warnings,
  };
}

// Generate production-ready ES Module code for shared/cards.js
export function generateCardsJsExport(cardsMap, factionsList) {
  const cards = Object.values(cardsMap);
  const now = new Date().toLocaleDateString();

  let code = `// ==================================================================\n`;
  code += `// Unstable Dragons — Card Database (Generated from Card Studio)\n`;
  code += `// Export Date: ${now}\n`;
  code += `// Total Unique Cards: ${cards.length}\n`;
  code += `// ==================================================================\n\n`;

  code += `export const BABY_ID = 'baby_dragon';\n`;
  code += `export const BABY_COUNT = ${cardsMap['baby_dragon']?.qty || 13};\n\n`;

  code += `export const FACTIONS = ${JSON.stringify(factionsList, null, 2)};\n\n`;

  code += `const D = {};\n\n`;
  code += `function def(card) {\n  D[card.id] = card;\n}\n\n`;

  const types = ['baby', 'basic', 'magical', 'upgrade', 'downgrade', 'magic', 'instant'];

  types.forEach((type) => {
    const group = cards.filter((c) => c.type === type);
    if (!group.length) return;

    code += `/* ------------------------------------------------------------------ */\n`;
    code += `/* ${type.toUpperCase()} CARDS (${group.length}) */\n`;
    code += `/* ------------------------------------------------------------------ */\n\n`;

    group.forEach((card) => {
      const clean = { ...card };
      // Strip UI/Studio only props for clean game engine payload
      delete clean.status;
      delete clean.powerRating;
      delete clean.complexity;
      delete clean.devNotes;
      delete clean.tags;
      delete clean.changelog;

      code += `def(${JSON.stringify(clean, null, 2)});\n\n`;
    });
  });

  code += `/* ------------------------------------------------------------------ */\n\n`;
  code += `export const DEFS = D;\n\n`;
  code += `export function isDragonType(type) {\n  return type === 'baby' || type === 'basic' || type === 'magical';\n}\n\n`;
  code += `export function buildDeckList() {\n  const list = [];\n  for (const card of Object.values(D)) {\n    if (card.type === 'baby') continue;\n    for (let i = 0; i < card.qty; i++) list.push(card.id);\n  }\n  return list;\n}\n`;

  return code;
}

// Generate Markdown design sheet for cards & factions
export function generateMarkdownSpec(cardsMap, factionsList) {
  const cards = Object.values(cardsMap);
  const analytics = computeDeckAnalytics(cardsMap, factionsList);

  let md = `# Unstable Dragons - Card & Faction Design Specification\n\n`;
  md += `*Generated by Developer Studio on ${new Date().toLocaleString()}*\n\n`;

  md += `## 1. Deck Overview & Composition\n\n`;
  md += `- **Total Draw Deck Size:** ${analytics.totalCardsInDeck} cards\n`;
  md += `- **Nest Baby Dragons:** ${analytics.babyCount} cards\n`;
  md += `- **Unique Card Definitions:** ${analytics.uniqueCardsCount}\n\n`;

  md += `### Card Type Breakdown\n\n`;
  md += `| Type | Quantity in Deck |\n| :--- | :--- |\n`;
  Object.entries(analytics.typeCounts).forEach(([type, count]) => {
    md += `| **${type.toUpperCase()}** | ${count} |\n`;
  });

  md += `\n## 2. Factions Roster\n\n`;
  factionsList.forEach((f) => {
    const stats = analytics.factionCounts[f.id] || { unique: 0, total: 0 };
    md += `### ${f.icon} ${f.name} (${f.tier || 'Faction'})\n`;
    md += `- **Theme Color:** \`${f.color}\`\n`;
    md += `- **Playstyle Archetype:** ${f.playstyle}\n`;
    md += `- **Key Mechanics:** ${f.mechanics?.join(', ') || 'N/A'}\n`;
    md += `- **Cards Assigned:** ${stats.unique} unique (${stats.total} total in deck)\n`;
    md += `- **Description:** ${f.description}\n\n`;
  });

  md += `## 3. Card Catalog\n\n`;
  md += `| ID | Name | Type | Faction | Qty | Rules Text | Status |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  cards.sort((a, b) => (a.type || '').localeCompare(b.type || '') || (a.name || '').localeCompare(b.name || '')).forEach((c) => {
    const faction = factionsList.find((f) => f.id === c.faction)?.name || c.faction || 'Neutral';
    const textEscaped = (c.text || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    md += `| \`${c.id}\` | **${c.name}** | ${c.type} | ${faction} | ${c.qty} | ${textEscaped} | \`${c.status || 'active'}\` |\n`;
  });

  return md;
}
