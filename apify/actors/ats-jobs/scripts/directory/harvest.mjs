// Starts harvest runs of our Indeed and XING Actors; their apply links lead to company career sites.
// Usage: node harvest.mjs <batch name> <country,country,...>|xing
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const SRC = new URL('../../src', import.meta.url).pathname;
const H = { authorization: `Bearer ${process.env.APIFY_TOKEN}`, 'content-type': 'application/json' };
const api = async (p, o = {}) => { const r = await fetch(`https://api.apify.com/v2${p}`, { headers: H, ...o }); const j = await r.json(); if (!r.ok) throw new Error(`${p}: ${JSON.stringify(j.error)}`); return j.data; };
export const ROLES = ['software engineer', 'frontend developer', 'backend developer', 'full stack developer', 'data scientist', 'data engineer', 'data analyst', 'machine learning engineer', 'devops engineer', 'site reliability engineer', 'security engineer', 'qa engineer', 'mobile developer', 'product manager', 'product designer', 'ux designer', 'engineering manager', 'it support', 'solutions engineer', 'sales engineer', 'account executive', 'account manager', 'sales development representative', 'business development manager', 'customer success manager', 'customer support', 'marketing manager', 'content marketing', 'growth marketing', 'social media manager', 'seo specialist', 'recruiter', 'talent acquisition', 'hr business partner', 'people operations', 'finance manager', 'accountant', 'financial analyst', 'controller', 'payroll', 'legal counsel', 'operations manager', 'project manager', 'program manager', 'office manager', 'executive assistant', 'supply chain', 'logistics', 'procurement', 'mechanical engineer', 'electrical engineer', 'hardware engineer', 'research scientist', 'clinical research', 'consultant', 'business analyst', 'manufacturing engineer', 'quality engineer', 'chemist', 'internship'];
const [batch, what] = process.argv.slice(2);
const file = `${process.cwd()}/harvest-runs.json`;
const runs = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const jobs = what === 'xing'
  ? [['xing-jobs-scraper', { searchQueries: ROLES, maxItems: 30000, includeDescription: false }, 'xing']]
  : what.split(',').map((spec) => { const [c, location] = spec.split(':'); return ['indeed-jobs-scraper', { searchQueries: ROLES, country: c, ...(location ? { location } : {}), maxItems: 30000, excludeStaffingAgencies: true, includeDescription: false }, spec]; });
for (const [actor, input, label] of jobs) {
  const r = await api(`/acts/robertosan16~${actor}/runs?memory=2048&timeout=3600`, { method: 'POST', body: JSON.stringify(input) });
  runs.push({ batch, label, actor, id: r.id });
  console.log(label, r.id);
}
writeFileSync(file, JSON.stringify(runs, null, 1));
