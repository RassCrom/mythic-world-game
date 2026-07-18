// Unstable Dragons — authoritative game engine.
// Runs inside the GameRoom Durable Object. All state is a plain serializable
// object so it survives Durable Object hibernation/restarts via storage.
//
// Interaction model: effects run on a serializable "frame stack" VM. When a
// step needs a player decision it sets game.prompt and pauses; the answer is
// fed back in and execution resumes. pump() is the single scheduler that
// advances effects, the instant-response chain, and the turn flow.

import { DEFS, BABY_ID, buildDeckList, isDragonType } from '../../shared/cards.js';

export const HAND_LIMIT = 7;
export const START_HAND = 5;
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
export const TURN_TIME_MS = 60_000;

/* ================================================================== */
/* Construction                                                        */
/* ================================================================== */

export function createGame(code) {
  return {
    code,
    status: 'lobby', // lobby | playing | ended
    hostId: null,
    players: [], // { id, token, name, seat, connected, hand:[], stable:[] }
    inst: {}, // instId -> defId
    deck: [],
    discard: [],
    nest: [],
    turn: null,
    chain: [],
    window: null,
    effects: [],
    prompt: null,
    log: [],
    seq: 0,
    reshuffles: 0,
    winnerId: null,
    endReason: null,
    playSeq: 0,
    lastPlayed: null,
  };
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let logSound = null;
export function addLog(g, msg, sound, meta) {
  g.seq++;
  g.log.push({
    ...(meta && typeof meta === 'object' ? meta : {}),
    n: g.seq,
    msg,
    sound: sound || logSound || undefined,
  });
  if (g.log.length > 200) g.log.splice(0, g.log.length - 200);
}

export function addPlayer(g, { token, name }) {
  const existing = g.players.find((p) => p.token === token);
  if (existing) {
    existing.connected = true;
    if (name) existing.name = sanitizeName(name) || existing.name;
    return { playerId: existing.id, reconnected: true };
  }
  if (g.status !== 'lobby') return { error: 'Game already started. Only seated players can rejoin.' };
  if (g.players.length >= MAX_PLAYERS) return { error: 'Room is full (8 players max).' };
  const id = 'p' + (g.players.length + 1) + '_' + Math.random().toString(36).slice(2, 7);
  const p = {
    id, token,
    name: sanitizeName(name) || 'Dragon ' + (g.players.length + 1),
    seat: g.players.length,
    connected: true,
    hand: [],
    stable: [],
  };
  g.players.push(p);
  if (!g.hostId) g.hostId = id;
  addLog(g, `${p.name} joined the room.`);
  return { playerId: id, reconnected: false };
}

const BOT_NAMES = ['Cinder', 'Soot', 'Scoria', 'Gnarl', 'Vesper', 'Krakk', 'Nyx'];

export function addBotPlayer(g, byPid, difficulty) {
  if (byPid !== g.hostId) return { error: 'Only the host can add bots.' };
  if (g.status !== 'lobby') return { error: 'Bots can only be added in the lobby.' };
  if (g.players.length >= MAX_PLAYERS) return { error: 'Room is full (8 players max).' };
  if (!['easy', 'medium', 'hard'].includes(difficulty)) return { error: 'Unknown difficulty.' };
  const used = new Set(g.players.map((p) => p.name));
  const name = BOT_NAMES.find((n) => !used.has(n)) || 'Automaton';
  const id = 'bot' + (g.players.length + 1) + '_' + Math.random().toString(36).slice(2, 7);
  g.players.push({
    id, token: 'bot:' + id, name,
    seat: g.players.length,
    connected: true, isBot: true, difficulty,
    hand: [], stable: [],
  });
  addLog(g, `${name} the automaton (${difficulty}) joined the room.`);
  return { playerId: id };
}

export function removeBotPlayer(g, byPid, botId) {
  if (byPid !== g.hostId) return { error: 'Only the host can remove bots.' };
  if (g.status !== 'lobby') return { error: 'Bots can only be removed in the lobby.' };
  const bot = byId(g, botId);
  if (!bot || !bot.isBot) return { error: 'That is not a bot.' };
  g.players = g.players.filter((p) => p.id !== botId);
  g.players.forEach((p, i) => (p.seat = i));
  addLog(g, `${bot.name} the automaton was dismissed.`);
  return {};
}

// If the game is waiting on a bot (its turn action, a prompt aimed at it, or
// an open response window that includes it), return that bot's id.
export function botWaitingId(g) {
  if (!g || g.status !== 'playing') return null;
  if (g.prompt) {
    const p = byId(g, g.prompt.playerId);
    return p && p.isBot ? p.id : null;
  }
  if (g.window) {
    const b = g.window.awaiting.map((x) => byId(g, x)).find((p) => p && p.isBot);
    return b ? b.id : null;
  }
  if (!g.effects.length && !g.chain.length && g.turn &&
      g.turn.phase === 'action' && g.turn.actions > 0 && current(g).isBot) {
    return current(g).id;
  }
  return null;
}

function sanitizeName(name) {
  return String(name || '').replace(/[^\w \-'.!?]/g, '').trim().slice(0, 20);
}

export function markDisconnected(g, playerId) {
  const p = byId(g, playerId);
  if (!p) return;
  p.connected = false;
  if (g.status === 'lobby') {
    // In the lobby, free the seat entirely (they can rejoin with the same code).
    g.players = g.players.filter((x) => x.id !== playerId);
    g.players.forEach((x, i) => (x.seat = i));
    if (g.hostId === playerId) g.hostId = g.players[0] ? g.players[0].id : null;
    addLog(g, `${p.name} left the lobby.`);
  } else {
    addLog(g, `${p.name} disconnected. Their seat is saved.`);
  }
}

export function markConnected(g, playerId) {
  const p = byId(g, playerId);
  if (p) p.connected = true;
}

/* ================================================================== */
/* Helpers                                                             */
/* ================================================================== */

function byId(g, pid) { return g.players.find((p) => p.id === pid); }
function defOf(g, iid) { return DEFS[g.inst[iid]]; }
function ownerOf(g, iid) { return g.players.find((p) => p.stable.includes(iid) || p.hand.includes(iid)); }
function stableOwner(g, iid) { return g.players.find((p) => p.stable.includes(iid)); }
function current(g) { return g.players[g.turn.idx]; }
function cardName(g, iid) { return defOf(g, iid).name; }

function stableOf(g, pid, pred) {
  const p = byId(g, pid);
  return p.stable.filter((iid) => (pred ? pred(defOf(g, iid), iid) : true));
}

// Fog suppresses magical-dragon abilities in that stable.
function abilitiesActive(g, iid) {
  const d = defOf(g, iid);
  if (d.type !== 'magical') return true;
  const owner = stableOwner(g, iid);
  if (!owner) return true;
  return !rawMods(g, owner.id).has('suppress');
}

// Mods contributed by attached upgrades/downgrades only (never suppressed).
function rawMods(g, pid) {
  const set = new Set();
  for (const iid of byId(g, pid).stable) {
    const d = defOf(g, iid);
    if ((d.type === 'upgrade' || d.type === 'downgrade') && d.mods) d.mods.forEach((m) => set.add(m));
  }
  return set;
}

// Full mod set including magical-dragon passives (respecting Fog suppression).
export function playerMods(g, pid) {
  const set = rawMods(g, pid);
  for (const iid of byId(g, pid).stable) {
    const d = defOf(g, iid);
    if (d.type === 'magical' && d.mods && abilitiesActive(g, iid)) d.mods.forEach((m) => set.add(m));
  }
  if (set.has('noInstantsSelf')) set.add('noInstants');
  return set;
}

function cageCount(g, pid) {
  return stableOf(g, pid, (d) => d.id === 'd_cage').length;
}

// Is this stable card a Dragon for targeting purposes? (Toadcurse makes them Toads.)
function isDragonCard(g, iid) {
  const d = defOf(g, iid);
  if (!isDragonType(d.type)) return false;
  const owner = stableOwner(g, iid);
  if (owner && rawMods(g, owner.id).has('toads')) return false;
  return true;
}

export function dragonCount(g, pid) {
  let n = 0;
  for (const iid of byId(g, pid).stable) {
    if (!isDragonCard(g, iid)) continue;
    const d = defOf(g, iid);
    n += d.countsAs === 2 && abilitiesActive(g, iid) ? 2 : 1;
  }
  return n;
}

export function winThreshold(g) { return g.players.length >= 6 ? 6 : 7; }

function checkWin(g) {
  if (g.status !== 'playing') return;
  const need = winThreshold(g);
  const order = turnOrderFrom(g, current(g).id);
  for (const pid of order) {
    if (dragonCount(g, pid) >= need) {
      endGame(g, pid, `${byId(g, pid).name} gathered ${need} Dragons and wins!`);
      return;
    }
  }
}

function endGame(g, winnerId, msg) {
  g.status = 'ended';
  g.winnerId = winnerId;
  g.endReason = msg;
  g.prompt = null;
  g.window = null;
  addLog(g, msg, 'win');
}

function turnOrderFrom(g, startPid) {
  const start = g.players.findIndex((p) => p.id === startPid);
  const out = [];
  for (let i = 0; i < g.players.length; i++) out.push(g.players[(start + i) % g.players.length].id);
  return out;
}

/* ================================================================== */
/* Draw / discard / reshuffle                                          */
/* ================================================================== */

function reshuffleDiscardIntoDeck(g, countsTowardLimit) {
  if (!g.discard.length) return false;
  g.deck.push(...g.discard.splice(0));
  shuffle(g.deck);
  if (countsTowardLimit) {
    g.reshuffles++;
    addLog(g, `The deck ran out — discard pile shuffled in (${g.reshuffles}/2).`, 'shuffle');
    if (g.reshuffles >= 2) {
      endByDeckOut(g);
      return true;
    }
  } else {
    addLog(g, 'The discard pile was shuffled into the deck.', 'shuffle');
  }
  return true;
}

function endByDeckOut(g) {
  let best = -1;
  let winner = null;
  for (const pid of turnOrderFrom(g, current(g).id)) {
    const n = dragonCount(g, pid);
    if (n > best) { best = n; winner = pid; }
  }
  endGame(g, winner, `The deck ran out twice — ${byId(g, winner).name} wins with the most Dragons (${best}).`);
}

function drawCards(g, pid, n, quiet) {
  const p = byId(g, pid);
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (!g.deck.length) {
      if (!reshuffleDiscardIntoDeck(g, true)) break;
      if (g.status !== 'playing') return drawn;
    }
    const iid = g.deck.pop();
    if (!iid) break;
    p.hand.push(iid);
    drawn++;
  }
  if (drawn && !quiet) addLog(g, `${p.name} drew ${drawn} card${drawn > 1 ? 's' : ''}.`, 'draw');
  return drawn;
}

function toDiscard(g, iid) {
  const d = defOf(g, iid);
  if (d.type === 'baby') g.nest.push(iid);
  else g.discard.push(iid);
}

/* ================================================================== */
/* Stable enter / leave                                                */
/* ================================================================== */

// Push order note: frames pushed LAST execute FIRST (it's a stack).
function enterStable(g, iid, pid, opts = {}) {
  const p = byId(g, pid);
  const d = defOf(g, iid);
  p.stable.push(iid);
  if (!opts.quiet) addLog(g, `${d.name} entered ${p.name}'s stable.`, 'enter');

  if (isDragonType(d.type)) {
    // Cramped Cave: over 5 dragons forces a sacrifice.
    if (rawMods(g, pid).has('maxFive') && dragonCount(g, pid) > 5) {
      pushFrame(g, {
        owner: pid, source: iid,
        steps: [{ do: 'sacrifice', who: 'owner', filter: { kind: 'dragon' }, optional: false, reasonText: 'Cramped Cave' }],
      });
    }
    // Thorned Cage: discard per cage on enter.
    const cages = cageCount(g, pid);
    if (cages > 0 && !opts.noCage) {
      pushFrame(g, { owner: pid, source: iid, steps: [{ do: 'discard', who: 'owner', n: cages, reasonText: 'Thorned Cage' }] });
    }
    // Enter ability runs before the cage discard (pushed last = runs first).
    if (d.onEnter && abilitiesActive(g, iid)) {
      pushFrame(g, { owner: pid, source: iid, steps: d.onEnter });
    }
  }
  checkWin(g);
}

// Remove a card from its stable. reason: 'destroy' | 'sacrifice' | 'return' | 'move'
// Destination handling: destroy/sacrifice -> discard (babies -> nest);
// 'return' -> owner's hand (babies -> nest); 'move' -> caller places it.
function removeFromStable(g, iid, reason) {
  const p = stableOwner(g, iid);
  if (!p) return false;
  const d = defOf(g, iid);
  p.stable = p.stable.filter((x) => x !== iid);

  if (reason === 'destroy' || reason === 'sacrifice') {
    toDiscard(g, iid);
    addLog(g, `${d.name} was ${reason === 'destroy' ? 'destroyed' : 'sacrificed'} (${p.name}).`, 'destroy');
    // Leave ability (Spiteclaw / Seraph).
    if (d.onLeave && d.type === 'magical' && !rawMods(g, p.id).has('suppress')) {
      pushFrame(g, { owner: p.id, source: iid, steps: d.onLeave });
    }
  } else if (reason === 'return') {
    if (d.type === 'baby') {
      g.nest.push(iid);
      addLog(g, `${d.name} was returned to the Nest.`);
    } else {
      p.hand.push(iid);
      addLog(g, `${d.name} was returned to ${p.name}'s hand.`);
    }
  }
  // Thorned Cage: discard per cage when a dragon leaves.
  if (isDragonType(d.type)) {
    const cages = cageCount(g, p.id);
    if (cages > 0) {
      pushFrame(g, { owner: p.id, source: iid, steps: [{ do: 'discard', who: 'owner', n: cages, reasonText: 'Thorned Cage' }] });
    }
  }
  checkWin(g);
  return true;
}

function moveBetweenStables(g, iid, toPid, opts = {}) {
  const from = stableOwner(g, iid);
  if (!from) return false;
  removeFromStable(g, iid, 'move');
  enterStable(g, iid, toPid, opts);
  return true;
}

/* ================================================================== */
/* Target filtering                                                    */
/* ================================================================== */

// filter: { kind: 'dragon'|'basicDragon'|'upgrade'|'downgrade'|'upDown'|'any', zone: 'any'|'others'|'own'|'each' }
// context: { chooser, byMagic, forDestroy, forSacrifice, forSteal, eachPid }
function legalStableTargets(g, filter, ctx) {
  const out = [];
  for (const p of g.players) {
    if (filter.zone === 'others' && p.id === ctx.chooser) continue;
    if (filter.zone === 'own' && p.id !== ctx.chooser) continue;
    if (filter.zone === 'each' && p.id !== ctx.eachPid) continue;
    const mods = rawMods(g, p.id);
    for (const iid of p.stable) {
      const d = defOf(g, iid);
      const dragon = isDragonCard(g, iid);
      if (filter.kind === 'dragon' && !dragon) continue;
      if (filter.kind === 'basicDragon' && !(dragon && d.type === 'basic')) continue;
      if (filter.kind === 'upgrade' && d.type !== 'upgrade') continue;
      if (filter.kind === 'downgrade' && d.type !== 'downgrade') continue;
      if (filter.kind === 'upDown' && d.type !== 'upgrade' && d.type !== 'downgrade') continue;
      if (ctx.forDestroy || ctx.forSacrifice) {
        if (d.protected && abilitiesActive(g, iid)) continue; // Stray Whelp
      }
      if (ctx.forDestroy) {
        if (isDragonType(d.type) && mods.has('dragonsSafe')) continue; // Dragonscale Ward
        if (ctx.byMagic && d.noMagicDestroy && abilitiesActive(g, iid)) continue; // Spellscale
      }
      if (ctx.forSteal && dragon && d.type === 'basic' && queensDecreeBlocks(g, ctx.chooser)) continue;
      out.push(iid);
    }
  }
  return out;
}

// True if basic dragons may not enter pid's stable (Queen Dragon elsewhere).
function queensDecreeBlocks(g, pid) {
  for (const p of g.players) {
    if (p.id === pid) continue;
    if (playerMods(g, p.id).has('queensDecree')) {
      // Basics may only enter the queen owner's stable.
      if (!playerMods(g, pid).has('queensDecree')) return true;
    }
  }
  return false;
}

function handMatching(g, pid, filter) {
  const p = byId(g, pid);
  if (!filter) return [...p.hand];
  return p.hand.filter((iid) => {
    const d = defOf(g, iid);
    if (filter.types && !filter.types.includes(d.type)) return false;
    return true;
  });
}

/* ================================================================== */
/* Effect VM                                                           */
/* ================================================================== */

function pushFrame(g, { steps, owner, source, vars }) {
  g.effects.push({ steps, i: 0, vars: vars || {}, owner, source });
}

function resolveWho(g, frame, who) {
  if (who === 'owner' || who === undefined) return frame.owner;
  if (who === 'each') return frame.vars.each;
  if (who === 'turn') return current(g).id;
  return who;
}

function setPrompt(g, prompt) {
  g.prompt = prompt;
}

// Execute the current step of the top frame.
// choice === undefined on first entry; the player's answer on resume.
// Returns 'wait' (prompt pending) or 'done' (advance to next step).
function execStep(g, frame, step, choice) {
  const S = step.do;
  const vkey = '_s' + frame.i; // per-step scratch slot

  switch (S) {
    case 'draw': {
      drawCards(g, resolveWho(g, frame, step.who), step.n || 1);
      return 'done';
    }

    case 'discard': {
      const pid = resolveWho(g, frame, step.who);
      const p = byId(g, pid);
      const n = step.n || 1;
      if (!p || p.hand.length === 0) return 'done';
      if (p.hand.length <= n) {
        const all = p.hand.splice(0);
        all.forEach((iid) => toDiscard(g, iid));
        addLog(g, `${p.name} discarded ${all.map((x) => cardName(g, x)).join(', ')}.`);
        return 'done';
      }
      if (choice === undefined) {
        setPrompt(g, {
          playerId: pid, kind: 'pickHand', n,
          title: `Discard ${n} card${n > 1 ? 's' : ''}${step.reasonText ? ` (${step.reasonText})` : ''}`,
          candidates: [...p.hand],
        });
        return 'wait';
      }
      const picks = Array.isArray(choice) ? choice : [choice];
      for (const iid of picks) {
        p.hand = p.hand.filter((x) => x !== iid);
        toDiscard(g, iid);
      }
      addLog(g, `${p.name} discarded ${picks.map((x) => cardName(g, x)).join(', ')}.`);
      return 'done';
    }

    case 'destroy': {
      const chooser = step.chooser === 'owner' ? frame.owner : resolveWho(g, frame, step.chooser);
      const cands = legalStableTargets(g, step.filter, { chooser, byMagic: step.byMagic, forDestroy: true });
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: chooser, kind: 'pickCard',
          title: `Destroy a ${describeFilter(step.filter)}`,
          candidates: cands, canSkip: !!step.optional,
        });
        return 'wait';
      }
      if (choice === null) return 'done'; // skipped
      if (step.saveDone) frame.vars[step.saveDone] = true;
      pushFrame(g, { owner: frame.owner, source: frame.source, steps: [{ do: '_resolveDestroy', target: choice, byMagic: !!step.byMagic }] });
      return 'done';
    }

    case 'sacrifice': {
      const pid = resolveWho(g, frame, step.who);
      const cands = legalStableTargets(g, { ...step.filter, zone: 'own' }, { chooser: pid, forSacrifice: true });
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: pid, kind: 'pickCard',
          title: `Sacrifice a ${describeFilter(step.filter)}${step.reasonText ? ` (${step.reasonText})` : ''}`,
          candidates: cands, canSkip: !!step.optional,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      if (step.saveDone) frame.vars[step.saveDone] = true;
      pushFrame(g, { owner: frame.owner, source: frame.source, steps: [{ do: '_resolveSacrifice', target: choice }] });
      return 'done';
    }

    case 'sacrificeAll': {
      const pid = resolveWho(g, frame, step.who);
      const cands = legalStableTargets(g, { ...step.filter, zone: 'own' }, { chooser: pid, forSacrifice: true });
      // Push in reverse so they resolve in stable order.
      for (const iid of [...cands].reverse()) {
        pushFrame(g, { owner: frame.owner, source: frame.source, steps: [{ do: '_resolveSacrifice', target: iid }] });
      }
      return 'done';
    }

    case 'massSacUpDown': {
      for (const p of [...g.players].reverse()) {
        for (const iid of [...p.stable].reverse()) {
          const d = defOf(g, iid);
          if (d.type === 'upgrade' || d.type === 'downgrade') {
            pushFrame(g, { owner: p.id, source: iid, steps: [{ do: '_resolveSacrifice', target: iid }] });
          }
        }
      }
      return 'done';
    }

    case 'steal': {
      const chooser = step.chooser === 'owner' ? frame.owner : resolveWho(g, frame, step.chooser);
      const cands = legalStableTargets(g, { ...step.filter, zone: step.filter.zone || 'others' }, { chooser, forSteal: true })
        .filter((iid) => canAttachOrEnter(g, iid, chooser));
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: chooser, kind: 'pickCard',
          title: `Steal a ${describeFilter(step.filter)}`,
          candidates: cands, canSkip: !!step.optional,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      if (step.saveDone) frame.vars[step.saveDone] = true;
      const from = stableOwner(g, choice);
      addLog(g, `${byId(g, chooser).name} stole ${cardName(g, choice)} from ${from.name}!`, 'play');
      moveBetweenStables(g, choice, chooser);
      return 'done';
    }

    case 'snareSteal': {
      const chooser = frame.owner;
      const cands = legalStableTargets(g, { kind: 'dragon', zone: 'others' }, { chooser, forSteal: true });
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: chooser, kind: 'pickCard',
          title: 'Dragon Snare: steal a Dragon until end of turn',
          candidates: cands, canSkip: true,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      const from = stableOwner(g, choice);
      g.turn.snared.push({ iid: choice, fromId: from.id });
      addLog(g, `${byId(g, chooser).name} snared ${cardName(g, choice)} from ${from.name} until end of turn.`, 'play');
      moveBetweenStables(g, choice, chooser);
      return 'done';
    }

    case 'return': {
      const chooser = step.chooser === 'owner' ? frame.owner : resolveWho(g, frame, step.chooser);
      const cands = legalStableTargets(g, { ...step.filter }, { chooser, eachPid: frame.vars.each });
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: chooser, kind: 'pickCard',
          title: 'Return a card to its owner’s hand',
          candidates: cands, canSkip: !!step.optional,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      removeFromStable(g, choice, 'return');
      return 'done';
    }

    case 'returnEach': {
      // Wing Gust: caster picks one card in every stable that has cards.
      const order = turnOrderFrom(g, frame.owner).reverse();
      for (const pid of order) {
        if (byId(g, pid).stable.length === 0) continue;
        pushFrame(g, {
          owner: frame.owner, source: frame.source, vars: { each: pid },
          steps: [{ do: 'return', chooser: 'owner', filter: { kind: 'any', zone: 'each' }, optional: false }],
        });
      }
      return 'done';
    }

    case 'eachPlayer': {
      const order = turnOrderFrom(g, frame.owner)
        .filter((pid) => step.include === 'others' ? pid !== frame.owner : true)
        .reverse();
      for (const pid of order) {
        pushFrame(g, { owner: frame.owner, source: frame.source, vars: { each: pid }, steps: step.steps });
      }
      return 'done';
    }

    case 'searchDeck': {
      const pid = resolveWho(g, frame, step.who);
      const cands = g.deck.filter((iid) => matchesDeckFilter(g, iid, step.filter));
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: pid, kind: 'pickList',
          title: 'Search the deck — pick a card for your hand',
          candidates: cands, canSkip: !!step.optional, reveal: true,
        });
        return 'wait';
      }
      if (choice === null) { shuffle(g.deck); return 'done'; }
      g.deck = g.deck.filter((x) => x !== choice);
      byId(g, pid).hand.push(choice);
      shuffle(g.deck);
      addLog(g, `${byId(g, pid).name} searched the deck and took ${cardName(g, choice)}.`, 'draw');
      return 'done';
    }

    case 'fromDiscard': {
      const pid = resolveWho(g, frame, step.who);
      const cands = g.discard.filter((iid) => matchesDeckFilter(g, iid, step.filter));
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: pid, kind: 'pickList',
          title: step.to === 'stable' ? 'Pick a Dragon from the discard pile for your stable' : 'Pick a card from the discard pile for your hand',
          candidates: cands, canSkip: !!step.optional, reveal: true,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      g.discard = g.discard.filter((x) => x !== choice);
      if (step.to === 'stable') {
        addLog(g, `${byId(g, pid).name} raised ${cardName(g, choice)} from the discard pile!`, 'play');
        enterStable(g, choice, pid);
      } else {
        byId(g, pid).hand.push(choice);
        addLog(g, `${byId(g, pid).name} took ${cardName(g, choice)} from the discard pile.`, 'draw');
      }
      return 'done';
    }

    case 'randomSteal': {
      const pid = resolveWho(g, frame, step.who);
      const targets = g.players.filter((p) => p.id !== pid && p.hand.length > 0).map((p) => p.id);
      if (!targets.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: pid, kind: 'pickPlayer',
          title: 'Pull a random card from whose hand?',
          candidates: targets, canSkip: !!step.optional,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      const t = byId(g, choice);
      const iid = t.hand[Math.floor(Math.random() * t.hand.length)];
      t.hand = t.hand.filter((x) => x !== iid);
      byId(g, pid).hand.push(iid);
      addLog(g, `${byId(g, pid).name} pulled a random card from ${t.name}'s hand.`, 'draw');
      return 'done';
    }

    case 'lookTake': {
      const pid = resolveWho(g, frame, step.who);
      const stage = frame.vars[vkey];
      if (!stage) {
        const targets = g.players.filter((p) => p.id !== pid && p.hand.length > 0).map((p) => p.id);
        if (!targets.length) return 'done';
        if (choice === undefined) {
          setPrompt(g, { playerId: pid, kind: 'pickPlayer', title: 'Look at whose hand?', candidates: targets });
          return 'wait';
        }
        frame.vars[vkey] = { target: choice };
        const t = byId(g, choice);
        setPrompt(g, {
          playerId: pid, kind: 'pickList',
          title: `Take a card from ${t.name}'s hand`,
          candidates: [...t.hand], reveal: true,
        });
        return 'wait';
      }
      const t = byId(g, stage.target);
      if (!t.hand.includes(choice)) return 'done';
      t.hand = t.hand.filter((x) => x !== choice);
      byId(g, pid).hand.push(choice);
      addLog(g, `${byId(g, pid).name} took a card from ${t.name}'s hand.`, 'draw');
      return 'done';
    }

    case 'tradeHands': {
      const pid = resolveWho(g, frame, step.who);
      const targets = g.players.filter((p) => p.id !== pid).map((p) => p.id);
      if (!targets.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, { playerId: pid, kind: 'pickPlayer', title: 'Trade hands with whom?', candidates: targets });
        return 'wait';
      }
      const a = byId(g, pid);
      const b = byId(g, choice);
      const tmp = a.hand; a.hand = b.hand; b.hand = tmp;
      addLog(g, `${a.name} traded hands with ${b.name}!`, 'play');
      return 'done';
    }

    case 'targetDiscard': {
      const chooser = step.chooser === 'owner' ? frame.owner : resolveWho(g, frame, step.chooser);
      const targets = g.players.filter((p) => p.id !== chooser && p.hand.length > 0).map((p) => p.id);
      if (!targets.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: chooser, kind: 'pickPlayer',
          title: 'Choose a player to discard a card', candidates: targets, canSkip: !!step.optional,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      pushFrame(g, { owner: frame.owner, source: frame.source, vars: { each: choice }, steps: [{ do: 'discard', who: 'each', n: 1 }] });
      return 'done';
    }

    case 'shuffleDiscardIntoDeck': {
      reshuffleDiscardIntoDeck(g, false);
      return 'done';
    }

    case 'moltHand': {
      const pid = resolveWho(g, frame, step.who);
      const p = byId(g, pid);
      g.deck.push(...p.hand.splice(0));
      g.deck.push(...g.discard.splice(0));
      shuffle(g.deck);
      addLog(g, `${p.name} shuffled their hand and the discard pile into the deck.`, 'shuffle');
      drawCards(g, pid, 5);
      return 'done';
    }

    case 'moveUpDown': {
      const chooser = step.chooser === 'owner' ? frame.owner : resolveWho(g, frame, step.chooser);
      const stage = frame.vars[vkey];
      if (!stage) {
        const cands = legalStableTargets(g, { kind: 'upDown', zone: 'any' }, { chooser });
        if (!cands.length) return 'done';
        if (choice === undefined) {
          setPrompt(g, { playerId: chooser, kind: 'pickCard', title: 'Move which Upgrade or Downgrade?', candidates: cands });
          return 'wait';
        }
        const holder = stableOwner(g, choice);
        const defId = g.inst[choice];
        const dests = g.players
          .filter((p) => p.id !== holder.id && !p.stable.some((x) => g.inst[x] === defId))
          .map((p) => p.id);
        if (!dests.length) return 'done';
        frame.vars[vkey] = { card: choice };
        setPrompt(g, { playerId: chooser, kind: 'pickPlayer', title: `Move ${cardName(g, choice)} to whose stable?`, candidates: dests });
        return 'wait';
      }
      const iid = stage.card;
      if (!stableOwner(g, iid)) return 'done';
      addLog(g, `${cardName(g, iid)} was moved to ${byId(g, choice).name}'s stable.`, 'play');
      moveBetweenStables(g, iid, choice, { quiet: true });
      return 'done';
    }

    case 'destroyUpOrSacDown': {
      // Ironclaw: destroy an Upgrade anywhere OR sacrifice a Downgrade in your stable.
      const chooser = frame.owner;
      const ups = legalStableTargets(g, { kind: 'upgrade', zone: 'any' }, { chooser, forDestroy: true });
      const downs = legalStableTargets(g, { kind: 'downgrade', zone: 'own' }, { chooser, forSacrifice: true });
      const cands = [...ups, ...downs];
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: chooser, kind: 'pickCard',
          title: 'Destroy an Upgrade, or sacrifice a Downgrade in your stable',
          candidates: cands, canSkip: !!step.optional,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      const isUp = defOf(g, choice).type === 'upgrade';
      pushFrame(g, {
        owner: frame.owner, source: frame.source,
        steps: [{ do: isUp ? '_resolveDestroy' : '_resolveSacrifice', target: choice }],
      });
      return 'done';
    }

    case 'costDiscardThen': {
      const pid = resolveWho(g, frame, step.who);
      const cands = handMatching(g, pid, step.filter);
      if (!cands.length) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: pid, kind: 'pickHand', n: 1,
          title: step.filter ? 'You may discard a Dragon card to trigger the effect' : 'You may discard a card to trigger the effect',
          candidates: cands, canSkip: true,
        });
        return 'wait';
      }
      if (choice === null) return 'done';
      const iid = Array.isArray(choice) ? choice[0] : choice;
      const p = byId(g, pid);
      p.hand = p.hand.filter((x) => x !== iid);
      toDiscard(g, iid);
      addLog(g, `${p.name} discarded ${cardName(g, iid)}.`);
      pushFrame(g, { owner: frame.owner, source: frame.source, steps: step.then });
      return 'done';
    }

    case 'costSacrificeSelfThen': {
      const src = frame.source;
      if (!stableOwner(g, src)) return 'done';
      if (choice === undefined) {
        setPrompt(g, {
          playerId: frame.owner, kind: 'yesno',
          title: `Sacrifice ${cardName(g, src)} to destroy a Dragon?`,
        });
        return 'wait';
      }
      if (!choice) return 'done';
      removeFromStable(g, src, 'sacrifice');
      pushFrame(g, { owner: frame.owner, source: src, steps: step.then });
      return 'done';
    }

    case 'babyFromNest': {
      const pid = resolveWho(g, frame, step.who);
      if (!g.nest.length) return 'done';
      if (step.optional && choice === undefined) {
        setPrompt(g, { playerId: pid, kind: 'yesno', title: 'Bring a Baby Dragon from the Nest into your stable?' });
        return 'wait';
      }
      if (step.optional && !choice) return 'done';
      const iid = g.nest.pop();
      enterStable(g, iid, pid);
      return 'done';
    }

    case 'ask': {
      if (choice === undefined) {
        setPrompt(g, { playerId: frame.owner, kind: 'yesno', title: step.text });
        return 'wait';
      }
      if (choice && step.saveDone) frame.vars[step.saveDone] = true;
      return 'done';
    }

    case 'ifVar': {
      const branch = frame.vars[step.var] ? step.then : step.else;
      if (branch && branch.length) {
        pushFrame(g, { owner: frame.owner, source: frame.source, vars: frame.vars, steps: branch });
      }
      return 'done';
    }

    case 'skipToEnd': {
      g.turn.skipToEnd = true;
      addLog(g, `${current(g).name} charges ahead — skipping to their End phase.`);
      return 'done';
    }

    case 'extraAction': {
      g.turn.actions++;
      addLog(g, `${current(g).name} gains an extra action (Twin Heads).`);
      return 'done';
    }

    /* ---- internal resolution steps (destroy/sacrifice with saves) ---- */

    case '_resolveDestroy': {
      const target = step.target;
      const owner = stableOwner(g, target);
      if (!owner) return 'done';
      const d = defOf(g, target);
      const stage = frame.vars[vkey] || {};
      // Re-validate (state may have changed since targeting).
      if ((d.protected && abilitiesActive(g, target)) ||
          (isDragonType(d.type) && rawMods(g, owner.id).has('dragonsSafe')) ||
          (step.byMagic && d.noMagicDestroy && abilitiesActive(g, target))) {
        return 'done';
      }
      // Guardian Dragon: owner may sacrifice it instead.
      if (!stage.guardianAsked && isDragonType(d.type)) {
        const guardian = owner.stable.find((iid) =>
          iid !== target && defOf(g, iid).guardian && abilitiesActive(g, iid));
        if (guardian) {
          if (choice === undefined) {
            setPrompt(g, {
              playerId: owner.id, kind: 'yesno',
              title: `Sacrifice Guardian Dragon to save ${d.name}?`,
            });
            frame.vars[vkey] = { ...stage, guardianAsked: true, guardian };
            return 'wait';
          }
        }
        frame.vars[vkey] = { ...stage, guardianAsked: true };
      } else if (stage.guardianAsked && stage.guardian && !stage.guardianDone) {
        frame.vars[vkey] = { ...stage, guardianDone: true };
        if (choice === true) {
          removeFromStable(g, stage.guardian, 'sacrifice');
          addLog(g, `Guardian Dragon took the blow — ${d.name} survives!`, 'destroy');
          return 'done';
        }
        choice = undefined; // fall through to phoenix check with a fresh prompt
      }
      // Phoenix: owner may discard a card instead.
      const st2 = frame.vars[vkey] || {};
      if (d.wouldLeave === 'discardInstead' && abilitiesActive(g, target) && owner.hand.length > 0 && !st2.phoenixDone) {
        if (choice === undefined) {
          setPrompt(g, {
            playerId: owner.id, kind: 'pickHand', n: 1,
            title: `Discard a card to save ${d.name}?`,
            candidates: [...owner.hand], canSkip: true,
          });
          frame.vars[vkey] = { ...st2, phoenixDone: true };
          return 'wait';
        }
      }
      if (st2.phoenixDone && choice !== undefined && choice !== null) {
        const iid = Array.isArray(choice) ? choice[0] : choice;
        owner.hand = owner.hand.filter((x) => x !== iid);
        toDiscard(g, iid);
        addLog(g, `${owner.name} discarded ${cardName(g, iid)} — ${d.name} bursts back into flame!`);
        return 'done';
      }
      removeFromStable(g, target, 'destroy');
      return 'done';
    }

    case '_resolveSacrifice': {
      const target = step.target;
      const owner = stableOwner(g, target);
      if (!owner) return 'done';
      const d = defOf(g, target);
      if (d.protected && abilitiesActive(g, target)) return 'done';
      const stage = frame.vars[vkey] || {};
      if (d.wouldLeave === 'discardInstead' && abilitiesActive(g, target) && owner.hand.length > 0 && !stage.phoenixDone) {
        if (choice === undefined) {
          setPrompt(g, {
            playerId: owner.id, kind: 'pickHand', n: 1,
            title: `Discard a card to save ${d.name}?`,
            candidates: [...owner.hand], canSkip: true,
          });
          frame.vars[vkey] = { phoenixDone: true };
          return 'wait';
        }
      }
      if (stage.phoenixDone && choice !== undefined && choice !== null) {
        const iid = Array.isArray(choice) ? choice[0] : choice;
        owner.hand = owner.hand.filter((x) => x !== iid);
        toDiscard(g, iid);
        addLog(g, `${owner.name} discarded ${cardName(g, iid)} — ${d.name} bursts back into flame!`);
        return 'done';
      }
      removeFromStable(g, target, 'sacrifice');
      return 'done';
    }

    default:
      return 'done';
  }
}

