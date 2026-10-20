// "Only new rising queries" memory: the rising queries already seen for each keyword, location and
// time range, per saved task, kept in a named key-value store so it survives between runs.

import { createHash } from 'node:crypto';

const MAX_REMEMBERED = 3000;

export const memoryKeyOf = (item, options) => [item.keyword, item.geo, options.time, options.category, options.property].join('|');

export async function openRisingMemory(Actor) {
  const store = await Actor.openKeyValueStore('google-trends-rising-seen');
  const scope = Actor.getEnv().actorTaskId || 'default';
  const keyOf = (key) => `seen-${createHash('sha256').update(`${scope}|${key}`).digest('hex').slice(0, 32)}`;
  return {
    async load(key) {
      const value = await store.getValue(keyOf(key));
      return new Set(Array.isArray(value?.queries) ? value.queries : []);
    },
    async save(key, queries) {
      await store.setValue(keyOf(key), { key, task: scope, updatedAt: new Date().toISOString(), queries: [...new Set(queries)].slice(-MAX_REMEMBERED) });
    },
  };
}
