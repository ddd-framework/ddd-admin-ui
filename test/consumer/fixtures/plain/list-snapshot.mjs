// Server render of list tables, bodies and status badges that use none of the optional table capabilities (column
// tracks, pins, sort, row index, own views, status contexts), compared with list-snapshot.html. The snapshot was taken
// from 0.1.0-rc.2: a table without the new props must render the same DOM and classes as before them.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build (the package
// resolves itself by name): node test/consumer/fixtures/plain/list-snapshot.mjs [--write]
import * as fs from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { EntityListBody, EntityListTable, StatusBadge } from '@mgamadeus/ddd-admin-ui/list';
import { defineStatusMap } from '@mgamadeus/ddd-admin-ui/logic';

const SNAPSHOT = new URL('./list-snapshot.html', import.meta.url);

const STATUS = defineStatusMap({
  ACTIVE: { label: 'Active', tone: 'success', description: 'Running now' },
  BLOCKED: { label: 'Blocked', tone: 'danger' },
});

const items = [
  { id: 1, name: 'First item', status: 'ACTIVE' },
  { id: 2, name: 'Second item', status: 'BLOCKED' },
  { id: 3, name: 'Third item', status: 'UNKNOWN' },
];

const columns = [
  { id: 'id', header: 'ID', cell: item => String(item.id), className: 'w-20' },
  { id: 'name', header: 'Name', cell: item => h('span', { className: 'font-medium' }, item.name) },
  { id: 'status', header: 'Status', cell: item => h(StatusBadge, { value: item.status, map: STATUS }) },
  {
    id: 'actions',
    header: h('span', { className: 'sr-only' }, 'Actions'),
    className: 'w-24 text-right',
    cell: item => h('button', { type: 'button' }, `Edit ${item.id}`),
  },
];

const columnsWithFilter = columns.map(column =>
  column.id === 'name' ? { ...column, filter: h('input', { 'aria-label': 'Name filter', defaultValue: '' }) } : column
);

const selection = {
  isItemSelected: item => item.id === 2,
  isItemSelectable: item => item.id !== 3,
  setItemSelected: () => {},
  allLoadedState: 'indeterminate',
  setAllLoadedSelected: () => {},
};

const base = { items, getRowKey: item => String(item.id) };
const rowAction = item => (item.id === 1 ? () => {} : null);
const renderCard = ({ item }) => h('article', { className: 'surface' }, item.name);

const cases = {
  'table: rows, row action, column classes': h(EntityListTable, { ...base, columns, rowAction }),
  'table: filter row, sticky header offset, more pages': h(EntityListTable, {
    ...base,
    columns: columnsWithFilter,
    stickyHeaderTop: '3rem',
    hasMore: true,
    onLoadMore: () => {},
    className: 'overflow-visible',
  }),
  'table: selection': h(EntityListTable, { ...base, columns, selection }),
  'table: first load with selection': h(EntityListTable, { ...base, items: [], columns, selection, isLoading: true, skeletonRows: 2 }),
  'table: no results': h(EntityListTable, { ...base, items: [], columns, isSearchActive: true, onClearSearch: () => {} }),
  'table: empty': h(EntityListTable, { ...base, items: [], columns, emptyMessage: 'Nothing here yet' }),
  'table: error': h(EntityListTable, { ...base, columns, error: 'Could not load' }),
  'body: table only': h(EntityListBody, { ...base, displayMode: 'table', columns, selection }),
  'body: table with phone cards': h(EntityListBody, { ...base, displayMode: 'table', columns, renderCard }),
  'body: grid': h(EntityListBody, { ...base, displayMode: 'grid', columns, renderCard }),
  'body: extra view': h(EntityListBody, {
    ...base,
    displayMode: 'tiles',
    columns,
    renderCard,
    renderExtraView: (mode, rows) => h('div', { 'data-mode': mode }, rows.map(row => h('span', { key: row.id }, row.name))),
  }),
  'body: extra mode without a renderer': h(EntityListBody, { ...base, displayMode: 'tiles', columns }),
  'badge: explicit': h(StatusBadge, { tone: 'highlight', label: 'Electric' }),
  'badge: empty value': h(StatusBadge, { value: '', map: STATUS }),
};

/** React's `useId` format differs between React versions (`:r0:`, `«r0»`, `_r_0_`); the snapshot names them in order. */
const normaliseIds = html => {
  const ids = new Map();
  return html.replace(/(?::r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, id => {
    if (!ids.has(id)) ids.set(id, `«id${ids.size}»`);
    return ids.get(id);
  });
};

const render = () => {
  const parts = [];
  setTranslations('en', 'FORMAL', {});
  for (const [name, element] of Object.entries(cases)) {
    parts.push(`<!-- ${name} -->\n${normaliseIds(renderToStaticMarkup(element)).replace(/></g, '>\n<')}`);
  }
  // A status map without a context still translates its label and description by the plain text.
  setTranslations('de', 'FORMAL', { Active: 'Aktiv', 'Running now': 'Läuft gerade' });
  parts.push(`<!-- badge: translated map label -->\n${renderToStaticMarkup(h(StatusBadge, { value: 'ACTIVE', map: STATUS })).replace(/></g, '>\n<')}`);
  setTranslations('en', 'FORMAL', {});
  return `${parts.join('\n\n')}\n`;
};

const html = render();
if (process.argv.includes('--write')) {
  fs.writeFileSync(SNAPSHOT, html);
  console.log(`list snapshot written (${Object.keys(cases).length + 1} cases)`);
} else {
  const expected = fs.readFileSync(SNAPSHOT, 'utf8');
  if (expected !== html) {
    const expectedLines = expected.split('\n');
    const actualLines = html.split('\n');
    const index = actualLines.findIndex((line, position) => line !== expectedLines[position]);
    console.error(`FAILED list snapshot: first difference at line ${index + 1}`);
    console.error(`  expected: ${expectedLines[index]}`);
    console.error(`  actual:   ${actualLines[index]}`);
    process.exit(1);
  }
  console.log(`ok      list snapshot (${Object.keys(cases).length + 1} cases, same DOM and classes as 0.1.0-rc.2)`);
}