function describeFilter(filter) {
  switch (filter && filter.kind) {
    case 'dragon': return 'Dragon';
    case 'basicDragon': return 'Basic Dragon';
    case 'upgrade': return 'Upgrade';
    case 'downgrade': return 'Downgrade';
    case 'upDown': return 'Upgrade or Downgrade';
    default: return 'card';
  }
}

function matchesDeckFilter(g, iid, filter) {
  const d = defOf(g, iid);
  if (!filter) return true;
  if (filter.types && !filter.types.includes(d.type)) return false;
  if (filter.sub && d.sub !== filter.sub) return false;
  return true;
}

// A stolen basic can be blocked from entering by Queen's Decree; other cards always can.
function canAttachOrEnter(g, iid, toPid) {
  const d = defOf(g, iid);
  if (d.type === 'basic' && queensDecreeBlocks(g, toPid)) return false;
  return true;
}

/* ================================================================== */
/* Chain (instant responses)                                           */
/* ================================================================== */

function chainTop(g) { return g.chain[g.chain.length - 1]; }

function openWindow(g) {
  const top = chainTop(g);
  if (top.uncounterable) { g.window = null; return; }
  const awaiting = g.players
    .filter((p) => p.id !== top.playerId)
    .filter((p) => !playerMods(g, p.id).has('noInstants'))
    .filter((p) => p.hand.some((iid) => defOf(g, iid).type === 'instant'))
    .map((p) => p.id);
  g.window = awaiting.length ? { awaiting } : null;
}

