// Adds the AI notes to each hot lead.
return $input.all().map((item, index) => {
  const company = $('Hot lead?').itemMatching(index).json;
  const notes = item.json.output || {};
  return {
    json: {
      ...company,
      Priority: notes.priority || '',
      'Why now': notes.whyNow || '',
      Angle: notes.angle || '',
      Opener: notes.opener || '',
    },
    pairedItem: { item: index },
  };
});
