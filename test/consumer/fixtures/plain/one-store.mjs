// T6: the translation store is one instance across entries: a language set through ./i18n is what ./logic formats
// with, and what the list block renders.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { setTranslations, m } from '@mgamadeus/ddd-admin-ui/i18n';
import { formatDate, formatUiNumber } from '@mgamadeus/ddd-admin-ui/logic';
import { ClearFiltersButton, DateCell } from '@mgamadeus/ddd-admin-ui/list';

setTranslations('de', 'FORMAL', { 'Clear filters': 'Filter zurücksetzen', Users: 'Benutzer' });
const checks = [
  ['formatDate (./logic)', formatDate('2026-03-04T10:05:00Z', { timeZone: 'UTC' }), '04.03.2026'],
  ['formatUiNumber (./logic)', formatUiNumber(1234.5), '1.234,5'],
  ['m (./i18n)', m('Users'), 'Benutzer'],
  ['DateCell (./list)', renderToString(createElement(DateCell, { value: '2026-03-04T10:05:00Z', timeZone: 'UTC' })), /04\.03\.2026/],
  ['ClearFiltersButton (./list)', renderToString(createElement(ClearFiltersButton, { onClear: () => {} })), /Filter zurücksetzen/],
];
let failed = false;
for (const [label, actual, expected] of checks) {
  const passed = expected instanceof RegExp ? expected.test(actual) : actual === expected;
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}: ${actual}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