function resolveChain(g) {
  // Determine negation: each non-negated instant stops the next non-negated card below it.
  for (let i = g.chain.length - 1; i > 0; i--) {
    const entry = g.chain[i];
    if (entry.negated) continue;
    for (let j = i - 1; j >= 0; j--) {
      if (!g.chain[j].negated) { g.chain[j].negated = true; break; }
    }
  }
  const [base, ...responses] = g.chain;
  g.chain = [];
  // All instants go to the discard pile.
  for (const r of responses) toDiscard(g, r.iid);
  const d = DEFS[g.inst[base.iid]];
  const p = byId(g, base.playerId);
  if (base.negated) {
    toDiscard(g, base.iid);
    addLog(g, `${d.name} was STOPPED by a Roar and discarded!`, 'roar');
    return;
  }
  if (d.type === 'basic' || d.type === 'magical') {
    enterStable(g, base.iid, base.playerId);
  } else if (d.type === 'upgrade' || d.type === 'downgrade') {
    const target = byId(g, base.targetPlayerId) || p;
    // Re-validate uniqueness (a Curse Shift on the chain can't happen, but be safe).
    if (target.stable.some((x) => g.inst[x] === g.inst[base.iid])) {
      toDiscard(g, base.iid);
      addLog(g, `${d.name} fizzled — ${target.name} already has one.`);
    } else {
      enterStable(g, base.iid, target.id);
    }
  } else if (d.type === 'magic') {
    g.discard.push(base.iid); // to discard first, so shuffle effects include it
    addLog(g, `${p.name} cast ${d.name}.`, 'magic');
    if (d.steps) pushFrame(g, { owner: base.playerId, source: base.iid, steps: d.steps });
  }
}

