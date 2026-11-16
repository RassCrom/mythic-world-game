import assert from 'node:assert/strict';
import test from 'node:test';
import { runSoak } from './soak.js';

// Whole games, bots on every seat, every table size from 2 to 8. Seeded, so a
// failure names the seed that replays it: `npm run soak` reproduces it.
for (const deckMode of ['faction', 'shared']) {
  test(`soak: 150 bot games on ${deckMode} decks all finish cleanly`, () => {
    const s = runSoak({ games: 150, deckMode });
    assert.deepEqual(s.failures, [], 'games that crashed, stuck, looped or lost a card');
    assert.deepEqual(s.botErrors, {}, 'bots proposed moves the engine rejected');
  });
}
