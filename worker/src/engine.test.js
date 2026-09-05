import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BABY_COUNT, BABY_IDS, DEFS, FACTION_IDS, buildDeckList } from '../../shared/cards.js';
import {
  addPlayer,
  choose,
  createGame,
  drawAction,
  expireTurn,
  passWindow,
  playCard,
  startGame,
  setFaction,
  setSettings,
  isLoyal,
  creatureCount,
  isReadableSave,
  SCHEMA,
  viewFor,
} from './engine.js';

function startedGame() {
  const game = createGame('TEST');
  const first = addPlayer(game, { token: 'first', name: 'Aster' }).playerId;
  const second = addPlayer(game, { token: 'second', name: 'Bramble' }).playerId;
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    assert.deepEqual(startGame(game, first), {});
  } finally {
    Math.random = originalRandom;
  }
  return { game, first, second };
}

test('player identity requires a token and keeps international names', () => {
  const game = createGame('TEST');
  assert.deepEqual(addPlayer(game, { token: '', name: 'Nameless' }), { error: 'Invalid player token.' });
  const result = addPlayer(game, { token: 'valid-token', name: 'Дракон' });
  assert.equal(game.players.find((player) => player.id === result.playerId).name, 'Дракон');
});

function activePlayer(game) {
  return game.players[game.turn.idx];
}

function putInActiveHand(game, defId) {
  const player = activePlayer(game);
  const iid = game.deck.find((candidate) => game.inst[candidate] === defId);
  assert.ok(iid, `${defId} should exist in the deck`);
  const replaced = player.hand[0];
  game.deck = game.deck.filter((candidate) => candidate !== iid);
  player.hand[0] = iid;
  game.deck.push(replaced);
  return iid;
}

function passAllResponses(game) {
  while (game.window?.awaiting.length) {
    const responder = game.window.awaiting[0];
    assert.deepEqual(passWindow(game, responder), {});
  }
}

test('setup gives every player five cards and a Baby Dragon before the first mandatory draw', () => {
  const { game, first, second } = startedGame();
  const firstPlayer = game.players.find((player) => player.id === first);
  const secondPlayer = game.players.find((player) => player.id === second);

  assert.equal(game.turn.idx, 0);
  assert.equal(game.turn.phase, 'action');
  assert.equal(game.turn.actions, 1);
  assert.equal(firstPlayer.hand.length, 6, 'first player has the five-card deal plus the draw-phase card');
  assert.equal(secondPlayer.hand.length, 5);
  for (const player of game.players) {
    assert.equal(player.stable.length, 1);
    assert.equal(game.inst[player.stable[0]], BABY_IDS[player.faction]);
  }
  assert.equal(firstPlayer.faction, 'dragon', 'seats alternate factions: first is a dragon keeper');
  assert.equal(secondPlayer.faction, 'unicorn');
  assert.equal(game.nest.length, BABY_COUNT - 2);
});

test('drawing in the action phase draws once and immediately ends the turn', () => {
  const { game, first, second } = startedGame();

  assert.deepEqual(drawAction(game, first), {});
  assert.equal(game.players.find((player) => player.id === first).hand.length, 7);
  assert.equal(game.turn.idx, 1);
  assert.equal(game.turn.phase, 'action');
  assert.equal(activePlayer(game).id, second);
  assert.equal(activePlayer(game).hand.length, 6, 'next player has completed their mandatory draw');
});

test('every turn receives a 60-second authoritative deadline and expires safely', () => {
  const before = Date.now();
  const { game, first, second } = startedGame();

  assert.ok(game.turn.deadline >= before + 59_000);
  assert.ok(game.turn.deadline <= Date.now() + 60_000);
  game.turn.deadline = Date.now() - 1;
  assert.deepEqual(expireTurn(game), { expired: true });
  assert.equal(activePlayer(game).id, second);
  assert.equal(game.turn.phase, 'action');
  assert.ok(game.turn.deadline > Date.now());
  assert.notEqual(activePlayer(game).id, first);
});

test('a Magic card moves to discard before its effect and resolves its full description', () => {
  const { game, first } = startedGame();
  const luckyFind = putInActiveHand(game, 's_lucky');

  assert.deepEqual(playCard(game, first, luckyFind), {});
  passAllResponses(game);

  assert.ok(game.discard.includes(luckyFind));
  assert.equal(game.prompt?.kind, 'pickHand');
  assert.equal(game.prompt?.n, 1, 'Lucky Find draws three, then asks for one discard');
  const discardChoice = game.prompt.candidates[0];
  assert.deepEqual(choose(game, first, [discardChoice]), {});
  assert.equal(game.players.find((player) => player.id === first).hand.length, 7);
  assert.equal(game.turn.idx, 1, 'playing the Magic card consumed the one action');
});

test('a Magical Dragon resolves its enter effect and consumes the action', () => {
  const { game, first } = startedGame();
  const hoardwing = putInActiveHand(game, 'm_hoardwing');

  assert.deepEqual(playCard(game, first, hoardwing), {});
  passAllResponses(game);

  const player = game.players.find((candidate) => candidate.id === first);
  assert.ok(player.stable.includes(hoardwing));
  assert.equal(player.hand.length, 6, 'play one card, then Hoardwing draws one card');
  assert.equal(game.turn.idx, 1);
});

