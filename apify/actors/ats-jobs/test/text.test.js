import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodeEntities, htmlToText } from '../src/core/text.js';

test('decodeEntities decodes named and numeric entities in one pass', () => {
  assert.equal(decodeEntities('R&amp;D &lt;b&gt; caf&eacute; &#39;x&#39; &#x2014; &amp;lt;'), "R&D <b> café 'x' — &lt;");
  assert.equal(decodeEntities('&unknown; stays'), '&unknown; stays');
});

test('htmlToText keeps paragraphs and list items readable', () => {
  const html = '<h2>About</h2><p>We build&nbsp;things.</p><ul><li>Python</li><li>Go</li></ul><p>Pay<br>range</p>';
  assert.equal(htmlToText(html), 'About\n\nWe build things.\n• Python\n• Go\n\nPay\nrange');
  assert.equal(htmlToText('<ul><li><p>Python</p></li><li><p>Go</p></li></ul>'), '• Python\n• Go');
  assert.equal(htmlToText('<link rel="x"><style>p{}</style>Text'), 'Text');
  assert.equal(htmlToText(null), '');
});
