import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';

// Requests to the local test server must not go through a proxy from the environment.
process.env.NO_PROXY = [process.env.NO_PROXY, '127.0.0.1', 'localhost'].filter(Boolean).join(',');
const { createHttpClient } = await import('../src/core/http.js');

const EMPTY = '<!DOCTYPE html>\n\n<!---->';
const hits = new Map();
let server;
let base;

before(async () => {
  server = createServer((req, res) => {
    const count = (hits.get(req.url) ?? 0) + 1;
    hits.set(req.url, count);
    if (req.url === '/empty-twice') return res.end(count <= 2 ? EMPTY : '<li data-entity-urn="urn:li:jobPosting:1"></li>');
    if (req.url === '/limited-once') {
      res.statusCode = count === 1 ? 999 : 200;
      return res.end(count === 1 ? '' : '{"ok":true}');
    }
    if (req.url === '/always-empty') return res.end(EMPTY);
    if (req.url === '/ok') return res.end('{"ok":true}');
    res.statusCode = 404;
    return res.end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const http = createHttpClient({ backoffMs: 1, maxRetries: 4 });
const hasJobs = (text) => text.includes('jobPosting');

test('http: a page the check rejects is retried until a real one comes', async () => {
  const text = await http.getText(`${base}/empty-twice`, { accept: hasJobs, rotate: true });
  assert.match(text, /jobPosting:1/);
  assert.equal(hits.get('/empty-twice'), 3);
});

test('http: status 999 is a limit and is retried', async () => {
  assert.deepEqual(await http.getJson(`${base}/limited-once`), { ok: true });
  assert.equal(hits.get('/limited-once'), 2);
});

test('http: the rotating proxy is set up once, on the first rotating request', async () => {
  let created = 0;
  // Without a proxy (as in local runs) requests go out directly.
  const client = createHttpClient({ backoffMs: 1, rotatingProxy: async () => { created++; return null; } });
  await client.getJson(`${base}/ok`);
  assert.equal(created, 0);
  await client.getJson(`${base}/ok`, { rotate: true });
  await client.getJson(`${base}/ok`, { rotate: true });
  assert.equal(created, 1);
  assert.deepEqual(client.stats, { requests: 3, retried: 0, limited: 0, blocked: 0 });
});

test('http: a page that stays empty fails as blocked after the retries', async () => {
  const before = { ...http.stats };
  await assert.rejects(http.getText(`${base}/always-empty`, { accept: hasJobs, retries: 3 }), (error) => error.blocked === true);
  assert.equal(hits.get('/always-empty'), 3);
  assert.equal(http.stats.blocked - before.blocked, 3);
  assert.equal(http.stats.retried - before.retried, 2);
  await assert.rejects(http.getText(`${base}/missing`), (error) => error.status === 404 && error.retryable === false);
});