test('Chronodrake reverses the next-player direction', () => {
  const game = createGame('TIME');
  const first = addPlayer(game, { token: 'first', name: 'Aster' }).playerId;
  addPlayer(game, { token: 'second', name: 'Bramble' });
  const third = addPlayer(game, { token: 'third', name: 'Cinder' }).playerId;
  const originalRandom = Math.random;
  Math.random = () => 0;
  try {
    assert.deepEqual(startGame(game, first), {});
  } finally {
    Math.random = originalRandom;
  }
  const chronodrake = putInActiveHand(game, 'm_chronodrake');

  assert.deepEqual(playCard(game, first, chronodrake), {});
  passAllResponses(game);

  assert.equal(game.direction, -1);
  assert.equal(activePlayer(game).id, third, 'play continues to the previous seat after reversal');
});

test('Mirrorwing copies another Magical Dragon entrance ability', () => {
  const { game, first } = startedGame();
  const player = game.players.find((candidate) => candidate.id === first);
  const hoardwing = game.deck.find((iid) => game.inst[iid] === 'm_hoardwing');
  game.deck = game.deck.filter((iid) => iid !== hoardwing);
  player.stable.push(hoardwing);
  const mirrorwing = putInActiveHand(game, 'm_mirrorwing');

  assert.deepEqual(playCard(game, first, mirrorwing), {});
  passAllResponses(game);
  assert.equal(game.prompt?.kind, 'pickCard');
  assert.ok(game.prompt.candidates.includes(hoardwing));
  assert.deepEqual(choose(game, first, hoardwing), {});

  assert.equal(player.hand.length, 6, 'copied Hoardwing ability draws one card');
});

test('Riftcoil swaps itself with an opposing Dragon without retriggering either card', () => {
  const { game, first, second } = startedGame();
  const firstPlayer = game.players.find((candidate) => candidate.id === first);
  const secondPlayer = game.players.find((candidate) => candidate.id === second);
  const target = game.deck.find((iid) => game.inst[iid] === 'basic_verdant');
  game.deck = game.deck.filter((iid) => iid !== target);
  secondPlayer.stable.push(target);
  const riftcoil = putInActiveHand(game, 'm_riftcoil');

  assert.deepEqual(playCard(game, first, riftcoil), {});
  passAllResponses(game);
  assert.equal(game.prompt?.kind, 'pickCard');
  assert.ok(game.prompt.candidates.includes(target));
  assert.deepEqual(choose(game, first, target), {});

  assert.ok(firstPlayer.stable.includes(target));
  assert.ok(!firstPlayer.stable.includes(riftcoil));
  assert.ok(secondPlayer.stable.includes(riftcoil));
  assert.ok(!secondPlayer.stable.includes(target));
});

test('Hydra Dragon lets its owner bring up to two Baby Dragons from the Nest when destroyed', () => {
  const { game, first } = startedGame();
  const player = game.players.find((candidate) => candidate.id === first);
  const hydra = game.deck.find((iid) => game.inst[iid] === 'm_hydra');
  game.deck = game.deck.filter((iid) => iid !== hydra);
  player.stable.push(hydra);
  const nestBefore = game.nest.length;
  const babiesBefore = player.stable.filter((iid) => game.inst[iid] === 'baby_dragon').length;

  const venom = putInActiveHand(game, 's_venom');
  assert.deepEqual(playCard(game, first, venom), {});
  passAllResponses(game);

  assert.equal(game.prompt?.kind, 'pickCard');
  assert.ok(game.prompt.candidates.includes(hydra));
  assert.deepEqual(choose(game, first, hydra), {});

  assert.equal(game.prompt?.kind, 'yesno');
  assert.deepEqual(choose(game, first, true), {});
  assert.equal(game.prompt?.kind, 'yesno', 'Hydra Dragon offers a second Baby Dragon');
  assert.deepEqual(choose(game, first, true), {});

  const babies = player.stable.filter((iid) => game.inst[iid] === 'baby_dragon');
  assert.equal(babies.length, babiesBefore + 2, 'both Baby Dragons entered the stable');
  assert.equal(game.nest.length, nestBefore - 2);
  assert.equal(game.prompt, null);
});

test('declining Hydra Dragon\'s second Baby Dragon keeps just the first', () => {
  const { game, first } = startedGame();
  const player = game.players.find((candidate) => candidate.id === first);
  const hydra = game.deck.find((iid) => game.inst[iid] === 'm_hydra');
  game.deck = game.deck.filter((iid) => iid !== hydra);
  player.stable.push(hydra);
  const babiesBefore = player.stable.filter((iid) => game.inst[iid] === 'baby_dragon').length;

  const venom = putInActiveHand(game, 's_venom');
  assert.deepEqual(playCard(game, first, venom), {});
  passAllResponses(game);
  assert.deepEqual(choose(game, first, hydra), {});

  assert.deepEqual(choose(game, first, true), {}); // take the first Baby Dragon
  assert.deepEqual(choose(game, first, false), {}); // decline the second

  const babies = player.stable.filter((iid) => game.inst[iid] === 'baby_dragon');
  assert.equal(babies.length, babiesBefore + 1);
});

