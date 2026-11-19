// Server render of the optional props added in 0.3.9: the list table's cell padding, empty state switch, sort arrow
// and look props, header / table / skeleton classes, page flow without scrolling, the selection cell of a table with
// tracks and the select-all hit area; the shell's content element, attributes, row display, link props, breadcrumbs,
// account and background props; the app translations' language filter options and the "auto" estimate probe; the
// confirmation routing; the crons severity options.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build:
// node test/consumer/fixtures/plain/options-039-render.mjs
import { createElement as h } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { CronsScreen, createStaticCronsApi, sortCrons } from '@mgamadeus/ddd-admin-ui/crons';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { EntityListBody, EntityListGrid, EntityListTable } from '@mgamadeus/ddd-admin-ui/list';
import { isTextConfirmDescription, routeConfirm } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { showcaseCronsData, showcaseTranslationsData } from '@mgamadeus/ddd-admin-ui/showcase';
import { AccountMenu, AppShell, ShellBreadcrumbs } from '@mgamadeus/ddd-admin-ui/shell';
import { displacementTextureSizeOf, ShaderBackground } from '@mgamadeus/ddd-admin-ui/shell-background';
import { AppTranslationsScreen, createStaticTranslationsApi, isGenerationEstimateEmpty } from '@mgamadeus/ddd-admin-ui/translations';

setTranslations('en', 'FORMAL', {});
const render = element => renderToStaticMarkup(h(AdminUiProvider, {}, element));
const checks = [];

