// One Slack message with the hottest leads: high priority first, then the most open jobs.
const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const leads = $input.all().map((item) => item.json)
  .sort((a, b) => (rank[a.Priority] ?? 3) - (rank[b.Priority] ?? 3) || b['Open jobs'] - a['Open jobs']);
if (leads.length === 0) return [];
const shown = 10;
const lines = leads.slice(0, shown).map((lead) => {
  const change = lead.Signal === 'GROWING' ? 'GROWING ' + lead['Previous open jobs'] + ' → ' + lead['Open jobs'] + ' open jobs' : 'NEW, ' + lead['Open jobs'] + ' open jobs';
  const facts = [lead.Size, lead.Industry].filter(Boolean).join(', ');
  return '• *' + lead.Company + '* (' + (lead.Priority || '?') + ') — ' + change + (facts ? ' · ' + facts : '') +
    (lead['Why now'] ? '\n   Why now: ' + lead['Why now'] : '') + (lead.Opener ? '\n   Opener: ' + lead.Opener : '') +
    (lead.Website ? '\n   ' + lead.Website : '');
});
const more = leads.length > shown ? '\n…and ' + (leads.length - shown) + ' more in the sheet.' : '';
return [{ json: { text: '*' + leads.length + ' hot leads this week: companies new to your list or hiring more*\n' + lines.join('\n') + more } }];
