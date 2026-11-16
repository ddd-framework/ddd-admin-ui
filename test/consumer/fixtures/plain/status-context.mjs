// A status map with a translation context: StatusBadge translates label and description under `<text>__<context>`;
// a definition's own context wins over the map's; a map without a context keeps the plain keys.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { m, setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { StatusBadge } from '@mgamadeus/ddd-admin-ui/list';
import { defineStatusMap } from '@mgamadeus/ddd-admin-ui/logic';

const IMPORT_STATUS = defineStatusMap(
  {
    FAILED: { label: m('Failed', { context: 'import-status' }), tone: 'danger', description: m('Stopped with errors', { context: 'import-status' }) },
    OPEN: { label: m('Open', { context: 'review-status' }), tone: 'warning', context: 'review-status' },
  },
  { context: 'import-status' },
);
const PLAIN = defineStatusMap({ FAILED: { label: 'Failed', tone: 'danger' } });

setTranslations('de', 'FORMAL', {
  Failed: 'Fehler',
  'Failed__import-status': 'Fehlgeschlagen',
  'Stopped with errors__import-status': 'Mit Fehlern abgebrochen',
  Open: 'Öffnen',
  'Open__review-status': 'Offen',
});
const render = (value, map) => renderToStaticMarkup(h(StatusBadge, { value, map }));
const failed = render('FAILED', IMPORT_STATUS);
const checks = [
  ['map context translates the label', failed.includes('>Fehlgeschlagen<')],
  ['map context translates the description', failed.includes('title="Mit Fehlern abgebrochen"')],
  ["the definition's own context wins", render('OPEN', IMPORT_STATUS).includes('>Offen<')],
  ['a map without a context keeps the plain key', render('FAILED', PLAIN).includes('>Fehler<')],
  ['defineStatusMap without options returns the map itself', defineStatusMap(PLAIN) === PLAIN],
];
setTranslations('en', 'FORMAL', {});
let failedChecks = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failedChecks = true;
}
if (failedChecks) process.exit(1);
