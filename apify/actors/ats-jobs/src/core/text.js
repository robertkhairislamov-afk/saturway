// HTML helpers: decode entities and turn job description HTML into readable plain text.

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: ' ', emsp: ' ', thinsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«',
  raquo: '»', bull: '•', middot: '·', trade: '™', reg: '®', copy: '©', deg: '°', times: '×',
  euro: '€', pound: '£', yen: '¥', cent: '¢', sect: '§', para: '¶', shy: '',
  agrave: 'à', aacute: 'á', acirc: 'â', auml: 'ä', atilde: 'ã', aring: 'å', ccedil: 'ç',
  egrave: 'è', eacute: 'é', ecirc: 'ê', euml: 'ë', igrave: 'ì', iacute: 'í', icirc: 'î', iuml: 'ï',
  ntilde: 'ñ', ograve: 'ò', oacute: 'ó', ocirc: 'ô', ouml: 'ö', otilde: 'õ', oslash: 'ø',
  ugrave: 'ù', uacute: 'ú', ucirc: 'û', uuml: 'ü', szlig: 'ß',
  Agrave: 'À', Aacute: 'Á', Acirc: 'Â', Auml: 'Ä', Ccedil: 'Ç', Egrave: 'È', Eacute: 'É',
  Ecirc: 'Ê', Iacute: 'Í', Ntilde: 'Ñ', Oacute: 'Ó', Ouml: 'Ö', Uacute: 'Ú', Uuml: 'Ü',
};

// Decodes HTML entities in a single pass, so "&amp;lt;" becomes "&lt;" and not "<".
export function decodeEntities(text) {
  return String(text ?? '').replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const code = entity[1] === 'x' || entity[1] === 'X' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const BLOCK_TAGS = 'p|div|h[1-6]|ul|ol|tr|table|section|article|header|footer|blockquote|pre|dl|dt|dd';

export function htmlToText(html) {
  if (!html) return '';
  const text = String(html)
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li(?:\s[^>]*)?>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/t[dh]>/gi, ' ')
    .replace(new RegExp(`</?(?:${BLOCK_TAGS})(?:\\s[^>]*)?>`, 'gi'), '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(text)
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[\u200b\u00ad]/g, '')
    .replace(/[ \t\f\v\r]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/•\n+/g, '• ')
    .replace(/\n{2,}•/g, '\n•')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Trims and collapses whitespace; returns null for empty values.
export function cleanText(value) {
  if (value == null) return null;
  const text = decodeEntities(value).replace(/\s+/g, ' ').trim();
  return text || null;
}

export const unique = (values) => [...new Set(values.map(cleanText).filter(Boolean))];
