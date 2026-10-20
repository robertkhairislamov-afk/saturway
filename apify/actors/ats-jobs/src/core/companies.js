// "Hiring companies": the jobs of a run grouped into one record per employer, with the employer's
// details, how many jobs it posts, in which teams and places, and how recently. Sales teams use
// these records as leads: a company that hires is growing and buying.

import { cleanText } from './text.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP = 10;
const SAMPLE_JOBS = 5;

// Teams by words of the job title, checked in this order ("data engineer" is Data, "sales
// engineer" is Sales, "engineering manager" is Engineering).
const DEPARTMENTS = [
  ['Sales', /\bsales\b|account executive|account manager|business development|\b[bs]dr\b|inside sales|key account/i],
  ['Data & AI', /\bdata\b|analytics|machine learning|\bml\b|\bai\b|artificial intelligence|business intelligence|\bbi\b/i],
  ['Engineering & IT', /engineer|developer|software|devops|\bsre\b|programmer|architect|\bqa\b|tester|\bit\b|systems admin|network|cyber|security analyst|cloud/i],
  ['Product & Design', /product (manager|owner|lead)|designer|\bux\b|\bui\b|creative director/i],
  ['Marketing', /marketing|\bseo\b|content|brand|social media|growth|communications|public relations|\bpr\b|copywriter/i],
  ['Customer Support', /customer (service|support|success|care)|support (specialist|agent|representative)|call cent(er|re)|help ?desk|client services/i],
  ['Finance & Accounting', /accountant|accounting|finance|financial|bookkeep|payroll|controller|audit|\btax\b|billing/i],
  ['HR & Recruiting', /human resources|\bhr\b|recruit|talent acquisition|people (partner|operations)/i],
  ['Healthcare', /nurse|\brn\b|\blpn\b|physician|doctor|medical|clinical|therapist|pharmac|dental|caregiver|patient|health/i],
  ['Legal', /lawyer|attorney|legal|paralegal|counsel|compliance/i],
  ['Education', /teacher|tutor|professor|lecturer|instructor|education|school/i],
  ['Operations & Logistics', /operations|logistics|warehouse|supply chain|driver|delivery|forklift|procurement|purchasing|dispatcher|fulfil/i],
  ['Manufacturing & Trades', /technician|mechanic|electrician|plumber|welder|machinist|maintenance|manufactur|production|assembl|construction|hvac|carpenter|operator/i],
  ['Retail & Hospitality', /retail|store|cashier|barista|server|waiter|waitress|cook|chef|restaurant|hotel|hospitality|housekeep/i],
  ['Administrative', /administrative|admin assistant|receptionist|office manager|executive assistant|clerk|secretary|coordinator/i],
];
export const departmentOf = (title) => DEPARTMENTS.find(([, pattern]) => pattern.test(title ?? ''))?.[0] ?? 'Other';

// Employers hidden behind "Confidential" are no lead.
const HIDDEN = /^(company )?confidential\b|^confidential company\b|^(private|undisclosed|anonymous)( company| employer)?$/i;
const STAFFING_INDUSTRY = /staffing|recruit|hr consulting|employment (agenc|services)|temporary help|outsourc/i;
const STAFFING_NAME = /\b(staffing|recruit(ment|ing|ers)?|personnel|employment (agency|services)|talent solutions|workforce solutions|headhunt\w*)\b/i;
export const isStaffingAgency = (job) => STAFFING_INDUSTRY.test(job.companyIndustry ?? '') || STAFFING_NAME.test(job.companyName ?? '');

// The details of a company that its jobs carry; the first job that names a detail gives it.
const COMPANY_FIELDS = ['companyRating', 'companyUrl', 'companyWebsite', 'companyLogo', 'companySize', 'companyRevenue', 'companyType', 'companyIndustry', 'companyFounded', 'companyHeadquarters'];

// Every company record has the same keys in the same order.
export const EMPTY_COMPANY = {
  companyName: null, companyId: null, companyDomain: null,
  ...Object.fromEntries(COMPANY_FIELDS.map((field) => [field, null])),
  isStaffingAgency: null,
  jobs: null, jobsLast7Days: null, jobsLast30Days: null, remoteJobs: null, jobsWithSalary: null,
  departments: null, topJobTitles: null, locations: null, countries: null, salaryRange: null,
  newestJobAt: null, oldestJobAt: null, sampleJobs: null, searches: null, scrapedAt: null,
};

const domainOf = (website) => {
  try {
    return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./, '').toLowerCase() || null;
  } catch {
    return null;
  }
};
const counted = (map, limit = TOP) => [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, limit);