test('Volcanic Wyrm may sacrifice its stablemates to fuel two destroys per Dragon lost', () => {
  const { game, first, second } = startedGame();
  const player = game.players.find((candidate) => candidate.id === first);
  const opponent = game.players.find((candidate) => candidate.id === second);
  const opponentBaby = opponent.stable[0];
  const nestBefore = game.nest.length;

  const wyrm = putInActiveHand(game, 'm_volcanic');
  assert.deepEqual(playCard(game, first, wyrm), {});
  passAllResponses(game);

  assert.equal(game.prompt?.kind, 'yesno');
  assert.deepEqual(choose(game, first, true), {});

  assert.ok(!player.stable.some((iid) => game.inst[iid] === 'baby_dragon'), 'the lone stablemate Baby Dragon was sacrificed');
  assert.equal(game.nest.length, nestBefore + 1, 'the sacrificed Baby Dragon returned to the Nest');

  // One Dragon sacrificed -> two forced destroys follow.
  assert.equal(game.prompt?.kind, 'pickCard');
  assert.ok(game.prompt.candidates.includes(opponentBaby));
  assert.deepEqual(choose(game, first, opponentBaby), {});
  assert.ok(!opponent.stable.includes(opponentBaby));

  assert.equal(game.prompt?.kind, 'pickCard');
  assert.deepEqual(game.prompt.candidates, [wyrm], 'only the Wyrm itself remains as a legal target');
  assert.deepEqual(choose(game, first, wyrm), {});

  assert.equal(player.stable.length, 0);
  assert.equal(game.prompt, null, 'no further forced destroys once both were spent');
});

test('Volcanic Wyrm does nothing when it has no other Dragons to sacrifice', () => {
  const { game, first } = startedGame();
  const player = game.players.find((candidate) => candidate.id === first);
  player.stable = []; // no stablemates to offer up

  const wyrm = putInActiveHand(game, 'm_volcanic');
  assert.deepEqual(playCard(game, first, wyrm), {});
  passAllResponses(game);

  assert.equal(game.prompt, null);
  assert.deepEqual(player.stable, [wyrm]);
});

test('playing a card publishes a synchronized spotlight event', () => {
  const { game, first } = startedGame();
  const hoardwing = putInActiveHand(game, 'm_hoardwing');

  assert.deepEqual(playCard(game, first, hoardwing), {});
  assert.equal(game.lastPlayed.defId, 'm_hoardwing');
  assert.equal(game.lastPlayed.playerId, first);
  assert.equal(game.lastPlayed.n, 1);
  assert.ok(game.lastPlayed.at <= Date.now());
  const chronicleEntry = [...game.log].reverse().find((entry) => entry.defId === 'm_hoardwing');
  assert.equal(chronicleEntry.kind, 'play');
  assert.equal(chronicleEntry.playerId, first);
});

test('every effect action referenced by the card database is implemented by the engine VM', () => {
  const implemented = new Set([
    'draw', 'discard', 'destroy', 'sacrifice', 'sacrificeAll', 'massSacUpDown',
    'steal', 'snareSteal', 'return', 'returnEach', 'eachPlayer', 'searchDeck',
    'fromDiscard', 'randomSteal', 'lookTake', 'tradeHands', 'targetDiscard',
    'shuffleDiscardIntoDeck', 'moltHand', 'moveUpDown', 'destroyUpOrSacDown',
    'costDiscardThen', 'costSacrificeSelfThen', 'babyFromNest', 'ask', 'ifVar',
    'skipToEnd', 'extraAction', 'reverseTurnOrder', 'copyEntrance', 'swapDragon',
    'volcanicPurge', 'tame', 'swapCreatures', 'countVar',
  ]);
  const referenced = new Set();
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.do === 'string') referenced.add(value.do);
    for (const child of Object.values(value)) visit(child);
  };
  for (const definition of Object.values(DEFS)) visit(definition);
  const unsupported = [...referenced].filter((action) => !implemented.has(action));
  assert.deepEqual(unsupported, []);
});

test('a stable past the 15-card cap forces a sacrifice, independent of card type', () => {
  const { game, first } = startedGame();
  const player = game.players.find((p) => p.id === first);
  player.stable = []; // setup deals a starting Baby Dragon; start from a clean stable.

  // Pad the stable with 15 non-dragon cards (fabricated instance ids) so the
  // cap is reached without also tripping the dragon-count win condition.
  for (let i = 0; i < 15; i++) {
    const iid = `pad${i}`;
    game.inst[iid] = 'u_armor';
    player.stable.push(iid);
  }
  assert.equal(player.stable.length, 15);

  const dragon = putInActiveHand(game, 'basic_crimson');
  assert.deepEqual(playCard(game, first, dragon), {});
  passAllResponses(game);

  assert.equal(player.stable.length, 16, 'the 16th card still enters before the cap resolves');
  assert.ok(game.prompt, 'a sacrifice prompt should be pending');
  assert.equal(game.prompt.playerId, first);
  assert.equal(game.prompt.kind, 'pickCard');
  assert.match(game.prompt.title, /Overcrowded Stable/);
  assert.equal(game.prompt.candidates.length, 16, 'any of the 16 cards may be sacrificed');

  assert.deepEqual(choose(game, first, dragon), {});
  assert.equal(player.stable.length, 15, 'the stable is back at the cap after the sacrifice');
  assert.ok(!player.stable.includes(dragon));
  assert.ok(game.discard.includes(dragon));
});

test('the overcrowded-stable sacrifice does not fire below the cap', () => {
  const { game, first } = startedGame();
  const player = game.players.find((p) => p.id === first);
  player.stable = []; // setup deals a starting Baby Dragon; start from a clean stable.
  for (let i = 0; i < 14; i++) {
    const iid = `pad${i}`;
    game.inst[iid] = 'u_armor';
    player.stable.push(iid);
  }

  const dragon = putInActiveHand(game, 'basic_crimson');
  assert.deepEqual(playCard(game, first, dragon), {});
  passAllResponses(game);

  assert.equal(player.stable.length, 15);
  assert.equal(game.prompt, null);
});


/* ================================================================== */
/* Dragons vs Unicorns                                                 */
/* ================================================================== */

