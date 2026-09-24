// Job filters shared by all ATS. A partial job (a Workday search result before its details are
// loaded) is rejected only on the fields it already has, so no matching job is lost.

import { compileTerms, matchesAny } from './match.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createJobFilter(options = {}, now = new Date()) {
  const {
    keywords = [],
    excludeKeywords = [],
    locations = [],
    departments = [],
    remoteOnly = false,
    postedWithinDays = 0,
    onlyWithSalary = false,
  } = options;

  const include = compileTerms(keywords);
  const exclude = compileTerms(excludeKeywords);
  const places = compileTerms(locations);
  const remotePlace = [].concat(locations ?? []).some((place) => /^\s*remote\s*$/i.test(String(place)));
  const teams = compileTerms(departments);
  // "Posted within N days" counts whole days: 1 means today and yesterday (UTC).
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const since = postedWithinDays > 0 ? today - postedWithinDays * DAY_MS : null;

  const titleMatches = (title) => (include.length === 0 || matchesAny(include, [title])) && !matchesAny(exclude, [title]);

  function locationMatches(job) {
    if (places.length === 0) return true;
    if (job.locations === undefined) return true;
    if (matchesAny(places, [job.location, ...job.locations])) return true;
    if (!remotePlace) return false;
    return job.remote === undefined ? true : job.remote === true;
  }

  function dateMatches(job) {
    if (!since) return true;
    if (job.postedAt) return Date.parse(job.postedAt) >= since;
    // Workday search results only say "Posted 5 Days Ago"; allow one day of rounding.
    if (job.postedDaysAgo != null) return job.postedDaysAgo <= postedWithinDays + 1;
    return true;
  }

  return {
    matches(job) {
      if (!titleMatches(job.title)) return false;
      if (remoteOnly && job.remote === false) return false;
      if (remoteOnly && job.remote == null && !job.partial) return false;
      if (!locationMatches(job)) return false;
      if (teams.length > 0 && !job.partial && !matchesAny(teams, [job.department, job.team])) return false;
      if (!dateMatches(job)) return false;
      if (onlyWithSalary && !job.partial && !job.salary) return false;
      return true;
    },
  };
}
