import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFS } from '../../shared/cards.js';
import {
  addPlayer,
  choose,
  createGame,
  drawAction,
  expireTurn,
  passWindow,
  playCard,
  startGame,
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
    assert.equal(game.inst[player.stable[0]], 'baby_dragon');
  }
  assert.equal(game.nest.length, 11);
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
    'volcanicPurge',
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