function playerOf(game, pid) { return game.players.find((p) => p.id === pid); }

function pullFromDeck(game, defId) {
  const iid = game.deck.find((candidate) => game.inst[candidate] === defId);
  assert.ok(iid, `${defId} should exist in the deck`);
  game.deck = game.deck.filter((candidate) => candidate !== iid);
  return iid;
}

test('factions can be changed in the lobby and are locked afterwards', () => {
  const game = createGame('FACT');
  const first = addPlayer(game, { token: 'a', name: 'Aster' }).playerId;
  addPlayer(game, { token: 'b', name: 'Bramble' });
  assert.deepEqual(setFaction(game, first, 'unicorn'), {});
  assert.equal(playerOf(game, first).faction, 'unicorn');
  assert.deepEqual(setFaction(game, first, 'griffin'), { error: 'Unknown faction.' });
  Math.random = (() => { const o = Math.random; Math.random = () => 0; return o; })();
  assert.deepEqual(startGame(game, first), {});
  assert.equal(setFaction(game, first, 'dragon').error, 'Factions are locked once the game starts.');
  assert.equal(game.inst[playerOf(game, first).stable[0]], 'baby_unicorn', 'a unicorn keeper hatches a Baby Unicorn');
});

test('a wild Magical creature (rival faction) counts toward the goal but its ability stays dormant', () => {
  const { game, first } = startedGame(); // first = dragon keeper
  const player = playerOf(game, first);
  const stormfeather = putInActiveHand(game, 'mu_peg_storm'); // unicorn: "enters: DRAW a card"
  const handBefore = player.hand.length;
  assert.deepEqual(playCard(game, first, stormfeather), {});
  passAllResponses(game);
  assert.ok(player.stable.includes(stormfeather));
  assert.equal(isLoyal(game, stormfeather), false);
  assert.equal(player.hand.length, handBefore - 1, 'no draw: the pegasus is wild in a dragon stable');
  assert.equal(creatureCount(game, first), 2, 'it still counts as a creature');
});

test('a loyal Magical creature of your own faction fires its entrance ability', () => {
  const { game, first, second } = startedGame();
  // Give the unicorn keeper the turn.
  assert.deepEqual(drawAction(game, first), {});
  const player = playerOf(game, second);
  const stormfeather = putInActiveHand(game, 'mu_peg_storm');
  const handBefore = player.hand.length;
  assert.deepEqual(playCard(game, second, stormfeather), {});
  passAllResponses(game);
  assert.equal(isLoyal(game, stormfeather), true);
  assert.equal(player.hand.length, handBefore, 'play one, draw one');
});

test('Taming Bond wakes a wild Magical creature and fires its entrance ability', () => {
  const { game, first } = startedGame();
  const player = playerOf(game, first);
  const stormfeather = pullFromDeck(game, 'mu_peg_storm');
  player.stable.push(stormfeather);
  const bond = putInActiveHand(game, 's_taming');
  const handBefore = player.hand.length;
  assert.deepEqual(playCard(game, first, bond), {});
  passAllResponses(game);
  assert.equal(game.prompt?.kind, 'pickCard');
  assert.deepEqual(game.prompt.candidates, [stormfeather]);
  assert.deepEqual(choose(game, first, stormfeather), {});
  assert.equal(isLoyal(game, stormfeather), true);
  assert.equal(player.hand.length, handBefore, 'Taming Bond spent, Stormfeather drew one');
});

test('Pegasi are flying: they can never be stolen, Rainbow Mane protects a whole stable', () => {
  const { game, first, second } = startedGame();
  const foe = playerOf(game, second);
  const pegasus = pullFromDeck(game, 'mu_peg_gale');
  const basic = pullFromDeck(game, 'basic_rosebloom');
  foe.stable.push(pegasus, basic);
  const enchanting = putInActiveHand(game, 'm_enchanting');
  assert.deepEqual(playCard(game, first, enchanting), {});
  passAllResponses(game);
  assert.equal(game.prompt?.kind, 'pickHand', 'discard a card to steal');
  assert.deepEqual(choose(game, first, [game.prompt.candidates[0]]), {});
  assert.equal(game.prompt?.kind, 'pickCard');
  assert.ok(!game.prompt.candidates.includes(pegasus), 'the pegasus flies off');
  assert.ok(game.prompt.candidates.includes(basic));
  assert.deepEqual(choose(game, first, basic), {});
  assert.ok(playerOf(game, first).stable.includes(basic));

  // Rainbow Mane: nothing in that stable can be stolen or swapped away any more.
  foe.stable.push(pullFromDeck(game, 'u_mane'));
  foe.stable.push(pullFromDeck(game, 'basic_skyhoof'));
  assert.deepEqual(drawAction(game, second), {}); // back to the dragon keeper
  const riftcoil = putInActiveHand(game, 'm_riftcoil');
  assert.deepEqual(playCard(game, first, riftcoil), {});
  passAllResponses(game);
  assert.equal(game.prompt, null, 'Riftcoil finds no creature it may swap with');
});

test('Ember: a dragon keeper draws once per turn after destroying a rival card', () => {
  const { game, first, second } = startedGame();
  const me = playerOf(game, first);
  const foeBaby = playerOf(game, second).stable[0];
  const venom = putInActiveHand(game, 's_venom');
  const handBefore = me.hand.length;
  assert.deepEqual(playCard(game, first, venom), {});
  passAllResponses(game);
  assert.deepEqual(choose(game, first, foeBaby), {});
  assert.equal(me.hand.length, handBefore, 'venom spent, Ember drew one back');
  assert.ok(game.log.some((entry) => /^Ember:/.test(entry.msg)));
});