/* ================================================================== */
/* Turn flow                                                           */
/* ================================================================== */

function initTurn(g, idx) {
  g.turn = {
    idx,
    phase: 'start',
    actions: 1,
    deadline: Date.now() + TURN_TIME_MS,
    snared: [],
    skipToEnd: false,
    startQueue: null,
    endStage: 0,
  };
  const p = g.players[idx];
  addLog(g, `— ${p.name}'s turn —`, 'turn');
}

function buildStartQueue(g) {
  const pid = current(g).id;
  // Stray Whelp wanders to the current player first (from anywhere).
  for (const p of g.players) {
    if (p.id === pid) continue;
    for (const iid of [...p.stable]) {
      const d = defOf(g, iid);
      if (d.wanders) {
        addLog(g, `${d.name} wandered into ${current(g).name}'s stable.`, 'enter');
        moveBetweenStables(g, iid, pid, { quiet: true });
      }
    }
  }
  // Collect this player's start-of-turn triggers: downgrades (mandatory)
  // first, then upgrades, then magical dragons.
  const order = { downgrade: 0, upgrade: 1, magical: 2 };
  const triggers = stableOf(g, pid, (d, iid) => d.onTurnStart && (d.type !== 'magical' || abilitiesActive(g, iid)))
    .sort((a, b) => order[defOf(g, a).type] - order[defOf(g, b).type]);
  g.turn.startQueue = triggers;
}

