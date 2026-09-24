// Lever: the public Postings API (api.lever.co, or api.eu.lever.co for EU-hosted boards),
// one request per company. The company name comes from the title of the hosted job board.

import { makeJob } from '../core/job.js';
import { makeSalary, normalizeInterval, salaryFromText } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'lever';
export const title = 'Lever';
export const exampleInput = { companies: ['zoox'] };

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  let slug;
  let eu = false;
  if (/^https?:\/\//i.test(raw) || /lever\.co/i.test(raw)) {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/(^|\.)lever\.co$/i.test(url.hostname)) {
      throw new Error('this is not a Lever URL. Use the company name from jobs.lever.co/<name>.');
    }
    eu = /\.eu\.lever\.co$/i.test(url.hostname);
    const parts = url.pathname.split('/').filter(Boolean);
    slug = parts[0] === 'v0' && parts[1] === 'postings' ? parts[2] : parts[0];
  } else {
    slug = raw.toLowerCase().replace(/\s+/g, '');
  }
  if (!slug) throw new Error('no Lever company name found. Use a name such as "zoox" or a jobs.lever.co/<name> URL.');
  const region = eu ? '.eu' : '';
  return {
    id: slug,
    key: `${eu ? 'eu:' : ''}${slug}`,
    apiUrl: `https://api${region}.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
    boardUrl: `https://jobs${region}.lever.co/${encodeURIComponent(slug)}`,
  };
}

export function leverSalary(range, text) {
  if (range && (range.min > 0 || range.max > 0)) {
    return makeSalary({
      min: range.min,
      max: range.max,
      currency: range.currency,
      interval: normalizeInterval(range.interval),
      source: 'ats',
    });
  }
  return salaryFromText(text);
}

export function toJob(posting, company, companyName) {
  const categories = posting.categories ?? {};
  const lists = (posting.lists ?? []).map((list) => `<h3>${list.text ?? ''}</h3><ul>${list.content ?? ''}</ul>`);
  const descriptionHtml = [posting.description, ...lists, posting.salaryDescription, posting.additional]
    .filter(Boolean)
    .join('\n') || null;
  const descriptionText = htmlToText(descriptionHtml) || null;
  return makeJob({
    ats: name,
    company: company.id,
    companyName: companyName ?? company.id,
    jobId: posting.id,
    title: posting.text,
    department: categories.department,
    team: categories.team,
    location: categories.location,
    locations: categories.allLocations ?? [],
    workplaceType: posting.workplaceType,
    employmentType: categories.commitment,
    salary: leverSalary(posting.salaryRange, descriptionText),
    postedAt: posting.createdAt,
    jobUrl: posting.hostedUrl,
    applyUrl: posting.applyUrl,
    descriptionText,
    descriptionHtml,
  });
}

async function boardTitle(company, http) {
  try {
    const html = await http.getText(company.boardUrl, { retries: 2 });
    return cleanText(/<title>([^<]*)<\/title>/i.exec(html)?.[1]);
  } catch {
    return null;
  }
}

export async function* listJobs(company, { http }) {
  let postings;
  try {
    postings = await http.getJson(company.apiUrl);
  } catch (error) {
    if (error.status === 404) throw new Error(`Lever company "${company.id}" was not found. Check the name in jobs.lever.co/<name>.`);
    throw error;
  }
  if (!Array.isArray(postings)) throw new Error(`Unexpected Lever response for "${company.id}".`);
  const companyName = postings.length > 0 ? await boardTitle(company, http) : null;
  yield postings.map((posting) => toJob(posting, company, companyName));
}
