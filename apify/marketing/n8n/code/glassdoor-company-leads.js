// One row per company: how many matching jobs it posted and what Glassdoor knows about it.
const companies = new Map();
for (const { json: job } of $input.all()) {
  if (!job.companyName) continue;
  const row = companies.get(job.companyName) ?? {
    Company: job.companyName,
    'Open jobs': 0,
    titles: new Set(),
    places: new Set(),
    Rating: job.companyRating ?? '',
    Size: job.companySize ?? '',
    Revenue: job.companyRevenue ?? '',
    Industry: job.companyIndustry ?? '',
    Website: job.companyWebsite ?? '',
    Headquarters: job.companyHeadquarters ?? '',
    'Glassdoor page': job.companyUrl ?? '',
    'Latest posting': '',
  };
  row['Open jobs'] += 1;
  row.titles.add(job.title);
  if (job.location) row.places.add(job.location);
  const posted = (job.postedAt ?? '').slice(0, 10);
  if (posted > row['Latest posting']) row['Latest posting'] = posted;
  companies.set(job.companyName, row);
}
const today = new Date().toISOString().slice(0, 10);
return [...companies.values()]
  .sort((a, b) => b['Open jobs'] - a['Open jobs'])
  .map(({ titles, places, ...row }) => ({
    json: { ...row, 'Job titles': [...titles].slice(0, 5).join('; '), Locations: [...places].slice(0, 5).join('; '), Updated: today },
  }));