// Advance the turn state machine. Returns true if progress was made
// (pump should loop again) or false if we're waiting on a player.
function advanceFlow(g) {
  const t = g.turn;
  const p = current(g);

  switch (t.phase) {
    case 'start': {
      if (t.startQueue === null) buildStartQueue(g);
      if (g.effects.length || g.prompt) return true;
      if (t.startQueue.length) {
        const iid = t.startQueue.shift();
        const d = defOf(g, iid);
        // Card may have left the stable since the queue was built.
        if (stableOwner(g, iid) && stableOwner(g, iid).id === p.id && d.onTurnStart) {
          pushFrame(g, { owner: p.id, source: iid, steps: d.onTurnStart.steps });
        }
        return true;
      }
      t.phase = t.skipToEnd ? 'end' : 'draw';
      return true;
    }
    case 'draw': {
      drawCards(g, p.id, 1);
      t.phase = 'action';
      return true;
    }
    case 'action': {
      if (t.skipToEnd || t.actions <= 0) { t.phase = 'end'; return true; }
      return false; // waiting for the player's play/draw message
    }
    case 'end': {
      if (t.endStage === 0) {
        t.endStage = 1;
        const over = p.hand.length - HAND_LIMIT;
        if (over > 0) {
          pushFrame(g, { owner: p.id, source: null, steps: [{ do: 'discard', who: 'owner', n: over, reasonText: 'hand limit' }] });
          return true;
        }
        return true;
      }
      if (t.endStage === 1) {
        t.endStage = 2;
        // Return snared dragons.
        for (const s of t.snared) {
          const holder = stableOwner(g, s.iid);
          if (holder && holder.id === p.id && byId(g, s.fromId)) {
            addLog(g, `${cardName(g, s.iid)} was returned to ${byId(g, s.fromId).name}'s stable.`);
            moveBetweenStables(g, s.iid, s.fromId, { quiet: true });
          }
        }
        return true;
      }
      // Next player (skip fully disconnected seats if any connected player exists).
      let idx = t.idx;
      for (let i = 1; i <= g.players.length; i++) {
        const cand = (t.idx + i) % g.players.length;
        idx = cand;
        if (g.players[cand].connected || !g.players.some((x) => x.connected)) break;
      }
      initTurn(g, idx);
      return true;
    }
  }
  return false;
}