export function createCompanyCollector({ excludeStaffingAgencies = false } = {}) {
  const companies = new Map();
  const skipped = { hidden: 0, staffing: 0, unnamed: 0 };

  function add(job, sourceLabel) {
    const name = cleanText(job.companyName);
    if (!name) {
      skipped.unnamed++;
      return false;
    }
    if (HIDDEN.test(name)) {
      skipped.hidden++;
      return false;
    }
    const staffing = isStaffingAgency(job);
    if (staffing && excludeStaffingAgencies) {
      skipped.staffing++;
      return false;
    }
    const key = job.company ? `id:${job.company}` : `name:${name.toLowerCase()}`;
    let company = companies.get(key);
    if (!company) {
      company = { name, id: job.company ?? null, details: {}, staffing, jobs: [], titles: new Map(), places: new Map(), countries: new Set(), departments: new Map(), searches: new Set() };
      companies.set(key, company);
    }
    for (const field of COMPANY_FIELDS) {
      if (company.details[field] == null && job[field] != null) company.details[field] = job[field];
    }
    company.jobs.push(job);
    // Glassdoor's normalized title groups variants ("sr. account executive, west"); its catch-alls
    // "other" and "… non title" say nothing, so the job's own title is used instead.
    const normalized = cleanText(job.normalizedTitle);
    const title = normalized && !/^other$|\bnon title\b/i.test(normalized) ? normalized : cleanText(job.title);
    if (title) company.titles.set(title, (company.titles.get(title) ?? 0) + 1);
    if (job.location) company.places.set(job.location, (company.places.get(job.location) ?? 0) + 1);
    if (job.country) company.countries.add(job.country);
    const department = departmentOf(job.title);
    company.departments.set(department, (company.departments.get(department) ?? 0) + 1);
    if (sourceLabel) company.searches.add(sourceLabel);
    return true;
  }

  // The pay range of the jobs that state pay, in the most common currency and period.
  function salaryRange(jobs) {
    const stated = jobs.map((job) => job.salary).filter((salary) => salary && (salary.min ?? salary.max) != null);
    if (stated.length === 0) return null;
    const groups = new Map();
    for (const salary of stated) {
      const key = `${salary.currency ?? ''}|${salary.interval ?? ''}`;
      groups.set(key, [...(groups.get(key) ?? []), salary]);
    }
    const [[, common]] = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    const lows = common.map((s) => s.min ?? s.max);
    const highs = common.map((s) => s.max ?? s.min);
    return { min: Math.min(...lows), max: Math.max(...highs), currency: common[0].currency ?? null, interval: common[0].interval ?? null, jobs: common.length };
  }

  // One record per company, the companies with most jobs first.
  function records(now = Date.now()) {
    const scrapedAt = new Date(now).toISOString();
    const out = [];
    for (const company of companies.values()) {
      const dates = company.jobs.map((job) => Date.parse(job.postedAt ?? '')).filter(Number.isFinite);
      const newestFirst = [...company.jobs].sort((a, b) => (Date.parse(b.postedAt ?? '') || 0) - (Date.parse(a.postedAt ?? '') || 0));
      const website = company.details.companyWebsite ?? null;
      out.push({
        ...EMPTY_COMPANY,
        companyName: company.name,
        companyId: company.id,
        companyDomain: website ? domainOf(website) : null,
        ...company.details,
        isStaffingAgency: company.staffing,
        jobs: company.jobs.length,
        jobsLast7Days: dates.filter((t) => now - t <= 7 * DAY_MS).length,
        jobsLast30Days: dates.filter((t) => now - t <= 30 * DAY_MS).length,
        remoteJobs: company.jobs.filter((job) => job.remote).length,
        jobsWithSalary: company.jobs.filter((job) => job.salary).length,
        departments: Object.fromEntries(counted(company.departments, Infinity)),
        topJobTitles: counted(company.titles).map(([title, jobs]) => ({ title, jobs })),
        locations: counted(company.places).map(([location, jobs]) => ({ location, jobs })),
        countries: [...company.countries],
        salaryRange: salaryRange(company.jobs),
        newestJobAt: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
        oldestJobAt: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
        sampleJobs: newestFirst.slice(0, SAMPLE_JOBS).map((job) => ({ title: job.title, location: job.location, postedAt: job.postedAt, jobUrl: job.jobUrl })),
        searches: [...company.searches],
        scrapedAt,
      });
    }
    return out.sort((a, b) => b.jobs - a.jobs || b.jobsLast7Days - a.jobsLast7Days || a.companyName.localeCompare(b.companyName));
  }

  return { add, records, skipped, get size() { return companies.size; } };
}