test('Sparkle: a unicorn keeper draws when a rival destroys a loyal creature', () => {
  const { game, first, second } = startedGame();
  const foe = playerOf(game, second);
  const foeBaby = foe.stable[0];
  const venom = putInActiveHand(game, 's_venom');
  const foeHand = foe.hand.length;
  assert.deepEqual(playCard(game, first, venom), {});
  passAllResponses(game);
  assert.deepEqual(choose(game, first, foeBaby), {});
  // The action ended the dragon keeper's turn, so the unicorn keeper also took their draw-phase card.
  assert.equal(foe.hand.length, foeHand + 2, 'Sparkle consolation draw + draw phase');
  assert.ok(game.log.some((entry) => /^Sparkle:/.test(entry.msg)));
  assert.equal(game.inst[foeBaby], 'baby_unicorn');
  assert.ok(game.nest.includes(foeBaby), 'the Baby Unicorn went back to the Nest');
});

test('Dawnwing Pegasus returns to hand instead of being destroyed', () => {
  const { game, first, second } = startedGame();
  const foe = playerOf(game, second);
  const dawnwing = pullFromDeck(game, 'mu_peg_dawn');
  foe.stable.push(dawnwing);
  const venom = putInActiveHand(game, 's_venom');
  assert.deepEqual(playCard(game, first, venom), {});
  passAllResponses(game);
  assert.deepEqual(choose(game, first, dawnwing), {});
  assert.ok(foe.hand.includes(dawnwing));
  assert.ok(!foe.stable.includes(dawnwing));
  assert.ok(!game.discard.includes(dawnwing));
});

test('Shieldhorn Unicorn wards loyal creatures from Magic destruction only', () => {
  const { game, first, second } = startedGame();
  const foe = playerOf(game, second);
  const shieldhorn = pullFromDeck(game, 'mu_shieldhorn');
  const wildDrake = pullFromDeck(game, 'basic_crimson'); // a dragon in a unicorn stable: wild
  foe.stable.push(shieldhorn, wildDrake);
  const venom = putInActiveHand(game, 's_venom');
  assert.deepEqual(playCard(game, first, venom), {});
  passAllResponses(game);
  assert.equal(game.prompt?.kind, 'pickCard');
  assert.ok(!game.prompt.candidates.includes(shieldhorn));
  assert.ok(!game.prompt.candidates.includes(foe.stable[0]), 'the loyal Baby Unicorn is warded');
  assert.ok(game.prompt.candidates.includes(wildDrake), 'a wild creature is not protected');
});

test('Rainbow Bridge swaps one of your creatures with a rival creature', () => {
  const { game, first, second } = startedGame();
  const me = playerOf(game, first);
  const foe = playerOf(game, second);
  const mine = pullFromDeck(game, 'basic_rosebloom');
  const theirs = pullFromDeck(game, 'basic_crimson');
  me.stable.push(mine);
  foe.stable.push(theirs);
  const bridge = putInActiveHand(game, 's_bridge');
  assert.deepEqual(playCard(game, first, bridge), {});
  passAllResponses(game);
  assert.equal(game.prompt?.kind, 'pickCard');
  assert.ok(game.prompt.candidates.includes(mine));
  assert.deepEqual(choose(game, first, mine), {});
  assert.ok(game.prompt.candidates.includes(theirs));
  assert.deepEqual(choose(game, first, theirs), {});
  assert.ok(me.stable.includes(theirs) && !me.stable.includes(mine));
  assert.ok(foe.stable.includes(mine) && !foe.stable.includes(theirs));
});

test('Slumber Spell skips the Draw phase and Muddy Hooves forbids Magic', () => {
  const { game, first, second } = startedGame();
  const foe = playerOf(game, second);
  foe.stable.push(pullFromDeck(game, 'd_slumber'));
  foe.stable.push(pullFromDeck(game, 'd_muddy'));
  const foeHand = foe.hand.length;
  assert.deepEqual(drawAction(game, first), {});
  assert.equal(activePlayer(game).id, second);
  assert.equal(foe.hand.length, foeHand, 'no draw-phase card');
  const venom = putInActiveHand(game, 's_venom');
  assert.match(playCard(game, second, venom).error, /Muddy Hooves/);
});

test('Cozy Meadow hatches a Baby of your faction at the start of your turn when none is present', () => {
  const { game, first, second } = startedGame();
  const foe = playerOf(game, second);
  foe.stable = foe.stable.filter((iid) => game.inst[iid] !== 'baby_unicorn');
  game.nest.push(...[]); // nest still holds unicorn babies
  foe.stable.push(pullFromDeck(game, 'u_meadow'));
  assert.deepEqual(drawAction(game, first), {});
  assert.equal(activePlayer(game).id, second);
  assert.ok(foe.stable.some((iid) => game.inst[iid] === 'baby_unicorn'));
});

test('Blossom Unicorn draws two only with three loyal Unicorns', () => {
  const { game, first, second } = startedGame();
  assert.deepEqual(drawAction(game, first), {});
  const me = playerOf(game, second);
  me.stable.push(pullFromDeck(game, 'basic_meadow')); // + Baby Unicorn = 2 loyal, Blossom makes 3
  const blossom = putInActiveHand(game, 'mu_blossom');
  const before = me.hand.length;
  assert.deepEqual(playCard(game, second, blossom), {});
  passAllResponses(game);
  assert.equal(me.hand.length, before - 1 + 2);
});