/* ================================================================== */
/* The pump — central scheduler                                        */
/* ================================================================== */

export function pump(g) {
  let guard = 0;
  while (guard++ < 5000) {
    if (g.status !== 'playing') return;
    if (g.prompt) {
      // Auto-answer prompts aimed at disconnected players? No — hold for
      // reconnection; the host can force-resolve via 'forceChoice'.
      return;
    }
    if (g.effects.length) {
      const frame = g.effects[g.effects.length - 1];
      if (frame.i >= frame.steps.length) {
        g.effects.pop();
        checkWin(g);
        continue;
      }
      const res = execStep(g, frame, frame.steps[frame.i], undefined);
      if (res === 'wait') return;
      frame.i++;
      continue;
    }
    if (g.window) return; // waiting for instant responses
    if (g.chain.length) { resolveChain(g); continue; }
    if (!advanceFlow(g)) return;
  }
  addLog(g, 'Engine safety brake engaged — please report this game state.');
}

function answerPrompt(g, pid, value) {
  const pr = g.prompt;
  if (!pr || pr.playerId !== pid) return { error: 'Nothing to choose right now.' };
  // Validate value against prompt kind.
  if (value === null) {
    if (!pr.canSkip) return { error: 'This choice cannot be skipped.' };
  } else {
    switch (pr.kind) {
      case 'pickCard':
      case 'pickList':
      case 'pickPlayer': {
        if (!pr.candidates.includes(value)) return { error: 'Invalid choice.' };
        break;
      }
      case 'pickHand': {
        const arr = Array.isArray(value) ? value : [value];
        const n = pr.n || 1;
        if (arr.length !== n) return { error: `Pick exactly ${n} card${n > 1 ? 's' : ''}.` };
        if (new Set(arr).size !== arr.length) return { error: 'Duplicate picks.' };
        if (!arr.every((x) => pr.candidates.includes(x))) return { error: 'Invalid choice.' };
        value = arr;
        break;
      }
      case 'yesno': {
        value = !!value;
        break;
      }
      default:
        return { error: 'Unknown prompt.' };
    }
  }
  g.prompt = null;
  const frame = g.effects[g.effects.length - 1];
  if (!frame) return {}; // shouldn't happen; drop stale prompt
  const res = execStep(g, frame, frame.steps[frame.i], value);
  if (res !== 'wait') frame.i++;
  pump(g);
  return {};
}

