// Turns each hot lead's home page into a short text for the AI: page title, description and the
// first words of the page. A site that did not load gives "not available"; the AI then works from
// the hiring data alone.
const clean = (text) => String(text || '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
  .replace(/\s+/g, ' ').trim();
const first = (html, patterns) => {
  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m) return clean(m[1]);
  }
  return '';
};

return $input.all().map((item, index) => {
  const company = $('Hot lead?').itemMatching(index).json;
  const html = typeof item.json.data === 'string' ? item.json.data : '';
  const title = first(html, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
  const description = first(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i,
  ]);
  const body = clean(html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' '));
  const websiteText = [title, description, body.slice(0, 1200)].filter(Boolean).join('\n');
  return { json: { ...company, websiteText: websiteText || 'not available' }, pairedItem: { item: index } };
});
