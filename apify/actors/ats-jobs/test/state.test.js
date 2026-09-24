import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextSeenIds } from '../src/core/state.js';

test('nextSeenIds forgets closed jobs only after a complete listing', () => {
  const before = new Set(['a', 'b', 'closed']);
  const listed = new Set(['a', 'b', 'c', 'd']);
  assert.deepEqual([...nextSeenIds({ before, listed, handled: new Set(['c']), listingComplete: true })].sort(), ['a', 'b', 'c']);
  assert.deepEqual([...nextSeenIds({ before, listed, handled: new Set(['c']), listingComplete: false })].sort(), ['a', 'b', 'c', 'closed']);
});
