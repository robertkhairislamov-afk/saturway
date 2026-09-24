// Greenhouse: the public Job Board API (boards-api.greenhouse.io), one request per company board.
// pay_transparency=true adds the structured pay ranges companies publish.

import { makeJob } from '../core/job.js';
import { makeSalary, normalizeInterval, salaryFromText } from '../core/salary.js';
import { decodeEntities, htmlToText } from '../core/text.js';

export const name = 'greenhouse';
export const title = 'Greenhouse';
export const exampleInput = { companies: ['airbnb'] };

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  let slug;
  if (/^https?:\/\//i.test(raw) || /greenhouse\.io/i.test(raw)) {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/(^|\.)greenhouse\.io$/i.test(url.hostname)) {
      throw new Error('this is not a Greenhouse URL. Use the board name from boards.greenhouse.io/<name> or job-boards.greenhouse.io/<name>.');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    slug = url.searchParams.get('for')
      ?? (parts[0] === 'v1' && parts[1] === 'boards' ? parts[2] : parts[0] === 'embed' ? undefined : parts[0]);
  } else {
    // A plain board name; "Door Dash" becomes "doordash".
    slug = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }
  if (!slug) throw new Error('no Greenhouse board name found. Use a board name such as "airbnb" or a boards.greenhouse.io/<name> URL.');
  return { id: slug, key: slug, apiBase: `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}` };
}

// Greenhouse pay ranges come in cents; ranges with the same currency and period are merged.
export function payRange(ranges) {
  const valid = (ranges ?? []).filter((range) => range && (range.min_cents > 0 || range.max_cents > 0));
  if (valid.length === 0) return null;
  const [first] = valid;
  const interval = normalizeInterval(first.title);
  const same = valid.filter((range) => range.currency_type === first.currency_type && normalizeInterval(range.title) === interval);
  const mins = same.map((range) => range.min_cents / 100).filter((v) => v > 0);
  const maxes = same.map((range) => range.max_cents / 100).filter((v) => v > 0);
  return makeSalary({
    min: mins.length > 0 ? Math.min(...mins) : null,
    max: maxes.length > 0 ? Math.max(...maxes) : null,
    currency: first.currency_type,
    interval,
    source: 'ats',
  });
}

function metadataValue(metadata, pattern) {
  for (const field of metadata ?? []) {
    if (!field?.name || !pattern.test(field.name)) continue;
    const value = Array.isArray(field.value) ? field.value.join(', ') : field.value;
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

export function toJob(job, company) {
  // The API returns the description HTML with its tags escaped as entities.
  const descriptionHtml = decodeEntities(job.content ?? '').trim() || null;
  const descriptionText = htmlToText(descriptionHtml) || null;
  return makeJob({
    ats: name,
    company: company.id,
    companyName: job.company_name ?? company.id,
    jobId: job.id,
    requisitionId: job.requisition_id,
    title: job.title,
    department: (job.departments ?? []).map((department) => department?.name).filter(Boolean).join(', '),
    location: job.location?.name,
    locations: (job.offices ?? []).map((office) => office?.location || office?.name),
    workplaceType: metadataValue(job.metadata, /workplace|location type|remote|work arrangement|work model/i),
    employmentType: metadataValue(job.metadata, /employment|job type|time type|commitment|contract type/i),
    salary: payRange(job.pay_input_ranges) ?? salaryFromText(descriptionText),
    postedAt: job.first_published ?? job.updated_at,
    updatedAt: job.updated_at,
    jobUrl: job.absolute_url,
    applyUrl: job.absolute_url,
    descriptionText,
    descriptionHtml,
  });
}

export async function* listJobs(company, { http }) {
  let data;
  try {
    data = await http.getJson(`${company.apiBase}/jobs?content=true&pay_transparency=true`);
  } catch (error) {
    if (error.status === 404) throw new Error(`Greenhouse board "${company.id}" was not found. Check the name in boards.greenhouse.io/<name>.`);
    throw error;
  }
  yield (Array.isArray(data?.jobs) ? data.jobs : []).map((job) => toJob(job, company));
}
