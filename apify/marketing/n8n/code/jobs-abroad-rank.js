// Joins the AI check with the work-rights screen and decides what to do with each job. Two scores
// stay apart: fit (does the candidate meet the job) and visa (can the employer hire them from abroad).
// Priority only orders the list; it is not a chance of getting the job.
const profile = $('Your profile').first().json;
const minBase = Number(profile.minBaseSalary) || 0;
const VISA = { YES: 85, YES_CONDITIONAL: 45, ASK: 35, NO: 0 };
const today = new Date().toISOString().slice(0, 10);

return $input.all().map((item, index) => {
  const job = $('Can apply?').itemMatching(index).json;
  const ai = item.json.output || {};
  const fit = Math.max(0, Math.min(100, Math.round(Number(ai.fitScore) || 0)));
  // The rules found an explicit offer: keep it. The AI found a ban the rules missed: trust the ban.
  let status = ai.sponsorshipStatus || 'ASK';
  let evidence = ai.sponsorshipEvidence || '';
  if (status !== 'NO' && job.sponsorshipHint) { status = job.sponsorshipHint; evidence = job.sponsorshipQuote; }
  const onshoreOnly = /already in the country/.test(job.sponsorshipConditions);
  let visa = status === 'YES_CONDITIONAL' && onshoreOnly ? 10 : VISA[status] ?? 35;
  const baseKnown = job.baseSalary !== null && job.baseSalary !== undefined;
  const baseTooLow = baseKnown && minBase && job.baseSalary < minBase;
  visa += baseKnown ? (baseTooLow ? -15 : 10) : -5;
  if (job.partTime) visa -= 30;
  visa = status === 'NO' ? 0 : Math.max(0, Math.min(100, visa));

  let recommendation;
  if (status === 'NO') recommendation = 'SKIP: no sponsorship';
  else if (job.partTime) recommendation = 'LOW PRIORITY: part-time';
  else if (baseTooLow) recommendation = 'LOW PRIORITY: base below your minimum';
  else if (fit < 50) recommendation = 'LOW PRIORITY';
  else if (ai.seniorityFit && ai.seniorityFit !== 'FIT') recommendation = 'REVIEW: seniority';
  else if (fit >= 60 && status === 'YES') recommendation = 'APPLY';
  else if (fit >= 60) recommendation = 'ASK SPONSORSHIP FIRST';
  else recommendation = 'REVIEW';

  return {
    json: {
      'Job link': job.jobUrl,
      Found: today,
      Recommendation: recommendation,
      Priority: Math.round(0.6 * fit + 0.4 * visa),
      Fit: fit,
      Visa: visa,
      Sponsorship: status + (job.sponsorshipConditions ? ` (${job.sponsorshipConditions})` : ''),
      Evidence: evidence,
      Missing: (ai.missingRequirements || []).join('; '),
      Why: ai.reason || '',
      Title: job.title,
      Company: job.company,
      Location: job.location,
      'Base salary': job.baseSalaryText || (job.salaryText ? '' : 'not stated'),
      'Extra pay': job.extraPay,
      'Apply link': job.applyUrl,
      // For the email step; not written to the sheet.
      sponsorshipStatus: status,
      description: job.description,
    },
    pairedItem: { item: index },
  };
});
