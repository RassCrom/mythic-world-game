// Bot players for Unstable Dragons.
// A bot decides from the same personalized view a human client receives
// (its own hand + public info), so it plays fair — no peeking at hands or
// the deck. Difficulty changes how much heuristic vs. random behavior it uses.
//
// decideBotAction(view, difficulty) returns a client-style intent message:
//   { type:'play', iid, targetPlayerId? } | { type:'drawAction' }
//   | { type:'pass' } | { type:'choose', value }

import { DEFS } from '../../shared/cards.js';

const rand = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

/* ---------------- card valuations ---------------- */

// How much a card is worth sitting in a stable (for destroy/steal/sacrifice picks).
function stableValue(defId) {
  const d = DEFS[defId];
  if (!d) return 0;
  if (d.type === 'baby') return 1.5;
  if (d.type === 'basic') return 2;
  if (d.type === 'magical') return d.countsAs === 2 ? 5 : (d.guardian || d.wouldLeave ? 4 : 3);
  if (d.type === 'upgrade') return d.mods?.includes('dragonsSafe') || d.mods?.includes('uncounterable') ? 3.5 : 2.5;
  if (d.type === 'downgrade') return 1; // in an enemy stable a downgrade "value" barely matters
  return 1;
}

// How much a card is worth held in hand (for discard picks — discard LOW first).
function handValue(defId) {
  const d = DEFS[defId];
  if (!d) return 0;
  switch (d.type) {
    case 'instant': return d.uncounterable ? 6 : 5;
    case 'magical': return d.countsAs === 2 ? 4.5 : 4;
    case 'basic': return 2.5;
    case 'upgrade': return 3;
    case 'downgrade': return 3;
    case 'magic': return d.id === 's_venom' || d.id === 's_bargain' ? 4 : 3;
    default: return 1;
  }
}

/* ---------------- board reading ---------------- */

function others(view) { return view.players.filter((p) => p.id !== view.you); }
function me(view) { return view.players.find((p) => p.id === view.you); }

function leader(view) {
  return others(view).reduce((best, p) =>
    !best || p.dragons > best.dragons || (p.dragons === best.dragons && p.handCount > best.handCount) ? p : best, null);
}

function ownerOfCard(view, iid) {
  return view.players.find((p) => p.stable.some((c) => c.iid === iid));
}

function defIdOf(view, iid) {
  for (const p of view.players) {
    const hit = p.stable.find((c) => c.iid === iid);
    if (hit) return hit.defId;
  }
  const inHand = (view.hands[view.you] || []).find((c) => c.iid === iid);
  return inHand ? inHand.defId : null;
}

function nearWin(view, p) { return p.dragons >= view.winThreshold - 2; }

/* ---------------- prompt answers ---------------- */

