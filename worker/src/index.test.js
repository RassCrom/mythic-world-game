import assert from 'node:assert/strict';
import test from 'node:test';
import { makeCode, normalizeCode } from './index.js';

test('room codes use five unambiguous characters', () => {
  for (let index = 0; index < 100; index++) {
    assert.match(makeCode(), /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/);
  }
});

test('room code normalization accepts valid codes and rejects malformed input', () => {
  assert.equal(normalizeCode(' qk7xn '), 'QK7XN');
  assert.equal(normalizeCode('AB-CD'), 'ABCD');
  assert.equal(normalizeCode('abc'), null);
  assert.equal(normalizeCode('way-too-long'), null);
});
