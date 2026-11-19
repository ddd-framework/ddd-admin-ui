// Server render of the additions of 0.3.10 for a host's agent tools: `data-row-key` on every list row and card (the
// table, the phone cards of the body, the card grid), `data-agent-secret` on a password input, `data-agent-skip` on the
// package's chrome (skeletons, the view switch, the search's clear button, the bulk bar, the sidebar's collapse toggle,
// the mobile menu button); `onListStateChange` is never called on the server; the navigation guard and the dirty-form
// listing of ./logic.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build:
// node test/consumer/fixtures/plain/options-0310-render.mjs
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { EntityListBody, EntityListBulkBar, EntityListGrid, EntityListTable, EntityListViewToggle, SearchField } from '@mgamadeus/ddd-admin-ui/list';
import {
  buildEntityListState,
  canNavigate,
  dirtyFormFieldNames,
  getDirtyForms,
  setDirtyFormEntry,
  setOpenOverlay,
  useNavigationGuard,
} from '@mgamadeus/ddd-admin-ui/logic';
import { Input, Skeleton } from '@mgamadeus/ddd-admin-ui/primitives';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { AppShell } from '@mgamadeus/ddd-admin-ui/shell';

setTranslations('en', 'FORMAL', {});
const render = element => renderToStaticMarkup(h(AdminUiProvider, {}, element));
const checks = [];
const count = (html, pattern) => (html.match(pattern) ?? []).length;
const tagsWith = (html, attribute) => html.match(new RegExp(`<[a-z]+[^>]*\\s${attribute}(?:="[^"]*")?[^>]*>`, 'g')) ?? [];

// ── row keys ───────────────────────────────────────────────────────────────────────────────────────────────────────
const items = [
  { id: 'a-1', name: 'First' },
  { id: 'b-2', name: 'Second' },
];
const base = { items, getRowKey: item => item.id };
const columns = [{ id: 'name', header: 'Name', cell: item => item.name }];
const reported = [];
const onListStateChange = state => reported.push(state);
const table = render(h(EntityListTable, { ...base, columns, onListStateChange, activeFilters: { q: 'x' } }));
checks.push(
  ['table: every row carries its row key', /<tr[^>]*data-row-key="a-1"/.test(table) && /<tr[^>]*data-row-key="b-2"/.test(table) && count(table, /data-row-key=/g) === 2],
);
const loading = render(h(EntityListTable, { ...base, items: [], columns, isLoading: true, skeletonRows: 2 }));
checks.push(['table: skeleton rows carry no row key, their skeletons data-agent-skip', !loading.includes('data-row-key') && count(loading, /data-slot="skeleton" data-agent-skip=""/g) >= 2]);

const renderCard = ({ item }) => h('article', { className: 'card' }, item.name);
const phone = render(h(EntityListBody, { ...base, displayMode: 'table', columns, renderCard, onListStateChange }));
checks.push(
  ['body: the table rows and the phone cards carry the row key', /<tr[^>]*data-row-key="a-1"/.test(phone) && /<article[^>]*data-row-key="a-1"/.test(phone) && count(phone, /data-row-key=/g) === 4],
);
const ownKey = ({ item, rowKey }) => h('div', { 'data-row-key': `own-${rowKey}` }, item.name);
const grid = render(h(EntityListGrid, { ...base, renderCard: ownKey }));
checks.push(['grid: a card that sets its own data-row-key keeps it (the renderer gets rowKey)', grid.includes('data-row-key="own-a-1"') && count(grid, /data-row-key=/g) === 2]);
const fragmentCard = render(h(EntityListGrid, { ...base, renderCard: ({ item }) => item.name }));
checks.push(['grid: a text card stays as it is', fragmentCard.includes('First') && !fragmentCard.includes('data-row-key')]);
checks.push(['onListStateChange is never called on the server', reported.length === 0]);
checks.push([
  'buildEntityListState: rows, columns, filters',
  JSON.stringify(buildEntityListState({ view: 'table', ...base, columnIds: ['name'], activeFilters: { q: 'x', s: '' } })) ===
    JSON.stringify({ view: 'table', rowKeys: ['a-1', 'b-2'], selectedRowKeys: [], columnIds: ['name'], filters: { q: 'x' }, sort: null, isLoading: false, hasError: false }),
]);

// ── secret ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const password = render(h(Input, { type: 'password', 'aria-label': 'Password' }));
const text = render(h(Input, { type: 'text', 'aria-label': 'Name' }));
checks.push(['input: a password field carries data-agent-secret, a text field none', /<input[^>]*type="password"[^>]*data-agent-secret=""/.test(password) && !text.includes('data-agent-secret')]);

// ── chrome ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const skeleton = render(h(Skeleton, { className: 'h-4' }));
const viewToggle = render(h(EntityListViewToggle, { displayMode: 'table', onDisplayModeChange: () => {} }));
const search = render(h(SearchField, { value: 'abc', onChange: () => {}, 'aria-label': 'Search' }));
const bulk = render(h(EntityListBulkBar, { selection: { count: 2, clear: () => {} }, onDelete: () => {} }));
const shell = render(h(AppShell, { navigation: [{ key: 'home', label: 'Home', href: '/' }] }, h('p', null, 'Page')));
checks.push(
  ['skeleton: data-agent-skip', /<div[^>]*data-agent-skip=""/.test(skeleton)],
  ['view toggle: the fieldset is data-agent-skip', /<fieldset[^>]*data-agent-skip=""/.test(viewToggle)],
  ['search: the clear button is data-agent-skip, the input is not', tagsWith(search, 'data-agent-skip').length === 1 && tagsWith(search, 'data-agent-skip')[0].includes('aria-label="Clear search"')],
  ['bulk bar: the toolbar is data-agent-skip', /<div[^>]*role="toolbar"[^>]*data-agent-skip=""/.test(bulk)],
  ['shell: the collapse toggle is data-agent-skip', tagsWith(shell, 'data-agent-skip').some(tag => tag.includes('data-shell-collapse-toggle'))],
  ['shell: the mobile menu button is data-agent-skip', tagsWith(shell, 'data-agent-skip').some(tag => tag.includes('data-shell-menu-button'))],
  ['shell: the navigation itself is content (no data-agent-skip on links)', !tagsWith(shell, 'data-agent-skip').some(tag => tag.startsWith('<a'))],
);

// ── navigation guard ───────────────────────────────────────────────────────────────────────────────────────────────
checks.push(['canNavigate: allowed on an idle page', canNavigate().allowed === true && typeof useNavigationGuard === 'function']);
setDirtyFormEntry('render-test', { formId: 'item', label: 'Edit item', getDirtyFieldNames: () => dirtyFormFieldNames({ name: 'B', note: '' }, { name: 'A', note: null }) });
const dirty = canNavigate();
checks.push(['canNavigate: refused for unsaved changes, with the form and its fields', dirty.allowed === false && dirty.reason === 'unsaved-changes' && JSON.stringify(getDirtyForms()) === JSON.stringify([{ formId: 'item', label: 'Edit item', dirtyFieldNames: ['name'] }])]);
setDirtyFormEntry('render-test', null);
setOpenOverlay('render-test', 'drawer');
checks.push(['canNavigate: refused for an open drawer, unless drawers are ignored', canNavigate().reason === 'dialog-open' && canNavigate({ ignoreOverlayKinds: ['drawer'] }).allowed === true]);
setOpenOverlay('render-test', null);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
