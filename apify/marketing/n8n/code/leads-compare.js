// Compares this week's companies with the rows already in the sheet. NEW: not in the sheet yet.
// GROWING: more open jobs than last time. STEADY: the rest. Also checks your ideal customer:
// company size, industry and the number of open jobs.
const settings = $('Your ideal customer').first().json;
const minEmployees = Number(settings.minEmployees) || 0;
const minOpenJobs = Number(settings.minOpenJobs) || 1;
const industries = String(settings.industries || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
const today = new Date().toISOString().slice(0, 10);

const saved = new Map();
for (const { json: row } of $input.all()) {
  if (row.Company) saved.set(String(row.Company).toLowerCase(), row);
}

// "201 to 500 Employees", "10000+ Employees": the lower bound.
const employeesFrom = (size) => {
  const m = String(size || '').replace(/,/g, '').match(/\d+/);
  return m ? Number(m[0]) : null;
};

return $('One row per company').all().map(({ json: company }, index) => {
  const previous = saved.get(company.Company.toLowerCase());
  const before = previous ? Number(previous['Open jobs']) || 0 : null;
  const signal = !previous ? 'NEW' : company['Open jobs'] > before ? 'GROWING' : 'STEADY';
  const employees = employeesFrom(company.Size);
  const misses = [];
  if (minEmployees && employees !== null && employees < minEmployees) misses.push('too small');
  if (industries.length && !industries.some((word) => String(company.Industry || '').toLowerCase().includes(word))) misses.push('other industry');
  if (company['Open jobs'] < minOpenJobs) misses.push('few open jobs');
  // Glassdoor hides some employers' names; such a row cannot become a lead.
  if (/^(?:confidential|company confidential|private advertiser|anonymous)$/i.test(company.Company.trim())) misses.push('employer hidden');
  const fits = misses.length === 0;
  return {
    json: {
      ...company,
      Signal: signal,
      'Previous open jobs': before === null ? '' : before,
      'Fits ICP': fits ? (employees === null ? 'yes (size unknown)' : 'yes') : 'no: ' + misses.join(', '),
      'First seen': (previous && previous['First seen']) || today,
      hotLead: fits && signal !== 'STEADY',
    },
    pairedItem: { item: index },
  };
});
