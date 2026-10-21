// Scores every hiring company and compares it with your sheet from last week.
// Signal: NEW (not in the sheet yet), GROWING (more open jobs than last time), SLOWING (fewer), STEADY.
// Score 0-100: jobs posted in the last 7 days, new or growing, posted on several job sites, senior
// roles (a team being built) and a matching industry. Only companies that fit your ideal customer,
// are NEW or GROWING and reach your minimum score become hot leads, best first, up to your weekly
// AI limit. Companies whose Status in the sheet says customer, not a fit, lost or do not contact are
// never hot leads. Status, Priority and the AI notes already in the sheet are not overwritten.
const s = $('Your ideal customer').first().json;
const list = (text) => String(text || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean);
const minEmployees = Number(s.minEmployees) || 0;
const maxEmployees = Number(s.maxEmployees) || 0;
const industries = list(s.industries);
const minNewJobs = Number(s.minNewJobsPerWeek) || 1;
const minScore = Number(s.minScore) || 0;
const maxAiLeads = Number(s.maxAiLeadsPerWeek) || 10;
const today = new Date().toISOString().slice(0, 10);
const CLOSED = /customer|not a fit|lost|do not contact|unsubscribed/i;
// Leaders of a team: hiring them usually means the team is being built or grown.
const SENIOR = /\b(head of|director|vp|vice president|chief|founding|team lead)\b|\b(sales|marketing|engineering|operations|customer success|product|people|finance) manager\b/i;

const saved = new Map();
for (const { json: row } of $input.all()) {
  if (row.Company) saved.set(String(row.Company).trim().toLowerCase(), row);
}

// "201 to 500 Employees", "10,000+": the lower bound.
const employeesFrom = (size) => {
  const m = String(size || '').replace(/,/g, '').match(/\d+/);
  return m ? Number(m[0]) : null;
};
const fullUrl = (site) => (!site ? '' : /^https?:\/\//i.test(site) ? site : 'https://' + site);
const money = (n) => Number(n).toLocaleString('en-US');
const payRange = (r) => (r && r.min ? r.currency + ' ' + money(r.min) + (r.max && r.max !== r.min ? '-' + money(r.max) : '') + ' per ' + r.interval : '');

const companies = $('Find hiring companies').all().map(({ json: c }) => {
  const name = String(c.companyName || '').trim();
  const previous = saved.get(name.toLowerCase());
  const openJobs = Number(c.jobs) || 0;
  const newJobs = Number(c.jobsLast7Days) || 0;
  const before = previous && previous['Open jobs'] !== '' && previous['Open jobs'] !== undefined ? Number(previous['Open jobs']) : null;
  const signal = !previous || before === null ? 'NEW' : openJobs > before ? 'GROWING' : before > openJobs ? 'SLOWING' : 'STEADY';
  const titles = (c.topJobTitles || []).map((t) => t.title);
  const senior = titles.filter((t) => SENIOR.test(t));
  const teams = Object.entries(c.departments || {}).sort((a, b) => b[1] - a[1]);
  const sites = c.sites || [];
  const industry = String(c.companyIndustry || '');
  const industryMatch = industries.length > 0 && industries.some((word) => industry.toLowerCase().includes(word));
  const employees = employeesFrom(c.companySize);
  const status = previous ? String(previous.Status || '') : '';

  const misses = [];
  if (minEmployees && employees !== null && minEmployees > employees) misses.push('too small');
  if (maxEmployees && employees !== null && employees > maxEmployees) misses.push('too big');
  if (industries.length && industry && !industryMatch) misses.push('other industry');
  if (minNewJobs > newJobs) misses.push('few new jobs');
  if (CLOSED.test(status)) misses.push('status: ' + status);
  const unknown = [employees === null ? 'size' : '', industries.length && !industry ? 'industry' : ''].filter(Boolean);
  const fits = misses.length === 0;

  let score = Math.min(newJobs, 10) * 4;
  if (signal === 'NEW') score += 15;
  if (signal === 'GROWING') score += 15 + Math.min(openJobs - before, 10) * 2;
  if (signal === 'SLOWING') score -= 15;
  if (sites.length > 1) score += 10;
  if (senior.length) score += 15;
  if (industryMatch) score += 10;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    Company: name,
    Score: score,
    Signal: signal,
    'Open jobs': openJobs,
    'New this week': newJobs,
    'Previous open jobs': before === null ? '' : before,
    'Fits ICP': fits ? 'yes' + (unknown.length ? ' (' + unknown.join(' and ') + ' unknown)' : '') : 'no: ' + misses.join(', '),
    'Teams hiring': teams.map(([team, n]) => team + ' ' + n).join(', '),
    'Senior roles': senior.join(', '),
    'Job titles': titles.slice(0, 6).join(', '),
    Locations: (c.locations || []).slice(0, 5).map((l) => l.location).join('; '),
    'Pay range': payRange(c.salaryRange),
    'Job sites': sites.join(', '),
    Size: c.companySize || '',
    Industry: industry,
    Revenue: c.companyRevenue || '',
    Rating: c.companyRating || '',
    Website: fullUrl(c.companyWebsite || c.companyDomain),
    'Company page': c.companyUrl || '',
    'Example job': c.sampleJobs && c.sampleJobs[0] ? c.sampleJobs[0].jobUrl : '',
    'Latest posting': String(c.newestJobAt || '').slice(0, 10),
    'First seen': (previous && previous['First seen']) || today,
    Updated: today,
    candidate: fits && (signal === 'NEW' || signal === 'GROWING') && score >= minScore,
  };
});

// The best candidates, up to the weekly AI limit, become hot leads.
const hot = new Set(companies.filter((c) => c.candidate).sort((a, b) => b.Score - a.Score).slice(0, maxAiLeads).map((c) => c.Company));
return companies.map(({ candidate, ...row }) => ({ json: { ...row, 'Hot lead': hot.has(row.Company) ? 'yes' : '' } }));
