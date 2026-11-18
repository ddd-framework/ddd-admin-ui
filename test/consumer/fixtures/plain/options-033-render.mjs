// Server render of the optional props added in 0.3.3 for tables, the bulk bar and translatable fields: the surface
// colour and its header class, the leading columns' widths and classes, the select-all label, content-box column
// widths, the hover marker of rows without an action, the overlay edge mode; Delete's own texts and class, one label
// element around a toned count; the translatable counter's id and the editor's aria-describedby, a host counter, and
// the markdown variant of one text per language.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build:
// node test/consumer/fixtures/plain/options-033-render.mjs
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { EntityListBulkBar, EntityListTable } from '@mgamadeus/ddd-admin-ui/list';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { TranslatableInput, TranslatableLanguageMarkdown } from '@mgamadeus/ddd-admin-ui/translations';

setTranslations('en', 'FORMAL', {});
const render = node => renderToString(h(AdminUiProvider, {}, node));
const checks = [];

// ── table ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const items = [
  { id: 'a', name: 'First' },
  { id: 'b', name: 'Second' },
];
const selection = {
  isItemSelected: () => false,
  isItemSelectable: () => true,
  setItemSelected: () => {},
  allLoadedState: false,
  setAllLoadedSelected: () => {},
};
const columns = [
  { id: 'name', header: 'Name', cell: item => item.name, width: '120px', pin: 'start' },
  { id: 'value', header: 'Value', cell: () => 'Value', width: '1fr', minWidth: 100 },
  { id: 'actions', header: 'Actions', cell: () => 'Edit', width: '80px', pin: 'end' },
];
const table = render(
  h(EntityListTable, {
    items,
    getRowKey: item => item.id,
    columns,
    selection,
    showRowIndex: true,
    rowAction: item => (item.id === 'a' ? () => {} : null),
    rowHover: 'action',
    pinEdge: 'overlay',
    surface: 'var(--color-popover)',
    selectionColumnWidth: 52,
    indexColumnWidth: 64,
    selectionCellClassName: 'probe-select-cell',
    indexCellClassName: 'probe-index-cell',
    selectAllLabel: (loaded, more) => `Select ${loaded}${more ? '+' : ''}`,
    hasMore: true,
    columnWidthBox: 'content-box',
  }),
);
const template = /grid-template-columns:([^;"]+)/.exec(table)?.[1] ?? '';
checks.push(
  ['table: the surface is set on the scroller and paints the header cells', table.includes('--list-surface:var(--color-popover)') && table.includes('data-list-surface=""') && table.includes('bg-(--list-surface)') && !/<th[^>]*bg-card/.test(table)],
  ['table: the overlay edge mode marks the scroller and renders the edge overlays', table.includes('data-list-pin-edges="overlay"') && table.includes('data-list-edge-overlay="start"') && table.includes('data-list-edge-overlay="end"')],
  ['table: leading column widths in the tracks', template.startsWith('52px 64px'), template],
  ['table: leading column classes on header and body cells', (table.match(/probe-select-cell/g) ?? []).length === 3 && (table.match(/probe-index-cell/g) ?? []).length === 3],
  ['table: the select-all label from the loaded count and hasMore', table.includes('aria-label="Select 2+"')],
  // name: 120 + 16 (after the leading columns) + 16; value min 100 + 32; actions: 80 + 16 + 24 (card edge)
  ['table: content-box widths add the cell padding', template.includes('152px') && template.includes('minmax(132px') && template.includes('120px'), template],
  ['table: a row without an action under rowHover="action" carries the hover marker', (table.match(/data-list-row-hover="none"/g) ?? []).length === 1],
);
const plainTable = render(h(EntityListTable, { items, getRowKey: item => item.id, columns: columns.map(({ pin, ...column }) => column) }));
checks.push(['table: without the props no surface, overlay or hover marker', !plainTable.includes('list-surface') && !plainTable.includes('data-list-edge') && !plainTable.includes('data-list-row-hover') && !plainTable.includes('data-list-pin-edges')]);

// ── bulk bar ───────────────────────────────────────────────────────────────────────────────────────────────────────
const bulk = (() => render(
  h(EntityListBulkBar, {
    selection: { count: 3, clear: () => {} },
    actions: [{ id: 'move', label: 'Move', onClick: () => {}, countClassName: 'probe-count' }],
    onDelete: () => {},
    deleteLabel: 'Entfernen',
    deleteTranslate: false,
    deleteClassName: 'probe-delete',
    deleteCountClassName: 'probe-delete-count',
  }),
))().replaceAll('<!-- -->', '');
checks.push(
  ['bulk bar: a toned count sits in one label element', /<span data-bulk-label="">Move \(<span class="probe-count">3<\/span>\)<\/span>/.test(bulk), bulk.match(/data-bulk-label[^]*?<\/span><\/span>/)?.[0]],
  ['bulk bar: Delete shows its label as given, with its class and toned count', bulk.includes('probe-delete ') || bulk.includes('probe-delete"')],
  ['bulk bar: Delete count class', /Entfernen \(<span class="probe-delete-count">3<\/span>\)/.test(bulk)],
);

// ── translatable fields ────────────────────────────────────────────────────────────────────────────────────────────
const tabs = [{ key: 'en::FORMAL', languageCode: 'en', writingStyle: 'FORMAL', label: 'EN' }];
const counted = render(
  h(TranslatableInput, { label: 'Title', value: { 'en::FORMAL': 'Hello' }, onChange: () => {}, locales: tabs, activeLocale: 'en::FORMAL', onActiveLocaleChange: () => {}, maxLength: 20 }),
);
const counterId = /<p id="([^"]+)" class="text-xs tabular-nums/.exec(counted)?.[1];
checks.push(['translatable: the editor is described by the counter', Boolean(counterId) && counted.includes(`aria-describedby="${counterId}"`)]);
const hostCounter = render(
  h(TranslatableInput, {
    label: 'Title',
    value: { 'en::FORMAL': 'Hello' },
    onChange: () => {},
    locales: tabs,
    activeLocale: 'en::FORMAL',
    onActiveLocaleChange: () => {},
    maxLength: 20,
    renderCounter: ({ count, max, id }) => h('span', { id, 'data-host-counter': '' }, `${count} of ${max}`),
  }),
);
checks.push(['translatable: renderCounter replaces the built-in counter', hostCounter.includes('data-host-counter') && hostCounter.includes('5 of 20') && !hostCounter.includes('5 / 20')]);
const uncounted = render(h(TranslatableInput, { label: 'Title', value: {}, onChange: () => {}, locales: tabs, activeLocale: 'en::FORMAL', onActiveLocaleChange: () => {}, maxLength: 20, showCounterFrom: 10 }));
checks.push(['translatable: no aria-describedby while no counter shows', !uncounted.includes('aria-describedby')]);
const markdown = render(
  h(TranslatableLanguageMarkdown, {
    label: 'Body',
    texts: { en: 'Hello', de: 'Hallo du' },
    store: { 'en::FORMAL': 'Hello', 'de::INFORMAL': 'Hallo du' },
    onChange: () => {},
    languages: ['en', 'de'],
    activeLanguage: 'de',
    onActiveLanguageChange: () => {},
    renderEditor: ({ value }) => h('output', { 'data-editor': '' }, value),
  }),
);
checks.push(['translatable: the markdown variant edits the language key that holds text', markdown.includes('<output data-editor="">Hallo du</output>') && markdown.includes('DE · Informal')]);

let failed = false;
for (const [label, passed, detail] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${!passed && detail ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
