// Personio: the job XML feed every Personio career site publishes for job boards
// (https://<company>.jobs.personio.de/xml, documented at developer.personio.de, no key needed),
// one request per company. English is asked for first; boards without English get their default.

import { makeJob } from '../core/job.js';
import { salaryFromText } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';
import { blocks, tagText } from '../core/xml.js';

export const name = 'personio';
export const title = 'Personio';
export const exampleInput = { companies: ['tado'] };

export const HOST = /(^|\.)jobs\.personio\.(de|com)$/i;

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  let slug;
  if (/^https?:\/\//i.test(raw) || /personio\./i.test(raw)) {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!HOST.test(url.hostname)) throw new Error('this is not a Personio career site. Use the company name from <name>.jobs.personio.de.');
    slug = url.hostname.split('.')[0];
  } else {
    slug = raw.toLowerCase().replace(/\s+/g, '');
  }
  if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw new Error('no Personio company name found. Use a name such as "personio" or a <name>.jobs.personio.de link.');
  return {
    id: slug,
    key: slug,
    feedUrl: `https://${slug}.jobs.personio.de/xml`,
    boardUrl: `https://${slug}.jobs.personio.de`,
  };
}

// Personio writes "permanent", "intern", "trainee", "freelance"… and separately "full-time" or
// "part-time"; the working hours say more, the contract type is used when they are missing.
function employmentOf(position) {
  const schedule = tagText(position, 'schedule');
  const type = tagText(position, 'employmentType');
  if (type && /intern|trainee|freelance|temporary|working_student|apprentice/i.test(type)) return type.replace(/_/g, ' ');
  return schedule ?? type;
}

export function toJob(position, company, companyName) {
  const sections = blocks(position, 'jobDescription').map((section) => {
    const heading = tagText(section, 'name');
    const body = tagText(section, 'value') ?? '';
    return `${heading ? `<h3>${heading}</h3>` : ''}${body}`;
  });
  const descriptionHtml = sections.join('\n') || null;
  const descriptionText = htmlToText(descriptionHtml) || null;
  const id = tagText(position, 'id');
  const offices = [tagText(position, 'office'), ...blocks(position, 'additionalOffices').flatMap((list) => blocks(list, 'office').map((o) => cleanText(o)))].filter(Boolean);
  return makeJob({
    ats: name,
    company: company.id,
    companyName: companyName ?? tagText(position, 'subcompany') ?? company.id,
    jobId: id,
    title: tagText(position, 'name'),
    department: tagText(position, 'department'),
    team: tagText(position, 'recruitingCategory'),
    location: offices[0] ?? null,
    locations: offices,
    employmentType: employmentOf(position),
    salary: salaryFromText(descriptionText),
    postedAt: tagText(position, 'createdAt'),
    jobUrl: `${company.boardUrl}/job/${id}`,
    applyUrl: `${company.boardUrl}/job/${id}#apply`,
    descriptionText,
    descriptionHtml,
  });
}

async function boardTitle(company, http) {
  try {
    const html = await http.getText(company.boardUrl, { retries: 2 });
    // "Jobs at Acme GmbH" or "Acme GmbH - Jobs": the company part.
    const text = cleanText(/<title>([^<]*)<\/title>/i.exec(html)?.[1]);
    return text ? cleanText(text.replace(/^(jobs|karriere|careers?|stellenangebote)\s+(at|bei)\s+/i, '').replace(/\s*[-|–]\s*(jobs|karriere|careers?|stellenangebote).*$/i, '')) : null;
  } catch {
    return null;
  }
}

export async function* listJobs(company, { http }) {
  let xml;
  try {
    xml = await http.getText(`${company.feedUrl}?language=en`);
  } catch (error) {
    if (error.status === 404) throw new Error(`Personio company "${company.id}" was not found. Check the name in <name>.jobs.personio.de.`);
    throw error;
  }
  if (!/<workzag-jobs/i.test(xml)) throw new Error(`Personio company "${company.id}" has no public job feed.`);
  let positions = blocks(xml, 'position');
  if (positions.length === 0) {
    // Boards without English answer an empty English feed; the default language has the jobs.
    xml = await http.getText(company.feedUrl);
    positions = blocks(xml, 'position');
  }
  const companyName = positions.length > 0 ? await boardTitle(company, http) : null;
  yield positions.map((position) => toJob(position, company, companyName));
}