// ── list table ─────────────────────────────────────────────────────────────────────────────────────────────────────
const items = [
  { id: 1, name: 'First', amount: 10 },
  { id: 2, name: 'Second', amount: 20 },
];
const base = { items, getRowKey: item => String(item.id) };
const selection = {
  isItemSelected: () => false,
  isItemSelectable: () => true,
  setItemSelected: () => {},
  allLoadedState: false,
  setAllLoadedSelected: () => {},
};
const trackColumns = [
  { id: 'name', header: 'Name', cell: item => item.name, width: '100px' },
  { id: 'amount', header: 'Amount', cell: item => String(item.amount), width: '100px', align: 'end', sortKey: 'amount' },
];
const padded = render(h(EntityListTable, { ...base, columns: trackColumns, cellPaddingX: { inner: 4, edge: 10 }, columnWidthBox: 'content-box' }));
const paddedSelect = render(h(EntityListTable, { ...base, columns: trackColumns, cellPaddingX: 8, selection }));
const plainTracks = render(h(EntityListTable, { ...base, columns: trackColumns, selection }));
const contentSized = [
  { id: 'name', header: 'Name', cell: item => item.name },
  { id: 'amount', header: 'Amount', cell: item => String(item.amount), align: 'end', sortKey: 'amount' },
];
const sortAuto = render(h(EntityListTable, { ...base, columns: contentSized, onSortChange: () => {} }));
const sortEnd = render(h(EntityListTable, { ...base, columns: contentSized, onSortChange: () => {}, sortIconPosition: 'end', sortButtonClassName: 'host-sort' }));
const sortColumn = render(
  h(EntityListTable, {
    ...base,
    columns: contentSized.map(column => (column.id === 'amount' ? { ...column, sortIconPosition: 'end' } : column)),
    onSortChange: () => {},
    sortIconPosition: 'start',
  }),
);
const arrowAfter = html => /<span>Amount<\/span><svg/.test(html);
const arrowBefore = html => /<\/svg><span>Amount<\/span>/.test(html);
const looks = render(
  h(EntityListTable, {
    ...base,
    columns: trackColumns.map(column => ({ ...column, width: '120px' })),
    fillWidth: true,
    headerRowClassName: 'host-header-row',
    headerCellClassName: 'host-header-cell',
    tableClassName: 'host-table',
  }),
);
const skeleton = render(h(EntityListTable, { ...base, items: [], isLoading: true, skeletonRows: 1, columns: contentSized, skeletonClassName: 'host-skeleton' }));
const noEmpty = render(h(EntityListTable, { ...base, items: [], columns: contentSized, showEmptyState: false }));
const withEmpty = render(h(EntityListTable, { ...base, items: [], columns: contentSized }));
const noEmptyGrid = render(h(EntityListGrid, { ...base, items: [], renderCard: () => null, showEmptyState: false }));
const errorKept = render(h(EntityListTable, { ...base, items: [], columns: contentSized, showEmptyState: false, error: 'Broken' }));
const flowTable = render(h(EntityListTable, { ...base, columns: contentSized, scroll: false }));
const flowPage = render(h(EntityListTable, { ...base, columns: trackColumns, stickyHeader: 'page', scroll: false }));
const flowGrid = render(h(EntityListGrid, { ...base, renderCard: ({ item }) => h('article', null, item.name), scroll: false }));
const flowBody = render(h(EntityListBody, { ...base, displayMode: 'table', columns: contentSized, renderCard: ({ item }) => h('article', null, item.name), scroll: false }));
const cellHit = render(h(EntityListTable, { ...base, columns: contentSized, selection, selectionHitArea: 'cell' }));
const checkboxHit = render(h(EntityListTable, { ...base, columns: contentSized, selection }));
const headerSelectCell = html => html.slice(html.indexOf('<th'), html.indexOf('</th>'));
checks.push(
  ['table: cellPaddingX sets the variables on the host', padded.includes('--list-cell-px:4px') && padded.includes('--list-cell-edge-px:10px')],
  ['table: cellPaddingX pads header and body cells through the variables', /<th[^>]*px-\(--list-cell-px\)/.test(padded) && /<td[^>]*px-\(--list-cell-px\)[^"]*first:pl-\(--list-cell-edge-px\)/.test(padded)],
  ['table: content-box tracks add the set padding (100 + 10 + 4)', padded.includes('grid-template-columns:114px 114px')],
  ['table: the selection track follows the edge padding (8 + 16)', paddedSelect.includes('grid-template-columns:24px ')],
  ['table: a track selection cell is sized by its track and drops the checkbox offset', !/<td[^>]*w-10/.test(plainTracks) && /<td[^>]*\[&amp;&gt;\[role=checkbox\]\]:translate-y-0/.test(plainTracks)],
  ['table: a content-sized selection cell keeps w-10', /<td[^>]*w-10 pr-0/.test(cellHit)],
  ['table: sort arrow before the label of an end column by default', arrowBefore(sortAuto)],
  ['table: sortIconPosition="end" puts it after the label, sortButtonClassName styles the button', arrowAfter(sortEnd) && /<button[^>]*host-sort/.test(sortEnd)],
  ['table: a column\'s sortIconPosition wins over the table\'s', arrowAfter(sortColumn)],
  ['table: headerRowClassName on the header row', /<tr[^>]*host-header-row/.test(looks)],
  ['table: headerCellClassName on every header cell, the filler included', /<th[^>]*host-header-cell[^>]*data-list-filler=""/.test(looks) && (looks.match(/host-header-cell/g) ?? []).length === 3],
  ['table: tableClassName on the table', /<table[^>]*host-table/.test(looks)],
  ['table: skeletonClassName on the skeleton bars', skeleton.includes('host-skeleton')],
  ['table: showEmptyState={false} drops the empty block, the default keeps it', !noEmpty.includes('data-list-empty') && withEmpty.includes('data-list-empty')],
  ['grid: showEmptyState={false} drops the empty block', !noEmptyGrid.includes('data-list-empty')],
  ['table: the error stays without the empty state', errorKept.includes('Broken')],
  ['table: scroll={false} drops the flex fill', !flowTable.includes('md:flex-1') && flowTable.includes('overflow-auto')],
  ['table: scroll={false} on the page-sticky host', flowPage.includes('data-list-page-header') && !flowPage.includes('md:flex-1')],
  ['grid: scroll={false} drops the flex fill and its scroller', !flowGrid.includes('md:flex-1') && !flowGrid.includes('md:overflow-y-auto')],
  ['body: scroll={false} reaches table and cards', !flowBody.includes('md:flex-1')],
  ['table: selectionHitArea="cell" makes the select-all cell a target', headerSelectCell(cellHit).includes('cursor-pointer') && !headerSelectCell(checkboxHit).includes('cursor-pointer')],
);

// ── shell ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const Icon = () => h('svg', { 'aria-hidden': true });
const NAVIGATION = [
  { key: 'home', label: 'Home', href: '/', exact: true, icon: Icon },
  {
    key: 'catalog',
    label: 'Catalog',
    href: '/catalog',
    icon: Icon,
    children: [
      { key: 'items', label: 'Items', href: '/catalog/items', icon: Icon, linkProps: { prefetch: true } },
      { key: 'old', label: 'Old screen', href: 'https://old.example/screen', external: true },
    ],
  },
  { key: 'settings', label: 'Settings', icon: Icon, children: [{ key: 'flags', label: 'Flags', href: '/settings/flags' }] },
];
const ProbeLink = ({ href, children, prefetch, ...rest }) => h('a', { href, 'data-prefetch': String(prefetch), ...rest }, children);
const renderShell = (pathname, props = {}) =>
  renderToString(
    h(
      AdminUiProvider,
      { usePathname: () => pathname, linkComponent: ProbeLink },
      h(AppShell, { navigation: NAVIGATION, brand: h('span', null, 'Brand'), ...props }, h('p', { id: 'page' }, 'Page')),
    ),
  );
const shellDefault = renderShell('/catalog/items');
const shell = renderShell('/catalog/items', {
  contentElement: 'div',
  topBarAttributes: { 'data-host-bar': 'top' },
  sidebarClassName: 'host-aside',
  sidebarAttributes: { 'data-host-aside': 'side' },
  navGroupRowHover: 'row',
  navGroupToggleClassName: 'host-toggle',
  navActiveRowClassName: 'host-active-row',
  navActiveGroupClassName: 'host-active-group',
  navRowClassNameFor: item => (item.key === 'home' ? 'host-home-row' : undefined),
  navLinkProps: { prefetch: false },
});
const sidebarOf = html => html.slice(html.indexOf('data-shell-sidebar'), html.indexOf('data-shell-content'));
checks.push(
  ['shell: <main> by default', shellDefault.includes('<main')],
  ['shell: contentElement="div" draws no <main> and keeps the skip target', !shell.includes('<main') && /<div[^>]*id="[^"]*-main"/.test(shell)],
  ['shell: data-* on the top bar and the sidebar, sidebarClassName', /<header[^>]*data-host-bar="top"/.test(shell) && /<aside[^>]*data-host-aside="side"[^>]*host-aside/.test(shell)],
  ['shell: navGroupRowHover="row" marks the row of a group with a page', sidebarOf(shell).includes('data-nav-group-row="row"') && !sidebarOf(shellDefault).includes('data-nav-group-row')],
  ['shell: group toggle, active row and active group classes', sidebarOf(shell).includes('host-toggle') && /aria-current="page"[^>]*host-active-row|host-active-row[^>]*aria-current="page"/.test(sidebarOf(shell)) && sidebarOf(shell).includes('host-active-group')],
  ['shell: rowClassNameFor styles one row', sidebarOf(shell).includes('host-home-row')],
  ['shell: navLinkProps reach the host link, an item\'s own linkProps win', /data-prefetch="false"[^>]*data-nav-key="home"|data-nav-key="home"[^>]*data-prefetch="false"/.test(shell) && /data-prefetch="true"[^>]*data-nav-key="items"|data-nav-key="items"[^>]*data-prefetch="true"/.test(shell)],
  ['shell: external entries get no link props', !/data-prefetch="[^"]*"[^>]*href="https:\/\/old\.example/.test(shell) && !/href="https:\/\/old\.example[^>]*data-prefetch/.test(shell)],
  ['shell: without navLinkProps the host link gets none', /data-prefetch="undefined"[^>]*data-nav-key="home"|data-nav-key="home"[^>]*data-prefetch="undefined"/.test(shellDefault)],
);

const crumbs = renderToString(
  h(
    AdminUiProvider,
    { usePathname: () => '/catalog/items' },
    h(ShellBreadcrumbs, { navigation: NAVIGATION, itemClassName: 'host-crumb', ariaLabel: 'You are here', foldBy: 'viewport' }),
  ),
);
const defaultCrumbs = renderToString(h(AdminUiProvider, { usePathname: () => '/catalog/items' }, h(ShellBreadcrumbs, { navigation: NAVIGATION })));
checks.push(
  ['breadcrumbs: itemClassName on every crumb, ariaLabel names the landmark', (crumbs.match(/host-crumb/g) ?? []).length >= 2 && crumbs.includes('aria-label="You are here"')],
  ['breadcrumbs: foldBy="viewport" folds through media queries', crumbs.includes('@media (width &gt;= 40rem)') || crumbs.includes('@media (width >= 40rem)')],
  ['breadcrumbs: the default folds by container queries without a stylesheet', !defaultCrumbs.includes('<style') && defaultCrumbs.includes('@container/crumbs')],
);

const account = render(h(AccountMenu, { name: 'Alex Example', triggerAriaLabel: 'Your account', initials: 'MG', entries: [] }));
const accountDefault = render(h(AccountMenu, { name: 'Alex Example', entries: [] }));
checks.push(
  ['account: triggerAriaLabel and initials', account.includes('aria-label="Your account"') && account.includes('>MG</span>')],
  ['account: the default name and initials', accountDefault.includes('aria-label="Account menu of Alex Example"') && accountDefault.includes('>AE</span>')],
);

const background = renderToStaticMarkup(h(ShaderBackground, { 'data-host-layer': 'bg', displacementImagePlaceholder: '#123456', displacementImage: '/field.png' }));
const backgroundDefault = renderToStaticMarkup(h(ShaderBackground, {}));
checks.push(
  ['background: data-* on the layer', background.includes('data-host-layer="bg"')],
  ['background: no placeholder colour on the server (it waits for the canvas)', !background.includes('background-color')],
  ['background: the default layer is unchanged', backgroundDefault === '<div aria-hidden="true" data-shell-background="" class="pointer-events-none fixed inset-0 -z-10"></div>'],
  ['background: the texture size rounds to a power of two', displacementTextureSizeOf(600) === 512 && displacementTextureSizeOf(undefined) === 256],
);

// ── app translations and confirmations ─────────────────────────────────────────────────────────────────────────────
const translationsApi = createStaticTranslationsApi(showcaseTranslationsData);
const seen = [];
render(
  h(AppTranslationsScreen, {
    api: translationsApi,
    asSpecimen: true,
    languageFilter: true,
    languageFilterOptions: languages => {
      seen.push(languages.length);
      return languages.filter(language => language.isActive !== false).map(language => ({ value: String(language.id), label: `${language.languageCode} · ${language.name}` }));
    },
  }),
);
const node = h('p', null, 'estimate');
checks.push(
  ['translations: languageFilterOptions gets the loaded languages', seen.length > 0 && seen.every(count => count > 0)],
  ['translations: an estimate renderer answering null is empty', await isGenerationEstimateEmpty(Promise.resolve(undefined), { kind: 'all' }, () => null)],
  ['translations: content or a failed load is not empty', !(await isGenerationEstimateEmpty(Promise.resolve(1), { kind: 'all' }, () => node)) && !(await isGenerationEstimateEmpty(Promise.reject(new Error('x')), { kind: 'all' }, () => null))],
  ['confirm: a node description goes to the rich route, text to the host', routeConfirm({ title: 't', description: node }, { host: 'host', richDescription: 'rich' }) === 'rich' && routeConfirm({ title: 't', description: 'text' }, { host: 'host', richDescription: 'rich' }) === 'host' && !isTextConfirmDescription(node)],
);

// ── crons ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const cronsApi = createStaticCronsApi(showcaseCronsData);
const ordered = render(
  h(CronsScreen, { api: cronsApi, pollingIntervalMs: 0, tick: false, sort: 'severity', severityStatusOrder: ['FAILING', 'OVERDUE', 'MISSING_COMMAND', 'RUNNING', 'OK', 'PAUSED'] }),
);
const defaultOrder = render(h(CronsScreen, { api: cronsApi, pollingIntervalMs: 0, tick: false, sort: 'severity' }));
const crons = showcaseCronsData.list.crons.elements;
const sameStatus = [
  { name: 'b', status: 'FAILING', lastExecutionStartedAt: '2026-11-18 09:00:00' },
  { name: 'a', status: 'FAILING', lastExecutionStartedAt: '2026-11-18 08:00:00' },
];
checks.push(
  ['crons: severityStatusOrder puts failing before a missing command', ordered.indexOf('>rebuild-search-index<') < ordered.indexOf('>export-legacy-report<')],
  ['crons: the default order keeps a missing command first', defaultOrder.indexOf('>export-legacy-report<') < defaultOrder.indexOf('>rebuild-search-index<')],
  ['crons: within a status by name by default, by the latest run with tieBreak "recent"', sortCrons(sameStatus, 'severity')[0]?.name === 'a' && sortCrons(sameStatus, 'severity', undefined, { tieBreak: 'recent' })[0]?.name === 'b'],
  ['crons: sortCrons keeps the name order for sort="name"', sortCrons(crons, 'name').map(cron => cron.name).join() === crons.map(cron => cron.name).join()],
);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