test('Faction War shares the victory with every keeper of the winning faction', () => {
  const game = createGame('WAR');
  const a = addPlayer(game, { token: 'a', name: 'A' }).playerId; // dragon
  const b = addPlayer(game, { token: 'b', name: 'B' }).playerId; // unicorn
  const c = addPlayer(game, { token: 'c', name: 'C' }).playerId; // llama by rotation
  assert.deepEqual(setFaction(game, c, 'dragon'), {}); // join the Clan for the war
  assert.deepEqual(setSettings(game, a, { factionWar: true }), {});
  const originalRandom = Math.random;
  Math.random = () => 0;
  try { assert.deepEqual(startGame(game, a), {}); } finally { Math.random = originalRandom; }
  const me = playerOf(game, a);
  for (const id of ['basic_crimson', 'basic_azure', 'basic_verdant', 'basic_gilded', 'basic_obsidian']) me.stable.push(pullFromDeck(game, id));
  const last = putInActiveHand(game, 'basic_ivory');
  assert.deepEqual(playCard(game, a, last), {});
  passAllResponses(game);
  assert.equal(game.status, 'ended');
  assert.equal(game.winnerId, a);
  assert.match(game.endReason, /Dragon Clan wins the war/);
  assert.deepEqual(viewFor(game, c).winner.youWon, true);
  assert.deepEqual(viewFor(game, b).winner.youWon, false);
});

test('faction-sensitive card types are balanced between all factions', () => {
  // Magical abilities only work while LOYAL, so an uneven split of the
  // faction-sensitive types hands one faction a live ability more often than
  // the other. Basics and instants are already symmetric; keep them that way.
  const counts = {};
  for (const id of buildDeckList()) {
    const card = DEFS[id];
    const faction = card.faction || 'neutral';
    if (faction === 'neutral') continue;
    counts[card.type] ??= {};
    counts[card.type][faction] = (counts[card.type][faction] || 0) + 1;
  }
  for (const [type, split] of Object.entries(counts)) {
    const perFaction = FACTION_IDS.map((f) => split[f] || 0);
    assert.ok(
      perFaction.every((n) => n === perFaction[0]),
      `${type}: ${FACTION_IDS.map((f, i) => `${perFaction[i]} ${f}`).join(' vs ')} cards in the deck`,
    );
  }
});

test('every card effect uses a step the engine implements', () => {
  // The engine dispatches steps from a switch; collect its case labels so a
  // typo in a card definition fails here instead of silently no-opping mid-game.
  const source = readFileSync(new URL('./engine.js', import.meta.url), 'utf8');
  const known = new Set([...source.matchAll(/case '([A-Za-z]+)':/g)].map((m) => m[1]));
  const seen = new Set();
  const walk = (steps) => {
    for (const step of steps || []) {
      if (!step || typeof step !== 'object') continue;
      if (step.do) seen.add(step.do);
      for (const branch of [step.steps, step.then, step.else]) walk(branch);
    }
  };
  for (const card of Object.values(DEFS)) {
    walk(card.steps);
    walk(card.onEnter);
    walk(card.onLeave);
    walk(card.onTurnStart?.steps);
  }
  const unknown = [...seen].filter((name) => !known.has(name)).sort();
  assert.deepEqual(unknown, [], `unimplemented effect steps: ${unknown.join(', ')}`);
});

// A started two-player game whose first seat is pledged to `faction`.
function startedGameAs(faction) {
  const game = createGame('BAL');
  const first = addPlayer(game, { token: 'first', name: 'Aster' }).playerId;
  const second = addPlayer(game, { token: 'second', name: 'Bramble' }).playerId;
  assert.deepEqual(setFaction(game, first, faction), {});
  assert.deepEqual(setFaction(game, second, faction === 'dragon' ? 'unicorn' : 'dragon'), {});
  const originalRandom = Math.random;
  Math.random = () => 0;
  try { assert.deepEqual(startGame(game, first), {}); } finally { Math.random = originalRandom; }
  return { game, first, second };
}

test('Kindly Unicorn draws a card for every player when it enters', () => {
  // Playing a card ends the turn, so the next player's mandatory draw lands in
  // the same measurement. Compare against a plain creature to isolate the
  // ability itself.
  const control = handGainFromPlaying('basic_crimson');
  const kindly = handGainFromPlaying('mu_kindly');
  assert.equal(kindly.caster, control.caster + 1, 'the caster draws with everyone else');
  assert.equal(kindly.other, control.other + 1, 'the other player draws too');
});

// Plays defId from the first (Unicorn) seat and reports how each hand changed.
function handGainFromPlaying(defId) {
  const { game, first, second } = startedGameAs('unicorn');
  const iid = pullFromDeck(game, defId);
  playerOf(game, first).hand.push(iid);
  const before = [playerOf(game, first).hand.length, playerOf(game, second).hand.length];
  assert.deepEqual(playCard(game, first, iid), {});
  passAllResponses(game);
  assert.ok(playerOf(game, first).stable.includes(iid), `${defId} joins the stable`);
  return {
    caster: playerOf(game, first).hand.length - before[0],
    other: playerOf(game, second).hand.length - before[1],
  };
}

test('Starlight Canopy only draws once the stable holds three Unicorns', () => {
  const { game, first, second } = startedGameAs('unicorn');
  const me = playerOf(game, first);
  me.stable.push(pullFromDeck(game, 'u_canopy'));
  // Setup already dealt a Baby Unicorn, which counts toward the herd.
  me.stable.push(pullFromDeck(game, 'basic_starlit'));
  // Two Unicorns: a full turn cycle nets zero (one card played, one drawn).
  assert.equal(cycleToOwnTurn(game, first, second), 0);
  me.stable.push(pullFromDeck(game, 'basic_meadow'));
  // Three Unicorns: the Canopy adds a card on top of the mandatory draw.
  assert.equal(cycleToOwnTurn(game, first, second), 1);
});

