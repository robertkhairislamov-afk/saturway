// Workday: the JSON API behind public career sites (*.myworkdayjobs.com). Search results are
// read page by page, then each new matching job is loaded for its description and dates.
// Workday returns at most 2,000 results per search, so bigger searches are split by the
// site's own filters (job category, location, ...) and merged without duplicates.

import { makeJob } from '../core/job.js';
import { searchTextOf } from '../core/match.js';
import { salaryFromText } from '../core/salary.js';
import { htmlToText } from '../core/text.js';

export const name = 'workday';
export const title = 'Workday';
export const exampleInput = { companies: ['https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite'], maxItems: 50 };
// Several companies run in parallel, and each loads job details in parallel too.
export const companyConcurrency = 2;
export const detailConcurrency = 12;

const PAGE_SIZE = 20;
const PAGE_CONCURRENCY = 5;
const MAX_RESULTS = 2000;
const MAX_SPLIT_DEPTH = 3;
const LOCALE = /^[a-z]{2}(?:-[A-Za-z]{2,4})?$/;
const FACET_ID = /^[0-9a-f]{32}$/i;

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  const host = url.hostname.toLowerCase();
  if (!/\.(myworkdayjobs|myworkdaysite|myworkday)\.com$/.test(host)) {
    throw new Error('this is not a Workday career site URL. Open the company\'s job search page and copy its address, for example https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite.');
  }
  const parts = url.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  let tenant;
  let site;
  let sitePath;
  if (parts[0] === 'wday' && parts[1] === 'cxs') {
    [, , tenant, site] = parts;
    sitePath = `/${site}`;
  } else {
    const rest = LOCALE.test(parts[0] ?? '') ? parts.slice(1) : parts;
    if (rest[0] === 'recruiting') {
      [, tenant, site] = rest;
      sitePath = `/recruiting/${tenant}/${site}`;
    } else {
      tenant = host.split('.')[0];
      [site] = rest;
      sitePath = `/${site}`;
    }
  }
  if (!tenant || !site) {
    throw new Error('no career site found in this URL. Copy the address of the job search page, for example https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite.');
  }

  // Filters of a copied search URL (?jobFamilyGroup=<id>&locations=<id>) become Workday facets.
  const appliedFacets = {};
  let searchText = '';
  for (const [key, facetValue] of url.searchParams) {
    if (key === 'q') searchText = facetValue.trim();
    else if (FACET_ID.test(facetValue)) (appliedFacets[key] ??= []).push(facetValue);
  }
  const query = new URLSearchParams([
    ...(searchText ? [['q', searchText]] : []),
    ...Object.entries(appliedFacets).flatMap(([key, ids]) => ids.map((id) => [key, id])),
  ]).toString();

  return {
    id: `${tenant}/${site}`,
    key: `${host}/${tenant}/${site}${query ? `?${query}` : ''}`,
    tenant,
    apiBase: `https://${host}/wday/cxs/${encodeURIComponent(tenant)}/${encodeURIComponent(site)}`,
    siteUrl: `https://${host}${sitePath}`,
    appliedFacets,
    searchText,
  };
}

// "Posted Today", "Posted Yesterday", "Posted 3 Days Ago", "Posted 30+ Days Ago".
export function postedDaysAgo(text) {
  const value = String(text ?? '').toLowerCase();
  if (/today/.test(value)) return 0;
  if (/yesterday/.test(value)) return 1;
  const days = /(\d+)\+?\s*days?/.exec(value);
  return days ? Number(days[1]) : null;
}

// A search result: enough to filter by title (and by location when it has only one).
export function toPartialJob(posting) {
  const externalPath = String(posting.externalPath ?? '');
  const locationsText = posting.locationsText?.trim();
  const single = locationsText && !/^\d+\s+\S+$/.test(locationsText);
  return {
    partial: true,
    jobId: externalPath.split('/').filter(Boolean).pop(),
    title: posting.title,
    externalPath,
    location: single ? locationsText : undefined,
    locations: single ? [locationsText] : undefined,
    postedDaysAgo: postedDaysAgo(posting.postedOn),
  };
}

export function toJob(info, partial, company) {
  const descriptionHtml = info.jobDescription?.trim() || null;
  const descriptionText = htmlToText(descriptionHtml) || null;
  const jobUrl = info.externalUrl || `${company.siteUrl}${partial.externalPath}`;
  return makeJob({
    ats: name,
    company: company.id,
    companyName: company.tenant,
    jobId: partial.jobId,
    requisitionId: info.jobReqId,
    title: info.title ?? partial.title,
    location: info.location ?? partial.location,
    locations: info.additionalLocations ?? [],
    workplaceType: info.remoteType,
    employmentType: info.timeType,
    salary: salaryFromText(descriptionText),
    postedAt: info.startDate,
    jobUrl,
    applyUrl: `${jobUrl.replace(/\/+$/, '')}/apply`,
    descriptionText,
    descriptionHtml,
  });
}

