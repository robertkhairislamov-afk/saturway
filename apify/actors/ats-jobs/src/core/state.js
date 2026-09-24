// "Only new jobs" memory: the IDs of jobs already seen, per saved task and company board,
// kept in a named key-value store so it survives between runs.

import { createHash } from 'node:crypto';

export async function openSeenJobs(Actor, ats) {
  const store = await Actor.openKeyValueStore(`${ats}-jobs-seen`);
  const scope = Actor.getEnv().actorTaskId || 'default';
  const keyOf = (companyId) => `seen-${createHash('sha256').update(`${scope}|${companyId}`).digest('hex').slice(0, 32)}`;

  return {
    async load(companyId) {
      const value = await store.getValue(keyOf(companyId));
      return new Set(Array.isArray(value?.ids) ? value.ids : []);
    },
    async save(companyId, ids) {
      await store.setValue(keyOf(companyId), {
        company: companyId,
        task: scope,
        updatedAt: new Date().toISOString(),
        ids: [...ids],
      });
    },
  };
}

// Jobs to remember after a run. When the whole board was read, jobs that were closed are
// forgotten; jobs skipped because of a limit are not remembered, so the next run returns them.
export function nextSeenIds({ before, listed, handled, listingComplete }) {
  const next = new Set(listingComplete ? [...before].filter((id) => listed.has(id)) : before);
  for (const id of handled) next.add(id);
  return next;
}
