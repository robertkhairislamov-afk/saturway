// One Slack message with the new jobs, best-rated companies first. The same job posted twice by a
// company (same title) is listed once.
const seen = new Set();
const jobs = $input.all().map((item) => item.json).filter((job) => {
  const key = `${job.title}|${job.companyName}`.toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
jobs.sort((a, b) => (b.companyRating ?? 0) - (a.companyRating ?? 0));
const shown = 20;
const lines = jobs.slice(0, shown).map((job) => {
  const rating = job.companyRating ? ` (${job.companyRating}★)` : '';
  const place = job.remote ? 'remote' : job.location;
  const pay = job.salary?.text ?? (job.salaryEstimate ? `${job.salaryEstimate.text}, Glassdoor estimate` : '');
  return `• <${job.jobUrl}|${job.title}> at ${job.companyName}${rating}${place ? `, ${place}` : ''}${pay ? ` — ${pay}` : ''}`;
});
const more = jobs.length > shown ? `\n…and ${jobs.length - shown} more in the Apify run.` : '';
return [{ json: { text: `*${jobs.length} new jobs at companies rated 4+ on Glassdoor*\n${lines.join('\n')}${more}` } }];
