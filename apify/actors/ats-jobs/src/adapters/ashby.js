// Ashby: the public Job Posting API (api.ashbyhq.com), one request per job board, with
// compensation. The company name and website come from the hosted job board.

import { makeJob } from '../core/job.js';
import { makeSalary, normalizeInterval, salaryFromText } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'ashby';
export const title = 'Ashby';
export const exampleInput = { companies: ['ramp'] };

const ORGANIZATION_QUERY = `query ApiOrganizationFromHostedJobsPageName($organizationHostedJobsPageName: String!, $searchContext: OrganizationSearchContext) {
  organization: organizationFromHostedJobsPageName(organizationHostedJobsPageName: $organizationHostedJobsPageName, searchContext: $searchContext) { name }
}`;

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  let board;
  if (/^https?:\/\//i.test(raw) || /ashbyhq\.com/i.test(raw)) {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/(^|\.)ashbyhq\.com$/i.test(url.hostname)) {
      throw new Error('this is not an Ashby URL. Use the board name from jobs.ashbyhq.com/<name>.');
    }
    const parts = url.pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
    board = parts[0] === 'posting-api' && parts[1] === 'job-board' ? parts[2] : parts[0];
  } else {
    board = raw;
  }
  if (!board) throw new Error('no Ashby job board name found. Use a name such as "ramp" or a jobs.ashbyhq.com/<name> URL.');
  return {
    id: board,
    key: board.toLowerCase(),
    apiUrl: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}?includeCompensation=true`,
  };
}

const SALARY_TYPES = /salary|hourly|wage/i;

export function ashbySalary(compensation, text) {
  const components = [
    ...(compensation?.summaryComponents ?? []),
    ...(compensation?.compensationTiers ?? []).flatMap((tier) => tier?.components ?? []),
  ];
  const pay = components.find((c) => SALARY_TYPES.test(c?.compensationType ?? '') && (c.minValue > 0 || c.maxValue > 0));
  if (!pay) return salaryFromText(text);
  return makeSalary({
    min: pay.minValue,
    max: pay.maxValue,
    currency: pay.currencyCode,
    interval: normalizeInterval(pay.interval),
    text: compensation.scrapeableCompensationSalarySummary ?? compensation.compensationTierSummary,
    source: 'ats',
  });
}

export function toJob(job, company, companyName) {
  const descriptionHtml = job.descriptionHtml?.trim() || null;
  const descriptionText = job.descriptionPlain?.trim() || htmlToText(descriptionHtml) || null;
  return makeJob({
    ats: name,
    company: company.id,
    companyName: companyName ?? company.id,
    jobId: job.id,
    title: job.title,
    department: job.department,
    team: job.team,
    location: job.location,
    locations: (job.secondaryLocations ?? []).map((secondary) => secondary?.location),
    remote: job.isRemote === true,
    workplaceType: job.workplaceType,
    employmentType: job.employmentType,
    salary: ashbySalary(job.compensation, descriptionText),
    postedAt: job.publishedAt,
    updatedAt: job.updatedAt,
    jobUrl: job.jobUrl,
    applyUrl: job.applyUrl,
    descriptionText,
    descriptionHtml,
  });
}

async function organizationName(company, http) {
  try {
    const data = await http.postJson('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiOrganizationFromHostedJobsPageName', {
      operationName: 'ApiOrganizationFromHostedJobsPageName',
      variables: { organizationHostedJobsPageName: company.id, searchContext: 'JobBoard' },
      query: ORGANIZATION_QUERY,
    }, { retries: 2 });
    return cleanText(data?.data?.organization?.name);
  } catch {
    return null;
  }
}

export async function* listJobs(company, { http }) {
  let data;
  try {
    data = await http.getJson(company.apiUrl);
  } catch (error) {
    if (error.status === 404) throw new Error(`Ashby job board "${company.id}" was not found. Check the name in jobs.ashbyhq.com/<name>.`);
    throw error;
  }
  const jobs = (Array.isArray(data?.jobs) ? data.jobs : []).filter((job) => job.isListed !== false);
  const companyName = jobs.length > 0 ? await organizationName(company, http) : null;
  yield jobs.map((job) => toJob(job, company, companyName));
}
