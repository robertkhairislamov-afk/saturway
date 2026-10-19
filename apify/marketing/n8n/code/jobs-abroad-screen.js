// Screens every job for work-rights rules before any AI call, so jobs a foreign candidate cannot take
// never reach the model. A ban needs an exact quote from the ad: citizens or permanent residents
// only, existing or unrestricted work rights, a security clearance, or "no sponsorship".
// Also splits the salary line into guaranteed base and extras (OTE, bonus, commission).
const profile = $('Your profile').first().json;
const needsSponsorship = profile.needsVisaSponsorship !== false;

const RIGHTS = String.raw`(?:right to (?:live and )?work|work(?:ing)? rights|eligib\w* to work|entitled to work|authori[sz]ed to work|work authori[sz]ation|legally (?:able|entitled|allowed) to work|valid work(?:ing)? visa)`;
const BANS = [
  ['Security clearance (citizens only)', /(?:security|defence|defense|baseline|agsva|government) clearance|\b(?:nv1|nv2|negative vetting|ts\/sci)\b/i],
  ['Citizens only', /citizens? only|only (?:open to |available to )?citizens(?! or)|must be (?:an? )?(?:[a-z.]+ )?citizens?\b(?! or)|citizenship (?:is )?(?:required|essential|mandatory)/i],
  ['Citizens or permanent residents only', /(?:only|must be|must hold|open to|available to|limited to|restricted to|required|essential)[^.;\n]{0,50}(?:citizens?|citizenship)[^.;\n]{0,25}(?:permanent resid\w*|\bpr\b|green card)|(?:only|must be|open to|available to|limited to)[^.;\n]{0,50}(?:permanent resid\w*|\bpr\b)[^.;\n]{0,25}citizens?|permanent residents? only|\bpr only\b|green card holders? only/i],
  ['Unrestricted work rights required', new RegExp(String.raw`unrestricted[^.;\n]{0,30}${RIGHTS}|\bfull,? (?:and unrestricted )?(?:[a-z]+ )?work(?:ing)? rights(?! check)|work(?:ing)? rights without restrictions`, 'i')],
  ['Existing work rights required', new RegExp(String.raw`(?:must|need to|needs to|required to|should|will need to)\s+(?:already\s+)?(?:have|hold|possess|be)\b[^.;\n]{0,40}${RIGHTS}|${RIGHTS}(?:(?!\bnot\b)[^.;\n]){0,40}(?:required|essential|mandatory|a must)|(?:only )?apply (?:only )?if you (?:have|hold|already have)[^.;\n]{0,25}${RIGHTS}`, 'i')],
  ['No visa sponsorship', /\bno (?:visa )?sponsorship|(?:unable|not able|not in (?:a|the) position) to (?:offer |provide |support )?(?:visa )?sponsor|(?:cannot|can't|do not|does not|don't|will not|won't) (?:offer |provide |support )?(?:visa )?sponsor|sponsorship (?:is |will )?(?:not|un)(?: be)? ?(?:available|offered|provided|supported)|without (?:the need for |requiring )?(?:visa )?sponsorship|(?:visa )?sponsorship(?: available| offered| approved| supported| provided)?\s*[:\-]\s*no\b/i],
];
const OFFER = /visa sponsorship(?! (?:is |will )?(?:not|un))(?!(?: available| offered| approved| supported| provided)?\s*[:\-]\s*no\b)|sponsorship (?:is |may be |will be |can be )?(?:available|offered|provided|considered)|(?:will|can|happy to|able to|willing to|open to) (?:consider |provide |offer )?(?:visa )?sponsor|employer[- ]sponsored visa|skilled worker visa|\bh-?1b\b|\blmia\b|blue card|skills in demand|\b(?:482|494)\b[^.;\n]{0,20}(?:visa|sponsor)|\bdama\b|relocation and visa|open to (?:overseas|international) (?:applicants|candidates)|(?:overseas|international) (?:applicants|candidates) (?:are )?(?:welcome|considered)/i;
const CONDITIONS = [
  ['only after probation', /probation/i],
  ['only for top performers', /top performers|high performers/i],
  ['only for candidates already in the country', /onshore|already (?:living |based )?in|currently (?:in|living in|based in)|[a-z]+[- ]based (?:applicants|candidates)/i],
  ['only later in the job', /after (?:the |your )?(?:\d+|six|twelve) (?:months|years)|in the future|may become available/i],
];

// Short exact quote around a match.
const quote = (text, m) => {
  if (!m) return '';
  const start = Math.max(0, text.lastIndexOf(' ', Math.max(0, m.index - 70)));
  const end = text.indexOf(' ', Math.min(text.length, m.index + m[0].length + 70));
  return text.slice(start, end === -1 ? text.length : end).replace(/\s+/g, ' ').trim();
};
const sentences = (text) => text.split(/\n|•|(?<=[.!?])\s+(?=[A-Z])/).filter((s) => s.trim());

// Salary line split into guaranteed base and extras. Only the base is guaranteed pay.
const PER_YEAR = { year: 1, month: 12, week: 52, day: 230, hour: 1976 };
function splitSalary(salary) {
  const out = { base: null, baseText: '', extras: [] };
  const text = (salary && salary.text) || '';
  if (!text) return out;
  const interval = /hour|\/hr/i.test(text) ? 'hour' : /day|daily/i.test(text) ? 'day' : /week/i.test(text) ? 'week' : /month/i.test(text) ? 'month' : 'year';
  for (const part of text.replace(/[–—]/g, '-').split(/\s*(?:\+|\||;|,\s|\bplus\b|&|\/\s*(?=\$))\s*/i)) {
    const amounts = [...part.matchAll(/\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k\b)?/gi)]
      .map((m) => Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)).filter((n) => n >= 10);
    if (/\bote\b|on[- ]target|earn up to|bonus|incentive|commission|\bcomms?\b|super|allowance|\bcar\b|vehicle/i.test(part)) {
      if (!/^\s*\+?\s*super/i.test(part)) out.extras.push(part.trim());
      continue;
    }
    if (amounts.length && out.base === null) {
      if (amounts.length > 1 && amounts[0] < 1000 && amounts[1] >= 1000) amounts[0] *= 1000;
      out.base = Math.round(amounts[0] * PER_YEAR[interval]);
      out.baseText = part.trim();
    }
  }
  return out;
}