function decideChoose(view, difficulty) {
  const pr = view.prompt;
  const sloppy = difficulty === 'easy' ? 0.5 : difficulty === 'medium' ? 0.2 : 0;

  if (pr.kind === 'yesno') {
    if (difficulty === 'easy') return { type: 'choose', value: chance(0.7) };
    return { type: 'choose', value: true };
  }

  if (pr.kind === 'pickHand') {
    const n = pr.n || 1;
    const cands = [...pr.candidates];
    const myHand = view.hands[view.you] || [];
    const valOf = (iid) => handValue((myHand.find((c) => c.iid === iid) || {}).defId);
    // Optional "pay a card" prompts (phoenix save, discard-to-steal, …):
    // pay with the cheapest card unless everything left is precious.
    if (pr.canSkip) {
      const cheapest = cands.reduce((a, b) => (valOf(a) <= valOf(b) ? a : b));
      if (difficulty !== 'easy' && valOf(cheapest) >= 5) return { type: 'choose', value: null };
      if (difficulty === 'easy' && chance(0.4)) return { type: 'choose', value: null };
      return { type: 'choose', value: [cheapest] };
    }
    const sorted = cands.sort((a, b) => (chance(sloppy) ? 0 : valOf(a) - valOf(b)));
    return { type: 'choose', value: sorted.slice(0, n) };
  }

  if (pr.kind === 'pickCard') {
    const cands = pr.candidates;
    const mineOnly = cands.every((iid) => {
      const o = ownerOfCard(view, iid);
      return o && o.id === view.you;
    });
    const valued = cands.map((iid) => {
      const o = ownerOfCard(view, iid);
      const v = stableValue(defIdOf(view, iid));
      return { iid, owner: o, v };
    });
    if (mineOnly) {
      // Defensive pick (sacrifice/discard-a-downgrade): lose the least,
      // except prefer removing downgrades from our own stable.
      const down = valued.find((x) => DEFS[defIdOf(view, x.iid)]?.type === 'downgrade');
      if (down && difficulty !== 'easy') return { type: 'choose', value: down.iid };
      if (pr.canSkip && difficulty !== 'easy') {
        const cheapest = valued.reduce((a, b) => (a.v <= b.v ? a : b));
        // Don't voluntarily sacrifice good dragons for optional effects.
        if (cheapest.v >= 3) return { type: 'choose', value: null };
        return { type: 'choose', value: cheapest.iid };
      }
      const cheapest = valued.reduce((a, b) => (a.v <= b.v ? a : b));
      return { type: 'choose', value: chance(sloppy) ? rand(cands) : cheapest.iid };
    }
    // Offensive pick (destroy/steal/return): hit the leader's best card.
    const lead = leader(view);
    const enemy = valued.filter((x) => x.owner && x.owner.id !== view.you);
    const pool = enemy.length ? enemy : valued;
    const scored = pool.map((x) => ({ ...x, s: x.v + (lead && x.owner && x.owner.id === lead.id ? 2 : 0) }));
    const best = scored.reduce((a, b) => (a.s >= b.s ? a : b));
    return { type: 'choose', value: chance(sloppy) ? rand(cands) : best.iid };
  }

  if (pr.kind === 'pickPlayer') {
    const lead = leader(view);
    if (lead && pr.candidates.includes(lead.id) && !chance(sloppy)) {
      return { type: 'choose', value: lead.id };
    }
    return { type: 'choose', value: rand(pr.candidates) };
  }

  if (pr.kind === 'pickList') {
    const valued = pr.candidates.map((c) => ({ iid: c.iid, v: handValue(c.defId) }));
    const best = valued.reduce((a, b) => (a.v >= b.v ? a : b));
    return { type: 'choose', value: chance(sloppy) ? rand(pr.candidates).iid : best.iid };
  }

  // Unknown prompt kind: skip if possible, else first candidate.
  if (pr.canSkip) return { type: 'choose', value: null };
  return { type: 'choose', value: Array.isArray(pr.candidates) ? pr.candidates[0] : true };
}

/* ---------------- response window (Roar decisions) ---------------- */

function decideWindow(view, difficulty) {
  const myInstants = (view.playable || []);
  if (!myInstants.length) return { type: 'pass' };
  const chain = view.chain;
  const base = chain[0];
  const top = chain[chain.length - 1];
  const baseDef = DEFS[base.defId];
  const basePlayer = view.players.find((p) => p.name === base.playerName);
  const lead = leader(view);

  // Would my own play get stopped? Counter-roar to protect it.
  const protectMine = chain.length >= 2 &&
    chain[chain.length - 2].playerName === me(view).name &&
    top.playerName !== me(view).name;

  const dangerousBase =
    baseDef.type === 'downgrade' && base.targetName === me(view).name ||
    ['s_venom', 's_bargain', 's_slate'].includes(baseDef.id) ||
    (['basic', 'magical'].includes(baseDef.type) && basePlayer && nearWin(view, basePlayer));

  const winningBase = ['basic', 'magical'].includes(baseDef.type) && basePlayer &&
    basePlayer.dragons + (baseDef.countsAs === 2 ? 2 : 1) >= view.winThreshold;

  let roar;
  if (difficulty === 'easy') {
    roar = chance(0.12);
  } else if (difficulty === 'medium') {
    roar = protectMine ? chance(0.6) : winningBase ? chance(0.85) : dangerousBase ? chance(0.4) : chance(0.08);
  } else {
    // hard: hoard instants, spend them only where it matters
    roar = protectMine || winningBase ? true :
      dangerousBase ? chance(0.6) :
      (basePlayer && lead && basePlayer.id === lead.id && baseDef.type !== 'basic') ? chance(0.25) :
      false;
  }
  if (!roar) return { type: 'pass' };
  // Prefer the plain Roar; keep the unstoppable one for emergencies.
  const myHand = view.hands[view.you] || [];
  const sorted = [...myInstants].sort((a, b) => {
    const da = (myHand.find((c) => c.iid === a) || {}).defId;
    const db = (myHand.find((c) => c.iid === b) || {}).defId;
    return (DEFS[da]?.uncounterable ? 1 : 0) - (DEFS[db]?.uncounterable ? 1 : 0);
  });
  const pick = difficulty === 'hard' && winningBase ? sorted[sorted.length - 1] : sorted[0];
  return { type: 'play', iid: pick };
}

