// Jobs the work-rights screen ruled out go to the tracker too, with the quote that rules them out,
// so you can check the decision.
const today = new Date().toISOString().slice(0, 10);
return $input.all().map((item, index) => ({
  json: {
    'Job link': item.json.jobUrl,
    Found: today,
    Recommendation: 'SKIP: ' + item.json.skipReason,
    Priority: 0,
    Evidence: item.json.workRightsQuote,
    Title: item.json.title,
    Company: item.json.company,
    Location: item.json.location,
    'Apply link': item.json.applyUrl,
  },
  pairedItem: { item: index },
}));
