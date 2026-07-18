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
    'skipToEnd', 'extraAction',
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