/* ---------------- turn actions ---------------- */

function legalTargetsFor(view, defId) {
  const def = DEFS[defId];
  return view.players
    .filter((p) => !p.stable.some((c) => c.defId === defId))
    .filter((p) => !def.requiresBasic || p.stable.some((c) => DEFS[c.defId].type === 'basic'));
}

function decideTurn(view, difficulty) {
  const myHand = view.hands[view.you] || [];
  const playable = view.playable || [];
  const self = me(view);
  const lead = leader(view);

  if (!playable.length) return { type: 'drawAction' };

  if (difficulty === 'easy') {
    if (chance(0.25)) return { type: 'drawAction' };
    const iid = rand(playable);
    return withTarget(view, iid, () => rand(legalTargetsFor(view, handDef(myHand, iid))));
  }

  // Score every playable card.
  const options = [];
  for (const iid of playable) {
    const defId = handDef(myHand, iid);
    const d = DEFS[defId];
    let score = 0;
    let target;
    if (d.type === 'basic' || d.type === 'magical') {
      const gain = d.countsAs === 2 ? 2 : 1;
      score = 3 + gain;
      if (self.dragons + gain >= view.winThreshold) score = 100; // winning play
      if (d.id === 'm_cataclysm' && self.dragons > (lead?.dragons || 0)) score -= 3;
    } else if (d.type === 'upgrade') {
      const mine = legalTargetsFor(view, defId).find((p) => p.id === view.you);
      if (!mine) continue;
      target = view.you;
      score = d.mods?.includes('dragonsSafe') || d.mods?.includes('uncounterable') ? 3.6 : 3;
    } else if (d.type === 'downgrade') {
      const cands = legalTargetsFor(view, defId).filter((p) => p.id !== view.you);
      if (!cands.length) continue;
      const tgt = cands.includes(lead) ? lead : cands.reduce((a, b) => (a.dragons >= b.dragons ? a : b));
      target = tgt.id;
      score = 3 + (nearWin(view, tgt) ? 2 : 0) + (d.id === 'd_toadcurse' && nearWin(view, tgt) ? 3 : 0);
    } else if (d.type === 'magic') {
      if (d.id === 's_venom' || d.id === 's_bargain') {
        score = lead && nearWin(view, lead) ? 6 : 2.6;
        if (d.id === 's_bargain' && self.stable.length <= 1) score = 0.5; // cost too high
      } else if (d.id === 's_lucky' || d.id === 's_fate') {
        score = 2.8;
      } else if (d.id === 's_slate') {
        const myAttach = self.stable.filter((c) => ['upgrade'].includes(DEFS[c.defId].type)).length;
        const theirs = others(view).reduce((n, p) => n + p.stable.filter((c) => DEFS[c.defId].type === 'upgrade').length, 0);
        score = theirs > myAttach ? 3.5 : 1;
      } else {
        score = 2.5;
      }
    }
    if (difficulty === 'medium') score += (Math.random() - 0.5) * 2.5;
    options.push({ iid, score, target });
  }

  const drawScore = difficulty === 'medium' ? 2.4 + (Math.random() - 0.5) : myHand.length <= 2 ? 3.2 : 2.2;
  options.push({ draw: true, score: drawScore });

  const best = options.reduce((a, b) => (a.score >= b.score ? a : b));
  if (best.draw) return { type: 'drawAction' };
  return { type: 'play', iid: best.iid, targetPlayerId: best.target };
}

function handDef(myHand, iid) {
  return (myHand.find((c) => c.iid === iid) || {}).defId;
}

function withTarget(view, iid, pickTarget) {
  const myHand = view.hands[view.you] || [];
  const d = DEFS[handDef(myHand, iid)];
  if (d && (d.type === 'upgrade' || d.type === 'downgrade')) {
    const t = pickTarget();
    if (!t) return { type: 'drawAction' };
    return { type: 'play', iid, targetPlayerId: t.id || t };
  }
  return { type: 'play', iid };
}

/* ---------------- entry point ---------------- */

export function decideBotAction(view, difficulty) {
  if (view.prompt && view.prompt.mine) return decideChoose(view, difficulty);
  if (view.window && view.window.canRespond) return decideWindow(view, difficulty);
  if (view.canDraw) return decideTurn(view, difficulty);
  return null;
}
