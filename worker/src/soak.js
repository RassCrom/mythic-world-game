// Bot-vs-bot soak test: plays whole games with the real engine and bots, and
// reports anything that should never happen — crashes, a game nobody can move,
// a game that never ends, a bot proposing an illegal move, a card in two
// places at once. It found the copier loop (Echo Llama ↔ Mirrormane) that
// locked a room forever.
//
//   npm run soak                       # 300 games, faction decks, mixed bots
//   npm run soak -- 1000 shared hard   # games, deck mode, bot difficulty
//   npm run balance                    # faction win rates, hard bots, shuffled seats
//   npm run balance -- 2000 shared     # games per table, deck mode
//
// Games are seeded, so a failure prints a seed that replays it exactly.

import { pathToFileURL } from 'node:url';
import { DEFS } from '../../shared/cards.js';
import * as E from './engine.js';
import { decideBotAction } from './bot.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const MAX_STEPS = 6000;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dispatch(g, pid, m) {
  switch (m.type) {
    case 'play': return E.playCard(g, pid, String(m.iid), m.targetPlayerId);
    case 'drawAction': return E.drawAction(g, pid);
    case 'pass': return E.passWindow(g, pid);
    case 'choose': return E.choose(g, pid, m.value === null ? null : m.value);
    default: return { error: 'unknown action' };
  }
}

// The same safe fallback the GameRoom uses when a bot's move is rejected.
function fallback(g, pid) {
  const pr = g.prompt;
  if (pr && pr.playerId === pid) {
    const value = pr.canSkip ? null
      : pr.kind === 'yesno' ? false
        : pr.kind === 'pickHand' ? pr.candidates.slice(0, pr.n || 1)
          : pr.kind === 'pickList' ? (pr.candidates[0]?.iid ?? pr.candidates[0])
            : pr.candidates[0];
    return E.choose(g, pid, value);
  }
  if (g.window && g.window.awaiting.includes(pid)) return E.passWindow(g, pid);
  return E.drawAction(g, pid);
}

function zoneProblems(g) {
  const zones = [
    ...g.deck, ...Object.values(g.piles || {}).flat(), ...g.discard, ...g.nest,
    ...g.players.flatMap((p) => [...p.hand, ...p.stable]), ...g.chain.map((c) => c.iid),
  ];
  const seen = new Set(zones);
  const problems = [];
  if (seen.size !== zones.length) problems.push(`${zones.length - seen.size} card(s) in two places`);
  // Cards on the chain or mid-effect are in flight; only a settled game must account for every card.
  if (g.status === 'ended' || (!g.effects.length && !g.chain.length && !g.prompt)) {
    const lost = Object.keys(g.inst).filter((iid) => !seen.has(iid));
    if (lost.length) problems.push(`lost ${lost.map((iid) => g.inst[iid]).join(', ')}`);
  }
  for (const [f, pile] of Object.entries(g.piles || {})) {
    const strays = pile.filter((iid) => DEFS[g.inst[iid]].faction !== f);
    if (strays.length) problems.push(`${strays.length} foreign card(s) in the ${f} pile`);
  }
  return problems;
}

export function playOneGame({ seed, seats, deckMode, difficulty }) {
  const realRandom = Math.random;
  Math.random = mulberry32(seed);
  const result = { seed, seats, deckMode, problems: [], botErrors: [], winnerFaction: null, turns: 0, factions: [] };
  try {
    const g = E.createGame('SOAK');
    g.settings.deckMode = deckMode;
    const host = E.addPlayer(g, { token: 'host', name: 'Host' }).playerId;
    for (let i = 1; i < seats; i++) {
      const add = E.addBotPlayer(g, host, difficulty || DIFFICULTIES[(seed + i) % 3]);
      if (add.error) throw new Error(add.error);
    }
    // The host plays as a bot too.
    Object.assign(g.players[0], { isBot: true, difficulty: difficulty || 'hard' });
    const started = E.startGame(g, host);
    if (started.error) throw new Error(started.error);
    result.factions = g.players.map((p) => p.faction);

    let steps = 0;
    while (g.status === 'playing' && steps++ < MAX_STEPS) {
      const bid = E.botWaitingId(g);
      if (!bid) { result.problems.push('stuck: nobody can move'); break; }
      const bot = g.players.find((p) => p.id === bid);
      const action = decideBotAction(E.viewFor(g, bid), bot.difficulty);
      let res = action ? dispatch(g, bid, action) : { error: 'no action' };
      if (res && res.error) {
        result.botErrors.push(`${action?.type || 'none'}: ${res.error}`);
        res = fallback(g, bid);
        if (res && res.error) { result.problems.push(`wedged: ${res.error}`); break; }
      }
      for (const p of zoneProblems(g)) result.problems.push(`step ${steps}: ${p}`);
      if (result.problems.length) break;
    }
    if (g.status === 'playing' && !result.problems.length) {
      result.problems.push(`never ended (${MAX_STEPS} steps): ${g.log.slice(-3).map((l) => l.msg).join(' / ')}`);
    }
    result.turns = g.turnSeq;
    result.winnerFaction = g.players.find((p) => p.id === g.winnerId)?.faction ?? null;
  } catch (error) {
    result.problems.push(`crash: ${error.stack.split('\n').slice(0, 3).join(' | ')}`);
  } finally {
    Math.random = realRandom;
  }
  return result;
}

