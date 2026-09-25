// The unified job record every adapter produces, with normalized workplace and employment types.

import { cleanText, unique } from './text.js';

export function normalizeWorkplace(value) {
  const text = String(value ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  if (!text || text === 'unspecified') return null;
  if (text.includes('hybrid')) return 'hybrid';
  if (text.includes('remote') || text.includes('telecommut')) return 'remote';
  if (text.includes('onsite') || text.includes('office') || text.includes('inperson')) return 'onsite';
  return null;
}

export function normalizeEmployment(value) {
  const original = cleanText(value);
  if (!original) return null;
  const text = original.toLowerCase().replace(/[\s_-]+/g, '');
  if (text.includes('fulltime') || text === 'permanent' || text === 'regular') return 'full-time';
  if (text.includes('parttime')) return 'part-time';
  if (text.includes('apprentice') || text.includes('alternance')) return 'apprenticeship';
  if (text.includes('intern') || text.includes('trainee')) return 'internship';
  if (text.includes('contract') || text.includes('freelance') || text.includes('contingent')) return 'contract';
  if (text.includes('temp') || text.includes('fixedterm') || text.includes('seasonal')) return 'temporary';
  return original;
}

export function isoDate(value) {
  if (value == null || value === '') return null;
  const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const REMOTE = /(?<![a-z])remote(?![a-z])/i;

export function makeJob(fields) {
  const locations = unique([fields.location, ...(fields.locations ?? [])]);
  const location = cleanText(fields.location) ?? locations[0] ?? null;
  const anyRemoteLocation = locations.some((place) => REMOTE.test(place));
  const workplaceType = normalizeWorkplace(fields.workplaceType) ?? (anyRemoteLocation ? 'remote' : null);
  return {
    ats: fields.ats,
    company: fields.company,
    companyName: cleanText(fields.companyName),
    jobId: String(fields.jobId),
    requisitionId: cleanText(fields.requisitionId),
    title: cleanText(fields.title),
    department: cleanText(fields.department),
    team: cleanText(fields.team),
    location,
    locations,
    remote: fields.remote === true || workplaceType === 'remote' || anyRemoteLocation,
    workplaceType,
    employmentType: normalizeEmployment(fields.employmentType),
    salary: fields.salary ?? null,
    postedAt: isoDate(fields.postedAt),
    updatedAt: isoDate(fields.updatedAt),
    jobUrl: fields.jobUrl ?? null,
    applyUrl: fields.applyUrl ?? fields.jobUrl ?? null,
    descriptionText: fields.descriptionText ?? null,
    descriptionHtml: fields.descriptionHtml ?? null,
  };
}
