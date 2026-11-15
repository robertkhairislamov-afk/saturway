// Free company summary: one record per company board read in a run, in its own dataset (results
// are charged only in the default dataset). How many jobs the company has open, in which teams and
// places, how many it posted lately, and how the count changed since earlier runs of the user,
// remembered in a named key-value store of their account.

import { createHash } from 'node:crypto';

import { departmentOf } from './companies.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP = 10;
// One check per day is kept, for this many days.
const HISTORY_DAYS = 120;
export const HISTORY_STORE = 'career-page-company-history';

const top = (counts) => [...counts.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, TOP)
  .map(([name, jobs]) => ({ name, jobs }));

function countBy(jobs, keyOf) {
  const counts = new Map();
  for (const job of jobs) {
    const key = keyOf(job);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// When a job was posted: a date, or "posted 3 days ago" (Workday's job lists).
function postedTime(job, now) {
  const date = job.postedAt ? Date.parse(job.postedAt) : NaN;
  if (!Number.isNaN(date)) return date;
  return Number.isFinite(job.postedDaysAgo) ? now - job.postedDaysAgo * DAY_MS : null;
}

// The open-job count of the latest check made at least `days` days ago.
function countDaysAgo(checks, now, days) {
  const before = checks.filter((check) => Date.parse(check.at) <= now - days * DAY_MS);
  return before.length > 0 ? before[before.length - 1] : null;
}

// complete: the whole board was listed, so the number of jobs is the number of open jobs.
// openJobs: the board's own count when its jobs were not all listed (Workday).
export function summarizeCompany({ company, companyName, fallbackName, ats, jobs, matchingJobs, savedJobs, complete, openJobs: counted = null, checks = [], now = Date.now() }) {
  const dated = jobs.map((job) => postedTime(job, now)).filter((time) => time != null);
  const newSince = (days) => (dated.length > 0 && complete ? dated.filter((time) => time >= now - days * DAY_MS).length : null);
  const openJobs = complete ? jobs.length : counted;
  const earlier = checks.filter((check) => check.at.slice(0, 10) !== new Date(now).toISOString().slice(0, 10));
  const previous = earlier.at(-1) ?? null;
  const change = (days) => {
    const check = countDaysAgo(earlier, now, days);
    return check && openJobs != null ? openJobs - check.openJobs : null;
  };
  const workplace = countBy(jobs, (job) => job.workplaceType ?? (job.remote ? 'remote' : null));
  return {
    company,
    companyName: companyName ?? jobs.find((job) => job.companyName)?.companyName ?? fallbackName ?? null,
    ats,
    openJobs,
    jobsListed: jobs.length,
    matchingJobs,
    savedJobs,
    newJobsLast7Days: newSince(7),
    newJobsLast30Days: newSince(30),
    openJobsChange7Days: change(7),
    openJobsChange30Days: change(30),
    previousOpenJobs: previous?.openJobs ?? null,
    previousCheckAt: previous?.at ?? null,
    // Greenhouse departments can start with an internal number: "1185 Account Executives (EMEA)".
    departments: top(countBy(jobs, (job) => (job.department ? job.department.replace(/^\d{3,}\s+/, '') : departmentOf(job.title)))),
    locations: top(countBy(jobs, (job) => job.location)),
    remoteJobs: workplace.get('remote') ?? 0,
    hybridJobs: workplace.get('hybrid') ?? 0,
    onsiteJobs: workplace.get('onsite') ?? 0,
    jobsWithSalary: jobs.filter((job) => job.salary).length,
    latestPostedAt: dated.length > 0 ? new Date(Math.max(...dated)).toISOString() : null,
    checkedAt: new Date(now).toISOString(),
  };
}

// Today's check replaces an earlier one of the same day; checks older than HISTORY_DAYS are dropped.
export function nextChecks(checks, openJobs, now = Date.now()) {
  const today = new Date(now).toISOString();
  const kept = checks.filter((check) => check.at.slice(0, 10) !== today.slice(0, 10) && Date.parse(check.at) >= now - HISTORY_DAYS * DAY_MS);
  return [...kept, { at: today, openJobs }];
}

export async function openCompanyHistory(Actor) {
  const store = await Actor.openKeyValueStore(HISTORY_STORE);
  const keyOf = (id) => `company-${createHash('sha256').update(id).digest('hex').slice(0, 32)}`;
  return {
    async load(id) {
      const value = await store.getValue(keyOf(id));
      return Array.isArray(value?.checks) ? value.checks : [];
    },
    async save(id, name, checks) {
      await store.setValue(keyOf(id), { company: id, companyName: name, checks });
    },
  };
}