const seen = new Set();
const jobs = [];
for (const item of $input.all()) {
  const job = item.json;
  const key = `${job.title}|${job.companyName}`.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  const text = `${job.title || ''}\n${job.descriptionText || ''}`;
  let ban = null;
  for (const [label, pattern] of BANS) {
    for (const s of sentences(text)) {
      const m = s.match(pattern);
      if (m) { ban = { label, quote: quote(s, m) }; break; }
    }
    if (ban) break;
  }
  const offer = text.match(OFFER);
  const around = offer ? text.slice(Math.max(0, offer.index - 60), offer.index + offer[0].length + 110) : '';
  const conditions = offer ? CONDITIONS.filter(([, c]) => c.test(around)).map(([label]) => label) : [];
  const salary = splitSalary(job.salary);
  jobs.push({
    json: {
      title: job.title,
      company: job.companyName,
      location: job.location,
      postedAt: (job.postedAt || '').slice(0, 10),
      jobUrl: job.jobUrl,
      applyUrl: job.applyUrl || job.jobUrl,
      salaryText: (job.salary && job.salary.text) || '',
      baseSalary: salary.base,
      baseSalaryText: salary.baseText,
      extraPay: salary.extras.join('; '),
      partTime: /part[- ]time|casual/i.test(`${job.employmentType || ''} ${job.title || ''}`),
      canApply: !(needsSponsorship && ban),
      skipReason: ban ? ban.label : '',
      workRightsQuote: ban ? ban.quote : '',
      sponsorshipHint: offer ? (conditions.length ? 'YES_CONDITIONAL' : 'YES') : '',
      sponsorshipQuote: quote(text, offer),
      sponsorshipConditions: conditions.join(', '),
      description: (job.descriptionText || '').slice(0, 6000),
    },
  });
}
return jobs;
