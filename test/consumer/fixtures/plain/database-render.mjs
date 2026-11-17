// The ./database screen (server render) on the sample payloads of ./showcase through the static api: one card per
// pending table with its badges, size and summary, a blocked card without Apply, the counts per severity, the empty
// state, WriteAccessProvider disabling every apply with its reason, and the load error of a 403 shown.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticDatabaseApi, SchemaDiffCard, SchemaDiffScreen } from '@mgamadeus/ddd-admin-ui/database';
import { staticQueryFailure, WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { showcaseDatabaseData } from '@mgamadeus/ddd-admin-ui/showcase';

const api = createStaticDatabaseApi(showcaseDatabaseData);
const render = (element, writeAccess) =>
  renderToStaticMarkup(h(AdminUiProvider, null, writeAccess ? h(WriteAccessProvider, { value: writeAccess }, element) : element));
const READ_ONLY = { allowed: false, reason: 'Read-only workspace' };
const FORBIDDEN = { status: 403, data: { error: 'Schema writes are disabled on this process: it shares another stage’s database.' } };

const count = (html, pattern) => (html.match(pattern) ?? []).length;
/** Every button whose tag or content contains `name`, as its opening tag. */
const buttonsNamed = (html, name) =>
  [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>/g)].filter(match => match[0].includes(name)).map(match => /^<button\b[^>]*>/.exec(match[0])[0]);
const allDisabled = buttons => buttons.length > 0 && buttons.every(button => / disabled=""/.test(button));
/** The markup of the card of `table`. */
const cardOf = (html, table) => {
  const start = html.indexOf(`data-table="${table}"`);
  if (start === -1) return '';
  const next = html.indexOf('data-slot="schema-diff-card"', start + 1);
  return html.slice(start, next === -1 ? undefined : next);
};

const screen = render(h(SchemaDiffScreen, { api }));
const readOnly = render(h(SchemaDiffScreen, { api }), READ_ONLY);
const empty = render(h(SchemaDiffScreen, { api: createStaticDatabaseApi({ ...showcaseDatabaseData, diff: { diffs: { elements: [] } } }) }));
const forbidden = render(h(SchemaDiffScreen, { api: createStaticDatabaseApi({ ...showcaseDatabaseData, diff: staticQueryFailure(FORBIDDEN) }), showGeneratedCode: false }));
const blockedDiff = showcaseDatabaseData.diff.diffs.elements.find(diff => diff.directApplyBlocked);
const blockedOpen = render(h(SchemaDiffCard, { diff: blockedDiff, defaultExpanded: true }));

const products = cardOf(screen, 'Products');
const orders = cardOf(screen, 'Orders');
const checks = [
  ['one card per pending table', count(screen, /data-slot="schema-diff-card"/g) === 5],
  ['change type and severity badges of the status maps', screen.includes('Alter table') && screen.includes('Create table') && screen.includes('Drop table') && screen.includes('Destructive')],
  ['counts per severity in the header', screen.includes('data-slot="schema-diff-counts"') && screen.includes('5 tables') && screen.includes('Mixed: 1') && screen.includes('Destructive: 2')],
  ['size badge with size and rows', products.includes('374 MB · 290,067 rows')],
  ['summary per aspect', orders.includes('+1 ±1 -1 columns · -1 index · ±1 foreign key · collation utf8mb4_general_ci → utf8mb4_unicode_ci')],
  ['entity class shown', orders.includes('App\\Domain\\Shop\\Entities\\Order')],
  ['a blocked card has no Apply and no checkbox', products.includes('data-blocked=""') && products.includes('Apply blocked') && !products.includes('Apply the diff of Products') && !products.includes('Select Products')],
  ['a blocked card names the thresholds, the operations and the online schema change', products.includes('100 MB or 100,000 rows') && products.includes('rewrites the table') && products.includes('pt-online-schema-change')],
  ['an unblocked card has Apply and a checkbox', orders.includes('aria-label="Apply the diff of Orders"') && orders.includes('aria-label="Select Orders"')],
  ['a mixed card says which side to decide', orders.includes('decide which side is wrong')],
  ['the statements in execution order behind the details', blockedOpen.includes('data-slot="schema-diff-sql"') && blockedOpen.includes('-- [1/1]') && blockedOpen.includes('MODIFY COLUMN `description`')],
  ['apply all and the generated-code panels', buttonsNamed(screen, 'Apply all').length === 1 && count(screen, /data-slot="generated-code-panel"/g) === 3],
  ['nothing generated before it is asked for', !screen.includes('data-slot="generated-code"')],
  ['the empty state', empty.includes('Schema matches') && !empty.includes('data-slot="schema-diff-card"')],
  ['write access disables every apply with the reason', allDisabled(buttonsNamed(readOnly, 'aria-label="Apply the diff of')) && allDisabled(buttonsNamed(readOnly, 'Apply all')) && readOnly.includes('<span class="sr-only">Read-only workspace</span>') && !readOnly.includes('title="Read-only workspace"')],
  ['write access disables the selection checkboxes', allDisabled(buttonsNamed(readOnly, 'aria-label="Select '))],
  ['a 403 of the diff is shown with its message', forbidden.includes('The schema diff could not be loaded.') && forbidden.includes('Schema writes are disabled on this process')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