export function runSoak({ games = 300, deckMode = 'faction', difficulty, firstSeed = 1 } = {}) {
  const summary = { games, deckMode, failures: [], botErrors: {}, wins: {}, seats: {}, turns: [] };
  for (let n = 0; n < games; n++) {
    const seed = firstSeed + n;
    const r = playOneGame({ seed, seats: 2 + (n % 7), deckMode, difficulty });
    if (r.problems.length) summary.failures.push({ seed, seats: r.seats, problems: r.problems });
    for (const e of r.botErrors) summary.botErrors[e] = (summary.botErrors[e] || 0) + 1;
    if (r.winnerFaction) summary.wins[r.winnerFaction] = (summary.wins[r.winnerFaction] || 0) + 1;
    for (const f of r.factions) summary.seats[f] = (summary.seats[f] || 0) + 1;
    summary.turns.push(r.turns);
  }
  return summary;
}

// One table with fixed factions, every seat a hard bot, seating shuffled each
// game so no faction always goes first. For balance work: a fair faction wins
// 1/seats of the time per seat.
export function runTable({ games = 600, deckMode = 'faction', factions, firstSeed = 1 }) {
  const wins = {};
  const failures = [];
  const realRandom = Math.random;
  for (let n = 0; n < games; n++) {
    const seed = firstSeed + n;
    Math.random = mulberry32(seed);
    try {
      const order = [...factions];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const g = E.createGame('BAL');
      g.settings.deckMode = deckMode;
      const ids = order.map((_, i) => E.addPlayer(g, { token: 't' + i, name: 'P' + i }).playerId);
      g.players.forEach((p, i) => Object.assign(p, { faction: order[i], isBot: true, difficulty: 'hard' }));
      const started = E.startGame(g, ids[0]);
      if (started.error) throw new Error(started.error);
      let steps = 0;
      while (g.status === 'playing' && steps++ < MAX_STEPS) {
        const bid = E.botWaitingId(g);
        if (!bid) break;
        const res = dispatch(g, bid, decideBotAction(E.viewFor(g, bid), 'hard') || { type: 'none' });
        if (res && res.error && fallback(g, bid)?.error) break;
      }
      const winner = g.players.find((p) => p.id === g.winnerId);
      if (winner) wins[winner.faction] = (wins[winner.faction] || 0) + 1;
      else failures.push(seed);
    } finally {
      Math.random = realRandom;
    }
  }
  const seatsOf = (f) => factions.filter((x) => x === f).length;
  const rates = Object.fromEntries([...new Set(factions)].map((f) => [f, (wins[f] || 0) / (games * seatsOf(f))]));
  return { games, factions, fair: 1 / factions.length, rates, failures };
}

export const BALANCE_TABLES = [
  ['dragon', 'unicorn'], ['dragon', 'llama'], ['unicorn', 'llama'],
  ['dragon', 'unicorn', 'llama'],
  ['dragon', 'dragon', 'unicorn', 'unicorn', 'llama', 'llama'],
];

// Win share per seat, so factions with more keepers at the table don't look stronger.
export function winRates(summary) {
  return Object.fromEntries(Object.keys(summary.seats).map((f) => [f, (summary.wins[f] || 0) / summary.seats[f]]));
}

function printBalance(games, deckMode) {
  console.log(`Balance · ${games} games per table · ${deckMode} decks · hard bots · seats shuffled`);
  for (const factions of BALANCE_TABLES) {
    const r = runTable({ games, deckMode, factions });
    const cells = Object.entries(r.rates).map(([f, rate]) => {
      const off = (rate - r.fair) * 100;
      return `${f} ${(rate * 100).toFixed(1)}% (${off >= 0 ? '+' : ''}${off.toFixed(1)})`;
    });
    console.log(`  ${factions.join(' ').padEnd(44)} fair ${(r.fair * 100).toFixed(1)}%  ·  ${cells.join('  ')}`);
  }
  console.log('Differences under ~3 points are noise at 600 games; bots also play some cards worse than people do.');
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href && process.argv[2] === 'balance') {
  const [, games = '600', deckMode = 'faction'] = process.argv.slice(2);
  printBalance(Number(games), deckMode);
} else if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [games = '300', deckMode = 'faction', difficulty] = process.argv.slice(2);
  const s = runSoak({ games: Number(games), deckMode, difficulty });
  const turns = [...s.turns].sort((a, b) => a - b);
  console.log(`${games} games · ${deckMode} decks · ${difficulty || 'mixed'} bots`);
  console.log(`turns: median ${turns[turns.length >> 1]}, max ${turns.at(-1)}`);
  for (const [f, rate] of Object.entries(winRates(s))) {
    console.log(`  ${f.padEnd(8)} won ${String(s.wins[f] || 0).padStart(4)} of ${String(s.seats[f]).padStart(4)} seats  ${(rate * 100).toFixed(1)}%`);
  }
  for (const [e, n] of Object.entries(s.botErrors)) console.log(`bot error ×${n}: ${e}`);
  for (const f of s.failures) console.log(`FAIL seed ${f.seed} (${f.seats} seats): ${f.problems.join('; ')}`);
  process.exitCode = s.failures.length ? 1 : 0;
}