export async function completeJob(partial, company, { http }) {
  let data;
  try {
    data = await http.getJson(`${company.apiBase}${partial.externalPath}`);
  } catch (error) {
    if (error.status === 404 || error.status === 410) return null;
    throw error;
  }
  return data?.jobPostingInfo ? toJob(data.jobPostingInfo, partial, company) : null;
}

// Facet groups a search can be split by. Location facets are often nested in a group.
function facetGroups(facets) {
  const groups = [];
  for (const facet of facets ?? []) {
    const values = facet?.values ?? [];
    const nested = values.filter((value) => value?.facetParameter && Array.isArray(value.values));
    if (nested.length > 0) {
      for (const group of nested) groups.push({ parameter: group.facetParameter, descriptor: group.descriptor, values: group.values });
    } else {
      groups.push({ parameter: facet?.facetParameter, descriptor: facet?.descriptor, values });
    }
  }
  return groups
    .map((group) => {
      const values = group.values.filter((value) => value?.id && value.count > 0);
      return {
        ...group,
        values,
        sum: values.reduce((total, value) => total + value.count, 0),
        largest: Math.max(0, ...values.map((value) => value.count)),
      };
    })
    .filter((group) => group.parameter && group.values.length > 1);
}

// Picks the facet that covers every job with the fewest requests. Facets where each job has
// exactly one value (job category, time type) share the same sum, the real number of jobs.
export function chooseSplit(facets, appliedFacets = {}) {
  const groups = facetGroups(facets).filter((group) => !(group.parameter in appliedFacets));
  if (groups.length === 0) return null;
  const sums = groups.map((group) => group.sum);
  const repeated = sums.filter((sum, index) => sums.indexOf(sum) !== index);
  const total = repeated.length > 0 ? Math.max(...repeated) : Math.max(...sums);
  const complete = groups.filter((group) => group.sum >= total * 0.99);
  complete.sort((a, b) => Number(b.largest < MAX_RESULTS) - Number(a.largest < MAX_RESULTS)
    || a.sum - b.sum
    || a.values.length - b.values.length);
  return complete[0] ?? null;
}

async function* search(company, context, searchText, appliedFacets, depth) {
  const { http, log } = context;
  const fetchPage = (offset) => http.postJson(`${company.apiBase}/jobs`, { appliedFacets, limit: PAGE_SIZE, offset, searchText });
  const first = await fetchPage(0);
  const total = Number(first?.total) || 0;
  if (total >= MAX_RESULTS) {
    const split = depth < MAX_SPLIT_DEPTH ? chooseSplit(first.facets, appliedFacets) : null;
    if (split) {
      log.info(`${company.id}: over ${MAX_RESULTS} jobs${searchText ? ` for "${searchText}"` : ''}; Workday lists at most ${MAX_RESULTS} per search, so searching each ${split.descriptor ?? split.parameter} separately (${split.values.length}).`);
      for (const value of split.values) {
        yield* search(company, context, searchText, { ...appliedFacets, [split.parameter]: [value.id] }, depth + 1);
      }
      return;
    }
    log.warning(`${company.id}: Workday lists at most ${MAX_RESULTS} jobs per search and this search cannot be split further; some jobs may be missing.`);
  }
  yield (first?.jobPostings ?? []).map(toPartialJob);
  // The remaining pages are known from the total, so a few are loaded at once.
  const offsets = [];
  for (let offset = PAGE_SIZE; offset < Math.min(total, MAX_RESULTS); offset += PAGE_SIZE) offsets.push(offset);
  for (let start = 0; start < offsets.length; start += PAGE_CONCURRENCY) {
    const pages = await Promise.all(offsets.slice(start, start + PAGE_CONCURRENCY).map(fetchPage));
    for (const page of pages) {
      const postings = page?.jobPostings ?? [];
      if (postings.length === 0) return;
      yield postings.map(toPartialJob);
    }
  }
}

// With keywords, Workday searches for each of them on the server; titles are checked again locally.
export async function* listJobs(company, context) {
  const keywords = [...new Set((context.keywords ?? []).map(searchTextOf).filter(Boolean))];
  const searches = keywords.length > 0 ? keywords : [company.searchText];
  try {
    for (const searchText of searches) yield* search(company, context, searchText, company.appliedFacets, 0);
  } catch (error) {
    if (error.status === 404 || error.status === 422) {
      throw new Error(`Workday career site "${company.id}" was not found. Copy the address of the job search page from your browser.`);
    }
    throw error;
  }
}
