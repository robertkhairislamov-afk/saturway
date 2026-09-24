import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { batchExecuteBody, parseBatchExecuteResponse, readSignature, resolveArticleUrl } from '../src/resolve.js';

const batchResponse = readFileSync(new URL('./fixtures/batchexecute.txt', import.meta.url), 'utf8');

test('readSignature finds the signed attributes of an article page', () => {
  const html = '<c-wiz data-n-a-id="CBMi1" data-n-a-ts="1790000000" data-n-a-sg="AbCd-_12"></c-wiz>';
  assert.deepEqual(readSignature(html), { signature: 'AbCd-_12', timestamp: 1790000000 });
  assert.equal(readSignature('<html></html>'), null);
});

test('batchExecuteBody encodes the garturlreq request', () => {
  const body = new URLSearchParams(batchExecuteBody('CBMi1', { signature: 'sig', timestamp: 17 }, 'DE:de'));
  const [[[rpc, request]]] = JSON.parse(body.get('f.req'));
  assert.equal(rpc, 'Fbv4je');
  const parsed = JSON.parse(request);
  assert.equal(parsed[0], 'garturlreq');
  assert.equal(parsed[1][0][7], 'DE:de');
  assert.deepEqual(parsed.slice(2), ['CBMi1', 17, 'sig']);
});

test('parseBatchExecuteResponse reads the publisher URL from a real response', () => {
  assert.equal(
    parseBatchExecuteResponse(batchResponse),
    'https://renewablesnow.com/news/sunrun-tesla-tout-record-580-mw-home-battery-dispatch-in-california-1301775/',
  );
  assert.equal(parseBatchExecuteResponse(")]}'\n\n[]"), null);
  assert.equal(parseBatchExecuteResponse('not json'), null);
});

test('resolveArticleUrl chains the page and batchexecute requests', async () => {
  const calls = [];
  const fetchText = async (url, options = {}) => {
    calls.push({ url, method: options.method ?? 'GET' });
    return options.method === 'POST' ? batchResponse : '<c-wiz data-n-a-ts="17" data-n-a-sg="sig"></c-wiz>';
  };
  const url = await resolveArticleUrl('CBMi1', { hl: 'en-US', gl: 'US', ceid: 'US:en' }, fetchText);
  assert.match(url, /^https:\/\/renewablesnow\.com\//);
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/rss\/articles\/CBMi1\?oc=5&hl=en-US&gl=US&ceid=US%3Aen$/);
  assert.equal(calls[1].method, 'POST');
});