/* ================================================================== */
/* Player intents                                                      */
/* ================================================================== */

export function startGame(g, pid) {
  if (g.status !== 'lobby') return { error: 'Game already started.' };
  if (pid !== g.hostId) return { error: 'Only the host can start the game.' };
  if (g.players.length < MIN_PLAYERS) return { error: 'Need at least 2 players.' };

  // Build instances.
  g.inst = {};
  let n = 0;
  const mk = (defId) => { const iid = 'c' + (++n); g.inst[iid] = defId; return iid; };
  g.nest = [];
  for (let i = 0; i < 13; i++) g.nest.push(mk(BABY_ID));
  g.deck = shuffle(buildDeckList().map(mk));
  g.discard = [];
  g.reshuffles = 0;
  g.winnerId = null;
  g.endReason = null;
  g.chain = [];
  g.window = null;
  g.effects = [];
  g.prompt = null;
  g.lastPlayed = null;
  g.status = 'playing';

  for (const p of g.players) {
    p.hand = [];
    p.stable = [];
    const baby = g.nest.pop();
    p.stable.push(baby);
  }
  for (const p of g.players) drawCards(g, p.id, START_HAND, true);

  addLog(g, `The game begins! Each player starts with a Baby Dragon and ${START_HAND} cards. First to ${winThreshold(g)} Dragons wins.`, 'play');
  initTurn(g, Math.floor(Math.random() * g.players.length));
  pump(g);
  return {};
}

export function restartGame(g, pid) {
  if (g.status !== 'ended') return { error: 'The game is still running.' };
  if (pid !== g.hostId) return { error: 'Only the host can restart.' };
  g.status = 'lobby';
  addLog(g, 'The host reset the room — starting a rematch!');
  return startGame(g, pid);
}

function canPlayNow(g, pid) {
  return g.status === 'playing' && !g.prompt && !g.window && g.chain.length === 0 &&
    g.effects.length === 0 && g.turn && current(g).id === pid &&
    g.turn.phase === 'action' && g.turn.actions > 0;
}

// Validation shared by playCard and the 'playable' list in views.
function playValidation(g, pid, iid, targetPlayerId) {
  const d = defOf(g, iid);
  const mods = playerMods(g, pid);
  switch (d.type) {
    case 'instant':
      return 'Instants can only be played in response to another card.';
    case 'basic':
      if (queensDecreeBlocks(g, pid)) return 'Queen Dragon forbids Basic Dragons from entering your stable.';
      return null;
    case 'magical':
      return null;
    case 'upgrade': {
      if (mods.has('noUpgrades')) return 'Ruined Lair: you cannot play Upgrade cards.';
      const t = byId(g, targetPlayerId || pid);
      if (!t) return 'Invalid target stable.';
      if (t.stable.some((x) => g.inst[x] === g.inst[iid])) return `${t.name} already has ${d.name}.`;
      if (d.requiresBasic && !t.stable.some((x) => defOf(g, x).type === 'basic')) {
        return `${d.name} needs a Basic Dragon in the target stable.`;
      }
      return null;
    }
    case 'downgrade': {
      const t = byId(g, targetPlayerId);
      if (!t) return 'Choose a stable for the Downgrade.';
      if (t.stable.some((x) => g.inst[x] === g.inst[iid])) return `${t.name} already has ${d.name}.`;
      return null;
    }
    case 'magic':
      return null;
    default:
      return 'This card cannot be played.';
  }
}

// Can this hand card be played at all right now (some target exists)?
function isPlayable(g, pid, iid) {
  const d = defOf(g, iid);
  if (d.type === 'instant') return false;
  if (d.type === 'downgrade' || d.type === 'upgrade') {
    return g.players.some((t) => playValidation(g, pid, iid, t.id) === null);
  }
  return playValidation(g, pid, iid, null) === null;
}

export function playCard(g, pid, iid, targetPlayerId) {
  const p = byId(g, pid);
  if (!p) return { error: 'Unknown player.' };
  if (g.status !== 'playing') return { error: 'The game is not running.' };
  if (!p.hand.includes(iid)) return { error: 'That card is not in your hand.' };
  const d = defOf(g, iid);

  if (d.type === 'instant') {
    if (!g.window || !g.window.awaiting.includes(pid)) return { error: 'There is nothing to respond to.' };
    if (playerMods(g, pid).has('noInstants')) return { error: 'You cannot play Instant cards.' };
    p.hand = p.hand.filter((x) => x !== iid);
    const uncounterable = !!d.uncounterable || playerMods(g, pid).has('uncounterable');
    g.chain.push({ iid, playerId: pid, negated: false, uncounterable });
    g.lastPlayed = {
      n: ++g.playSeq, iid, defId: d.id, playerId: pid, playerName: p.name,
      targetName: null, at: Date.now(),
    };
    addLog(g, `${p.name} played ${d.name} in response!`, 'roar', {
      kind: 'play', defId: d.id, playerId: pid,
    });
    openWindow(g);
    pump(g);
    return {};
  }

  if (!canPlayNow(g, pid)) return { error: 'You cannot play a card right now.' };
  if ((d.type === 'upgrade') && !targetPlayerId) targetPlayerId = pid;
  const err = playValidation(g, pid, iid, targetPlayerId);
  if (err) return { error: err };

  p.hand = p.hand.filter((x) => x !== iid);
  g.turn.actions--;
  const uncounterable = playerMods(g, pid).has('uncounterable');
  g.chain.push({ iid, playerId: pid, targetPlayerId, negated: false, uncounterable });
  g.lastPlayed = {
    n: ++g.playSeq, iid, defId: d.id, playerId: pid, playerName: p.name,
    targetName: targetPlayerId ? byId(g, targetPlayerId)?.name || null : null,
    at: Date.now(),
  };
  const targetTxt = (d.type === 'downgrade' || (d.type === 'upgrade' && targetPlayerId !== pid))
    ? ` on ${byId(g, targetPlayerId).name}` : '';
  addLog(g, `${p.name} is playing ${d.name}${targetTxt}…`, 'play', {
    kind: 'play', defId: d.id, playerId: pid,
    targetPlayerId: targetPlayerId || undefined,
  });
  openWindow(g);
  pump(g);
  return {};
}

export function drawAction(g, pid) {
  if (!canPlayNow(g, pid)) return { error: 'You cannot draw right now.' };
  g.turn.actions--;
  drawCards(g, pid, 1);
  pump(g);
  return {};
}

export function passWindow(g, pid) {
  if (!g.window) return { error: 'Nothing to pass on.' };
  g.window.awaiting = g.window.awaiting.filter((x) => x !== pid);
  if (!g.window.awaiting.length) g.window = null;
  pump(g);
  return {};
}

