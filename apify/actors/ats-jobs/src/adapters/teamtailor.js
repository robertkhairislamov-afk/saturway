// Teamtailor: the RSS feed of a company's career site (https://<company>.teamtailor.com/jobs.rss),
// which Teamtailor documents for sharing jobs with job boards and other channels. One request per
// company; the feed lists every published job with locations, department and remote status.

import { makeJob } from '../core/job.js';
import { salaryFromText } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';
import { blocks, tagText } from '../core/xml.js';
import { companyFromTitle } from './personio.js';

export const name = 'teamtailor';
export const title = 'Teamtailor';
export const exampleInput = { companies: ['career'] };

export const HOST = /(^|\.)teamtailor\.com$/i;

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  let slug;
  if (/^https?:\/\//i.test(raw) || /teamtailor\.com/i.test(raw)) {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!HOST.test(url.hostname) || /^(www|app|api|support|partner)\./i.test(url.hostname)) {
      throw new Error('this is not a Teamtailor career site. Use the company name from <name>.teamtailor.com.');
    }
    slug = url.hostname.split('.')[0];
  } else {
    slug = raw.toLowerCase().replace(/\s+/g, '');
  }
  if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw new Error('no Teamtailor company name found. Use a name or a <name>.teamtailor.com link.');
  return {
    id: slug,
    key: slug,
    feedUrl: `https://${slug}.teamtailor.com/jobs.rss`,
    boardUrl: `https://${slug}.teamtailor.com/jobs`,
  };
}

function locationsOf(item) {
  return blocks(item, 'tt:location').map((loc) => {
    const city = tagText(loc, 'tt:city') ?? tagText(loc, 'tt:name');
    const country = tagText(loc, 'tt:country');
    return [city, country].filter(Boolean).join(', ');
  }).filter(Boolean);
}

export function toJob(item, company, companyName) {
  const link = tagText(item, 'link');
  const descriptionHtml = tagText(item, 'description');
  const descriptionText = htmlToText(descriptionHtml) || null;
  const locations = locationsOf(item);
  const remote = tagText(item, 'remoteStatus');
  return makeJob({
    ats: name,
    company: company.id,
    companyName: companyName ?? company.id,
    jobId: /\/jobs\/(\d+)/.exec(link ?? '')?.[1] ?? tagText(item, 'guid'),
    title: tagText(item, 'title'),
    department: tagText(item, 'tt:department'),
    team: tagText(item, 'tt:role'),
    location: locations[0] ?? null,
    locations,
    // "none" means on-site; "fully" and "temporary" remote are both remote.
    workplaceType: remote === 'none' ? 'onsite' : remote === 'hybrid' ? 'hybrid' : remote ? 'remote' : null,
    salary: salaryFromText(descriptionText),
    postedAt: tagText(item, 'pubDate'),
    jobUrl: link,
    applyUrl: link,
    descriptionText,
    descriptionHtml,
  });
}

export async function* listJobs(company, { http }) {
  let xml;
  try {
    xml = await http.getText(company.feedUrl);
  } catch (error) {
    if (error.status === 404) throw new Error(`Teamtailor company "${company.id}" was not found. Check the name in <name>.teamtailor.com.`);
    throw error;
  }
  if (!/<rss[\s>]/i.test(xml)) throw new Error(`Teamtailor company "${company.id}" has no public job feed.`);
  const channel = blocks(xml, 'channel')[0] ?? xml;
  const channelTitle = cleanText(tagText(channel.split('<item>')[0], 'title'));
  const companyName = companyFromTitle(channelTitle) ?? channelTitle;
  yield blocks(xml, 'item').map((item) => toJob(item, company, companyName));
}