// Plays one card from each seat so the turn comes back around, and reports how
// many cards `pid` gained across the cycle. Dragon basics are used so the
// Unicorn count in pid's stable is not disturbed.
function cycleToOwnTurn(game, pid, otherPid) {
  const before = playerOf(game, pid).hand.length;
  for (const [actor, defId] of [[pid, 'basic_crimson'], [otherPid, 'basic_azure']]) {
    assert.equal(activePlayer(game).id, actor);
    const iid = pullFromDeck(game, defId);
    playerOf(game, actor).hand.push(iid);
    assert.deepEqual(playCard(game, actor, iid), {});
    passAllResponses(game);
  }
  assert.equal(activePlayer(game).id, pid, 'turn came back around');
  // pid played one card and drew one back, so the baseline delta is zero.
  return playerOf(game, pid).hand.length - before - 1;
}

/* ================================================================== */
/* Harmony and save compatibility                                      */
/* ================================================================== */

// Math.random is stubbed during setup, so the deal is deterministic but a
// given card may land in a hand rather than staying in the deck. These tests
// only care about getting an instance, not where it came from.
function pullCard(game, defId) {
  const from = [game.deck, ...game.players.map((p) => p.hand)]
    .find((zone) => zone.some((iid) => game.inst[iid] === defId));
  assert.ok(from, `${defId} should exist somewhere in the dealt game`);
  const iid = from.find((candidate) => game.inst[candidate] === defId);
  from.splice(from.indexOf(iid), 1);
  return iid;
}

test('Harmony counts double only while a loyal companion shares the stable', () => {
  const { game, first } = startedGameAs('unicorn');
  const me = playerOf(game, first);
  const harmony = pullCard(game, 'mu_harmony');

  // Setup deals a Baby Unicorn, so clear the stable to isolate the rule.
  me.stable = [harmony];
  assert.equal(creatureCount(game, first), 1, 'alone, Harmony is worth one');

  me.stable.push(pullCard(game, 'basic_starlit'));
  assert.equal(creatureCount(game, first), 3, 'a loyal companion doubles it: 2 + 1');
});

test('a wild companion does not sustain Harmony', () => {
  const { game, first } = startedGameAs('unicorn');
  const me = playerOf(game, first);
  const harmony = pullCard(game, 'mu_harmony');
  const dragon = pullCard(game, 'basic_crimson');
  me.stable = [harmony, dragon];

  assert.equal(isLoyal(game, dragon), false, 'a dragon in a unicorn stable is wild');
  assert.equal(creatureCount(game, first), 2, 'the wild dragon fills a slot but keeps no company');
});

test('Discord switches Harmony off for the stable it sits in', () => {
  const { game, first } = startedGameAs('unicorn');
  const me = playerOf(game, first);
  me.stable = [pullCard(game, 'mu_harmony'), pullCard(game, 'basic_starlit')];
  assert.equal(creatureCount(game, first), 3);

  me.stable.push(pullCard(game, 'd_discord'));
  assert.equal(creatureCount(game, first), 2, 'breakHarmony drops it back to one each');
});

test('saved games from a previous engine are not readable', () => {
  const { game } = startedGameAs('unicorn');
  assert.equal(game.schema, SCHEMA, 'new games carry the current schema');
  assert.equal(isReadableSave(game), true);

  // What a Deck Duel room looks like in Durable Object storage: per-faction
  // piles, no shared deck, and card ids this database no longer defines.
  const deckDuelSave = {
    code: 'OLD01',
    status: 'playing',
    piles: { unicorns: { deck: ['i1'], discard: [], nest: [], reshuffles: 0 } },
    inst: { i1: 'uni_s_stargate' },
    players: [{ id: 'p1', factionId: 'unicorns', stable: ['i1'], hand: [] }],
  };
  assert.equal(isReadableSave(deckDuelSave), false, 'it would crash on the first card lookup');
  assert.equal(DEFS.uni_s_stargate, undefined, 'and its card ids really are gone');
  assert.equal(isReadableSave(null), false);
  assert.equal(isReadableSave({ ...game, schema: 1 }), false);
});

/* ================================================================== */
/* The Llama Caravan                                                   */
/* ================================================================== */

test('seats rotate through all three factions', () => {
  const game = createGame('TRIO');
  const ids = ['a', 'b', 'c', 'd'].map((token) => addPlayer(game, { token, name: token }).playerId);
  assert.deepEqual(ids.map((id) => playerOf(game, id).faction), ['dragon', 'unicorn', 'llama', 'dragon']);
});

test('Cud: a Llama keeper draws once after discarding by effect', () => {
  const { game, first } = startedGameAs('llama');
  const me = playerOf(game, first);
  const iid = pullCard(game, 'l_caravan'); // draw 2, then discard 1
  me.hand.push(iid);
  const before = me.hand.length;
  assert.deepEqual(playCard(game, first, iid), {});
  passAllResponses(game);
  assert.equal(game.prompt?.playerId, first, 'Caravan Master asks which card to discard');
  assert.deepEqual(choose(game, first, [game.prompt.candidates[0]]), {});
  // −1 played, +2 drawn, −1 discarded, +1 from Cud.
  assert.equal(me.hand.length, before + 1);
  assert.match(JSON.stringify(game.log), /Cud: /);
});