export function choose(g, pid, value) {
  return answerPrompt(g, pid, value);
}

// Host tools for stuck games (disconnected player holding a prompt / turn).
export function forceChoice(g, pid) {
  if (pid !== g.hostId) return { error: 'Only the host can do that.' };
  const pr = g.prompt;
  if (!pr) return { error: 'No pending choice.' };
  const target = byId(g, pr.playerId);
  if (target && target.connected) return { error: `${target.name} is connected — let them choose.` };
  addLog(g, `Host auto-resolved a choice for ${target ? target.name : 'a player'}.`);
  let value;
  if (pr.canSkip) value = null;
  else if (pr.kind === 'yesno') value = false;
  else if (pr.kind === 'pickHand') value = pr.candidates.slice(0, pr.n || 1);
  else value = pr.candidates[0];
  return answerPrompt(g, pr.playerId, value);
}

export function forcePass(g, pid) {
  if (pid !== g.hostId) return { error: 'Only the host can do that.' };
  if (!g.window) return { error: 'No response window open.' };
  const stuck = g.window.awaiting.map((x) => byId(g, x)).filter((p) => p && !p.connected);
  if (!stuck.length) return { error: 'Everyone awaited is still connected.' };
  for (const p of stuck) {
    g.window.awaiting = g.window.awaiting.filter((x) => x !== p.id);
  }
  addLog(g, 'Host passed for disconnected players.');
  if (!g.window.awaiting.length) g.window = null;
  pump(g);
  return {};
}

export function forceEndTurn(g, pid) {
  if (pid !== g.hostId) return { error: 'Only the host can do that.' };
  if (g.status !== 'playing') return { error: 'Game is not running.' };
  const p = current(g);
  if (p.connected) return { error: `${p.name} is connected — it's their turn.` };
  if (g.prompt || g.window || g.effects.length || g.chain.length) {
    return { error: 'Resolve the pending choice first (use auto-resolve).' };
  }
  addLog(g, `Host skipped ${p.name}'s turn (disconnected).`);
  g.turn.phase = 'end';
  g.turn.endStage = 0;
  g.turn.actions = 0;
  pump(g);
  return {};
}

function automaticPromptValue(pr) {
  if (pr.canSkip) return null;
  if (pr.kind === 'yesno') return false;
  if (pr.kind === 'pickHand') return pr.candidates.slice(0, pr.n || 1);
  if (pr.kind === 'pickList') return pr.candidates[0]?.iid ?? pr.candidates[0];
  return pr.candidates[0];
}

// Resolve anything still blocking an expired turn, then end only that turn.
// A resolving card may already advance the engine, so the player/deadline pair
// prevents the timeout from ever skipping the next player.
export function expireTurn(g, now = Date.now()) {
  if (g.status !== 'playing' || !g.turn?.deadline || g.turn.deadline > now) {
    return { expired: false };
  }
  const expiredPlayerId = current(g).id;
  const expiredDeadline = g.turn.deadline;
  addLog(g, `${current(g).name}'s 60-second turn expired. Remaining choices were resolved automatically.`, 'turn');

  let guard = 0;
  while (g.status === 'playing' && guard++ < 100) {
    if (g.prompt) {
      const pr = g.prompt;
      const res = answerPrompt(g, pr.playerId, automaticPromptValue(pr));
      if (res && res.error) {
        g.prompt = null;
        pump(g);
      }
      continue;
    }
    if (g.window) {
      g.window = null;
      pump(g);
      continue;
    }
    if (g.effects.length || g.chain.length) {
      pump(g);
      continue;
    }
    break;
  }

  if (g.status === 'playing' && current(g).id === expiredPlayerId && g.turn.deadline === expiredDeadline) {
    g.turn.phase = 'end';
    g.turn.endStage = 0;
    g.turn.actions = 0;
    pump(g);
  }
  return { expired: true };
}

/* ================================================================== */
/* Per-player view                                                     */
/* ================================================================== */

export function viewFor(g, pid) {
  const me = byId(g, pid);
  const visibleHands = {};
  for (const p of g.players) {
    if (p.id === pid || (g.status === 'playing' && rawMods(g, p.id).has('handVisible'))) {
      visibleHands[p.id] = p.hand.map((iid) => ({ iid, defId: g.inst[iid] }));
    }
  }

  const players = g.players.map((p) => ({
    id: p.id,
    name: p.name,
    seat: p.seat,
    connected: p.connected,
    isBot: !!p.isBot,
    difficulty: p.isBot ? p.difficulty : undefined,
    isHost: p.id === g.hostId,
    handCount: p.hand.length,
    dragons: g.status !== 'lobby' ? dragonCount(g, p.id) : 0,
    mods: g.status === 'playing' ? [...playerMods(g, p.id)] : [],
    stable: p.stable.map((iid) => ({
      iid,
      defId: g.inst[iid],
      suppressed: defOf(g, iid).type === 'magical' && !abilitiesActive(g, iid),
      toad: isDragonType(defOf(g, iid).type) && rawMods(g, p.id).has('toads'),
    })),
  }));

  // Playable cards for this viewer right now.
  let playable = [];
  let canDraw = false;
  if (g.status === 'playing' && me) {
    if (g.window && g.window.awaiting.includes(pid)) {
      playable = me.hand.filter((iid) => defOf(g, iid).type === 'instant');
    } else if (canPlayNow(g, pid)) {
      playable = me.hand.filter((iid) => isPlayable(g, pid, iid));
      canDraw = true;
    }
  }

  // Prompt: full details only for the promptee.
  let prompt = null;
  if (g.prompt) {
    if (g.prompt.playerId === pid) {
      prompt = { ...g.prompt, mine: true };
    } else {
      const wp = byId(g, g.prompt.playerId);
      prompt = { mine: false, waitingOn: wp ? wp.name : '?', title: 'is making a choice…' };
    }
    if (prompt.mine && (g.prompt.kind === 'pickList')) {
      prompt.candidates = g.prompt.candidates.map((iid) => ({ iid, defId: g.inst[iid] }));
    }
  }

  let window = null;
  if (g.window) {
    const top = chainTop(g);
    window = {
      awaiting: g.window.awaiting.map((x) => byId(g, x).name),
      canRespond: g.window.awaiting.includes(pid),
      topName: DEFS[g.inst[top.iid]].name,
      topPlayer: byId(g, top.playerId).name,
    };
  }

  return {
    you: pid,
    code: g.code,
    status: g.status,
    hostId: g.hostId,
    youAreHost: pid === g.hostId,
    players,
    hands: visibleHands,
    deckCount: g.deck.length,
    discard: g.discard.map((iid) => ({ iid, defId: g.inst[iid] })),
    nestCount: g.nest.length,
    turn: g.turn ? {
      playerId: g.status === 'playing' || g.status === 'ended' ? current(g).id : null,
      playerName: current(g).name,
      phase: g.turn.phase,
      actions: g.turn.actions,
      deadline: g.turn.deadline,
    } : null,
    serverNow: Date.now(),
    lastPlayed: g.lastPlayed ? { ...g.lastPlayed } : null,
    chain: g.chain.map((e) => ({
      iid: e.iid, defId: g.inst[e.iid],
      playerName: byId(g, e.playerId).name,
      targetName: e.targetPlayerId ? byId(g, e.targetPlayerId)?.name : undefined,
      uncounterable: e.uncounterable,
    })),
    window,
    prompt,
    playable,
    canDraw,
    winThreshold: winThreshold(g),
    reshuffles: g.reshuffles,
    winner: g.winnerId ? { id: g.winnerId, name: byId(g, g.winnerId)?.name, reason: g.endReason } : null,
    log: g.log.slice(-80),
  };
}
