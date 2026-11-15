// A few helpers for the small, regular XML feeds of applicant tracking systems (Personio's job
// XML, Teamtailor's RSS): the text of a tag, all blocks of a tag, CDATA and entities resolved.

import { decodeEntities } from './text.js';

const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Contents of every <name>…</name> block (namespaced names such as "tt:location" work too).
export function blocks(xml, name) {
  const re = new RegExp(`<${escape(name)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escape(name)}>`, 'g');
  return [...String(xml ?? '').matchAll(re)].map((m) => m[1]);
}

// The text of the first <name> tag: CDATA unwrapped, entities decoded, trimmed. Null when empty.
export function tagText(xml, name) {
  const raw = blocks(xml, name)[0];
  if (raw == null) return null;
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  const text = cdata ? cdata[1] : decodeEntities(raw);
  return text.trim() || null;
}