test('Cud does not fire for the end-of-turn hand limit', () => {
  const { game, first } = startedGameAs('llama');
  const me = playerOf(game, first);
  while (me.hand.length < 9) me.hand.push(game.deck.pop());
  assert.deepEqual(drawAction(game, first), {});
  assert.equal(game.prompt?.playerId, first, 'must discard down to seven');
  assert.deepEqual(choose(game, first, game.prompt.candidates.slice(0, game.prompt.n)), {});
  assert.equal(me.hand.length, 7, 'no Cud draw on top of the hand limit');
});

test('Woolly alpacas cannot be destroyed by Magic, even while wild', () => {
  const { game, first, second } = startedGameAs('dragon');
  const them = playerOf(game, second);
  const alpaca = pullCard(game, 'l_alp_cozy');
  them.stable.push(alpaca); // a llama in a unicorn stable is wild
  assert.equal(isLoyal(game, alpaca), false);
  const venom = pullCard(game, 's_venom');
  playerOf(game, first).hand.push(venom);
  assert.deepEqual(playCard(game, first, venom), {});
  passAllResponses(game);
  if (game.prompt?.playerId === first) {
    assert.ok(!game.prompt.candidates.includes(alpaca), 'the alpaca is not a legal Magic target');
    assert.deepEqual(choose(game, first, game.prompt.candidates[0]), {});
  }
  assert.ok(them.stable.includes(alpaca), 'the alpaca is still standing');
});

test('Woolmountain Llama stops its keeper from playing Magic', () => {
  const { game, first } = startedGameAs('llama');
  const me = playerOf(game, first);
  me.stable.push(pullCard(game, 'l_woolmountain'));
  const hay = pullCard(game, 's_pasture');
  me.hand.push(hay);
  assert.match(playCard(game, first, hay).error || '', /Magic/);
  assert.equal(creatureCount(game, first), 3, 'the baby plus a creature that counts as two');
});

/* ================================================================== */
/* Faction decks                                                       */
/* ================================================================== */

test('faction decks: each keeper draws only their own faction (or neutral) cards', () => {
  const game = createGame('DECK');
  const first = addPlayer(game, { token: 'first', name: 'Aster' }).playerId; // dragon
  const second = addPlayer(game, { token: 'second', name: 'Bramble' }).playerId; // unicorn
  assert.deepEqual(setSettings(game, first, { deckMode: 'faction' }), {});
  assert.deepEqual(setSettings(game, first, { deckMode: 'hexagonal' }), { error: 'Unknown deck mode.' });
  const originalRandom = Math.random;
  Math.random = () => 0;
  try { assert.deepEqual(startGame(game, first), {}); } finally { Math.random = originalRandom; }

  assert.deepEqual(Object.keys(game.piles).sort(), ['dragon', 'unicorn'], 'one pile per faction at the table');
  assert.equal(game.deck.length, 0, 'the shared pile is unused');
  const factionOf = (iid) => DEFS[game.inst[iid]].faction || 'neutral';
  assert.ok(game.piles.dragon.every((iid) => ['dragon', 'neutral'].includes(factionOf(iid))));
  assert.ok(game.piles.unicorn.every((iid) => ['unicorn', 'neutral'].includes(factionOf(iid))));
  const everywhere = [...game.piles.dragon, ...game.piles.unicorn, ...game.players.flatMap((p) => p.hand)];
  assert.ok(!everywhere.some((iid) => factionOf(iid) === 'llama'), 'no llama cards at a table with no llama keeper');
  for (const iid of playerOf(game, first).hand) assert.ok(['dragon', 'neutral'].includes(factionOf(iid)));
  for (const iid of playerOf(game, second).hand) assert.ok(['unicorn', 'neutral'].includes(factionOf(iid)));

  assert.equal(viewFor(game, first).deckCount, game.piles.dragon.length, 'each keeper sees their own pile');
  assert.equal(viewFor(game, second).deckCount, game.piles.unicorn.length);
  assert.equal(viewFor(game, first).settings.deckMode, 'faction');
});

test('faction decks: a dry pile reshuffles only its own cards back from the shared discard', () => {
  const game = createGame('DRY');
  const first = addPlayer(game, { token: 'first', name: 'Aster' }).playerId;
  const second = addPlayer(game, { token: 'second', name: 'Bramble' }).playerId;
  assert.deepEqual(setSettings(game, first, { deckMode: 'faction' }), {});
  const originalRandom = Math.random;
  Math.random = () => 0;
  try { assert.deepEqual(startGame(game, first), {}); } finally { Math.random = originalRandom; }
  const factionOf = (iid) => DEFS[game.inst[iid]].faction || 'neutral';

  // Move the whole dragon pile to the discard, plus a few unicorn cards.
  game.discard.push(...game.piles.dragon.splice(0));
  game.discard.push(...game.piles.unicorn.splice(0, 3));
  const unicornInDiscard = game.discard.filter((iid) => factionOf(iid) === 'unicorn').length;
  assert.equal(unicornInDiscard, 3);

  assert.deepEqual(drawAction(game, first), {});
  assert.equal(game.reshuffles, 1, 'a dry pile counts toward the deck-out limit');
  assert.ok(game.piles.dragon.length > 0, 'the dragon pile refilled');
  assert.ok(game.piles.dragon.every((iid) => factionOf(iid) !== 'unicorn'), 'unicorn cards stayed in the discard');
  assert.equal(game.discard.filter((iid) => factionOf(iid) === 'unicorn').length, unicornInDiscard);
});
