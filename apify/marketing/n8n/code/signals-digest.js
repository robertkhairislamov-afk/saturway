// One Slack message a week: what changed, then the hot leads, high priority and best score first.
// In a quiet week the message says so, so you know the workflow ran.
const all = $input.all().map((item) => item.json);
const count = (signal) => all.filter((c) => c.Signal === signal).length;
const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const hot = all.filter((c) => c.Priority)
  .sort((a, b) => (rank[a.Priority] ?? 3) - (rank[b.Priority] ?? 3) || b.Score - a.Score);

const header = '*Hiring signals this week:* ' + all.length + ' companies hiring for your roles · ' +
  count('NEW') + ' new · ' + count('GROWING') + ' growing · ' + count('SLOWING') + ' slowing';
if (hot.length === 0) {
  return [{ json: { text: header + '\nNo new or growing company matched your ideal customer and minimum score this week. Every company is in the sheet.' } }];
}

const shown = 10;
const lines = hot.slice(0, shown).map((lead) => {
  const change = lead.Signal === 'GROWING'
    ? 'growing, ' + lead['Previous open jobs'] + ' → ' + lead['Open jobs'] + ' open jobs'
    : 'new, ' + lead['Open jobs'] + ' open jobs';
  const facts = [lead.Size, lead.Industry].filter(Boolean).join(', ');
  return [
    '• *' + lead.Company + '* — score ' + lead.Score + ', ' + lead.Priority + ' · ' + change + (facts ? ' · ' + facts : ''),
    lead['Team being built'] ? '   Team: ' + lead['Team being built'] : '',
    lead['Why now'] ? '   Why now: ' + lead['Why now'] : '',
    lead['Contact title'] ? '   Who to contact: ' + lead['Contact title'] : '',
    lead.Opener ? '   Opener: ' + lead.Opener : '',
    '   ' + [lead.Website, lead['Example job']].filter(Boolean).join(' · '),
  ].filter((line) => line.trim()).join('\n');
});
const more = hot.length > shown ? '\n…and ' + (hot.length - shown) + ' more hot leads in the sheet.' : '';
return [{ json: { text: header + '\n\n*' + hot.length + ' hot leads*\n' + lines.join('\n') + more } }];
