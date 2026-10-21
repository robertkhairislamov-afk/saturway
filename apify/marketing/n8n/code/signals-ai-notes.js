// Adds the AI research to each hot lead. If the AI step failed for a lead, the lead keeps its
// hiring data and gets "AI step failed" as its priority, so nothing is lost.
return $input.all().map((item, index) => {
  const { websiteText, ...company } = $('Website text').itemMatching(index).json;
  const notes = item.json.output || {};
  return {
    json: {
      ...company,
      Priority: notes.priority || 'AI step failed',
      'What they do': notes.whatTheyDo || '',
      'Team being built': notes.teamBeingBuilt || '',
      'Why now': notes.whyNow || '',
      Angle: notes.angle || '',
      'Contact title': notes.contactTitle || '',
      Opener: notes.opener || '',
    },
    pairedItem: { item: index },
  };
});
