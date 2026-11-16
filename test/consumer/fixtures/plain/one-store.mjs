// T6: the translation store is one instance across entries: a language set through ./i18n is what ./logic formats
// with, and what the list block renders.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { setTranslations, translateText } from '@mgamadeus/ddd-admin-ui/i18n';
import { DateCell, EntityListEmpty } from '@mgamadeus/ddd-admin-ui/list';
import { formatDate } from '@mgamadeus/ddd-admin-ui/logic';
import { TooltipProvider } from '@mgamadeus/ddd-admin-ui/primitives';

setTranslations('de', 'FORMAL', { 'Clear search': 'Suche zurücksetzen', Users: 'Benutzer' });
const checks = [
  ['formatDate (./logic)', formatDate('2026-03-04'), '04.03.2026'],
  ['translateText (./i18n)', translateText('Users'), 'Benutzer'],
  [
    'DateCell (./list)',
    renderToString(createElement(TooltipProvider, null, createElement(DateCell, { value: '2026-03-04' }))),
    /04\.03\.2026/,
  ],
  [
    'EntityListEmpty (./list)',
    renderToString(createElement(EntityListEmpty, { message: 'Keine Einträge', onClearSearch: () => {} })),
    /Suche zurücksetzen/,
  ],
];
let failed = false;
for (const [label, actual, expected] of checks) {
  const passed = expected instanceof RegExp ? expected.test(actual) : actual === expected;
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}: ${actual}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
