// The screens of ./workers and ./translations (server render) on the sample payloads of ./showcase through the static
// apis: they render their sections, links go through the provider's link component, a missing reading is no zero,
// WriteAccessProvider disables every write (restart, generation, toggles, imports), and the entity translator and the
// content locales talk the endpoints' shapes.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { SHOWCASE_NOW_MS, showcaseTranslationsData, showcaseWorkersData } from '@mgamadeus/ddd-admin-ui/showcase';
import {
  AppTranslationsScreen,
  ConfigImportCard,
  createStaticTranslationsApi,
  LocalesScreen,
  LanguagesScreen,
  useContentLocales,
  useEntitiesTranslator,
  useEntityTranslator,
} from '@mgamadeus/ddd-admin-ui/translations';
import { createStaticWorkersApi, WorkerMessageClassesTable, WorkersOverviewScreen, WorkerTransportScreen } from '@mgamadeus/ddd-admin-ui/workers';

const workersApi = createStaticWorkersApi(showcaseWorkersData);
const translationsApi = createStaticTranslationsApi(showcaseTranslationsData);
const Link = ({ href, children, ...props }) => h('a', { href, 'data-host-link': '', ...props }, children);
const render = (element, writeAccess) =>
  renderToStaticMarkup(
    h(AdminUiProvider, { linkComponent: Link }, writeAccess ? h(WriteAccessProvider, { value: writeAccess }, element) : element),
  );
const READ_ONLY = { allowed: false, reason: 'Read-only workspace' };
const count = (html, pattern) => (html.match(pattern) ?? []).length;
/** Every button whose tag or content contains `name`, as its opening tag. */
const buttonsNamed = (html, name) =>
  [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<\/button>/g)].filter(match => match[0].includes(name)).map(match => /^<button\b[^>]*>/.exec(match[0])[0]);
const allDisabled = (buttons) => buttons.length > 0 && buttons.every(button => / disabled=""/.test(button));
const noneDisabled = (buttons) => buttons.length > 0 && buttons.every(button => !/ disabled=""/.test(button));

const overviewProps = { api: workersApi, transportHref: (transport, tab) => `/workers/${transport}${tab ? `?tab=${tab}` : ''}`, historyAnchorMs: SHOWCASE_NOW_MS, pollingIntervalMs: 0 };
const overview = render(h(WorkersOverviewScreen, overviewProps));
const overviewReadOnly = render(h(WorkersOverviewScreen, overviewProps), READ_ONLY);
const monitoringOff = render(
  h(WorkersOverviewScreen, {
    ...overviewProps,
    api: createStaticWorkersApi({
      ...showcaseWorkersData,
      overview: { workersOverview: { ...showcaseWorkersData.overview.workersOverview, monitoringEnabled: false } },
    }),
  }),
);
const transport = render(h(WorkerTransportScreen, { api: workersApi, transport: 'import_orders', backHref: '/workers', historyAnchorMs: SHOWCASE_NOW_MS, pollingIntervalMs: 0 }));
const transportMonitoringOff = render(
  h(WorkerTransportScreen, { api: workersApi, transport: 'import_orders', backHref: '/workers', historyAnchorMs: SHOWCASE_NOW_MS, pollingIntervalMs: 0, monitoringEnabled: false }),
);
// a host section, a hidden section, header actions and an own link component (no provider link)
const OwnLink = ({ href, children, ...props }) => h('a', { href, 'data-own-link': '', ...props }, children);
const overviewSlots = renderToStaticMarkup(
  h(AdminUiProvider, null,
    h(WorkersOverviewScreen, {
      ...overviewProps,
      linkComponent: OwnLink,
      headerActions: h('button', { type: 'button', 'data-host-action': '' }, 'Host action'),
      renderSection: (id, section) => (id === 'loops' ? null : id === 'throughput' ? h('section', { 'data-host-section': '' }, 'Own throughput') : section),
    }),
  ),
);
const transportSlots = renderToStaticMarkup(
  h(AdminUiProvider, null,
    h(WorkerTransportScreen, {
      api: workersApi, transport: 'import_orders', backHref: '/workers', historyAnchorMs: SHOWCASE_NOW_MS, pollingIntervalMs: 0,
      linkComponent: OwnLink,
      renderSection: (id, section) => (id === 'facts' ? h('div', { 'data-host-facts': '' }, 'Own facts') : section),
    }),
  ),
);
const unknownStateApi = createStaticWorkersApi({
  ...showcaseWorkersData,
  overview: {
    workersOverview: {
      ...showcaseWorkersData.overview.workersOverview,
      transports: { elements: showcaseWorkersData.overview.workersOverview.transports.elements.map((entry, index) => (index === 0 ? { ...entry, state: 'PAUSED_BY_OPERATOR' } : entry)) },
    },
  },
});
const unknownState = render(h(WorkersOverviewScreen, { ...overviewProps, api: unknownStateApi }));
const rowCount = showcaseWorkersData.overview.workersOverview.transports.elements.length;
const classesTable = render(
  h(WorkerMessageClassesTable, {
    messageClasses: [
      { messageClass: 'App\\Few', handledCount: 2 },
      { messageClass: 'App\\Many', handledCount: 40 },
    ],
  }),
);

const keys = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true }));
const keysReadOnly = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true }), READ_ONLY);
const locales = render(h(LocalesScreen, { api: translationsApi, asSpecimen: true }));
const localesReadOnly = render(h(LocalesScreen, { api: translationsApi, asSpecimen: true }), READ_ONLY);
const importCard = render(h(ConfigImportCard, { api: translationsApi, kind: 'locales' }));
const importCardReadOnly = render(h(ConfigImportCard, { api: translationsApi, kind: 'locales' }), READ_ONLY);

let translator;
let entitiesTranslator;
let contentLocales;
const Probe = () => {
  translator = useEntityTranslator(translationsApi, { defaultLocale: 'en::FORMAL' });
  entitiesTranslator = useEntitiesTranslator(translationsApi, { defaultLocale: 'en::FORMAL' });
  contentLocales = useContentLocales(translationsApi);
  return null;
};
render(h(Probe));
const store = await translator({ entity: { objectType: 'App\\Domain\\Item', id: 1, title: 'Hello' }, locale: 'de::FORMAL', signal: new AbortController().signal });
const stores = await entitiesTranslator({
  entities: [{ objectType: 'App\\Domain\\Item', id: 1, title: 'Hello' }, { objectType: null, id: 2, title: 'World' }],
  locale: 'de::FORMAL',
  signal: new AbortController().signal,
});
const keysWithHref = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true, keyHref: key => `/app-translations/${key.id}` }));
const countriesCard = render(
  h(ConfigImportCard, { api: translationsApi, kind: 'countries', operation: async () => 3, texts: { title: 'Import countries from the configuration' } }),
);
const languages = render(h(LanguagesScreen, { api: translationsApi, asSpecimen: true }));

const switches = (html) => [...html.matchAll(/<button[^>]*role="switch"[^>]*>/g)].map(match => match[0]);
const checks = [
  ['workers overview: six tiles', count(overview, /data-slot="worker-kpi-tile"/g) === 6],
  ['workers overview: live panel with the busy processes', overview.includes('data-slot="workers-live-panel"') && overview.includes('ImportOrderMessage')],
  ['workers overview: transport links through the host link component', overview.includes('href="/workers/import_orders?tab=processes" data-host-link=""')],
  ['workers overview: an uncounted queue says why, no 0', overview.includes('Queue not set up')],
  ['workers overview: state badges of the status map', overview.includes('Backlog') && overview.includes('Stuck') && overview.includes('Undefined')],
  ['workers overview: history and sparklines drawn as SVG', count(overview, /data-slot="worker-time-chart"/g) >= 6 && count(overview, /<svg role="img"/g) >= 12],
  ['workers overview: loops listed', overview.includes('app:search:reindex --changed')],
  ['workers overview: restart enabled with write access', noneDisabled(buttonsNamed(overview, 'Restart all workers'))],
  ['workers overview: restart disabled without write access, with the reason', allDisabled(buttonsNamed(overviewReadOnly, 'Restart all workers')) && overviewReadOnly.includes('<span class="sr-only">Read-only workspace</span>')],
  ['workers overview: a manual refresh in the header', overview.includes('data-slot="workers-refresh"') && overview.includes('aria-label="Refresh now"')],
  ['workers overview: transport rows are tab stops (keyboard activation)', count(overview, /<tr[^>]*tabindex="0"/g) === rowCount],
  ['workers overview: truncated errors and uncounted queues as tooltips, not titles', overview.includes('data-slot="worker-hint"') && !overview.includes('title="Last error') && !overview.includes('title="The queue could not be counted.')],
  ['workers overview: the live description names the refresh interval only while polling', !overview.includes('Refreshed every') && render(h(WorkersOverviewScreen, { ...overviewProps, pollingIntervalMs: 10_000 })).includes('Refreshed every 10 s.')],
  ['workers overview: an unknown state shows as itself, not as a dash', unknownState.includes('PAUSED_BY_OPERATOR')],
  ['workers overview: host actions, sections and link component', overviewSlots.includes('data-host-action') && overviewSlots.includes('data-host-section') && !overviewSlots.includes('app:search:reindex --changed') && overviewSlots.includes('data-own-link')],
  ['workers overview: row restarts disabled without write access', allDisabled(buttonsNamed(overviewReadOnly, 'aria-label="Restart workers of'))],
  ['workers overview: monitoring off banner, no measured zeros', monitoringOff.includes('The worker monitoring is off') && monitoringOff.includes('not measured') && !monitoringOff.includes('Throughput, all transports')],
  ['workers overview: monitoring off names the setting, the live counts are unknown and the range is the configured one',
    monitoringOff.includes('WORKERS_ENABLED=1') && monitoringOff.includes('monitoring is off') && monitoringOff.includes('configured 0–') && !monitoringOff.includes('workers running')
      && !/data-slot="worker-process-range"[^>]*data-above-maximum/.test(monitoringOff)],
  ['transport screen: facts, five charts, message classes, live processes', transport.includes('Avg duration (15 min)') && count(transport, /data-slot="worker-time-chart"/g) === 5 && transport.includes('RefreshOrderStatusMessage') && transport.includes('Live processes')],
  ['transport screen: back link and range reference lines', transport.includes('href="/workers"') && transport.includes('max 2')],
  ['transport screen: restart disabled while the monitoring is off', noneDisabled(buttonsNamed(transport, 'Restart workers')) && allDisabled(buttonsNamed(transportMonitoringOff, 'Restart workers'))],
  ['transport screen: message classes, the most finished first', classesTable.indexOf('>Many<') !== -1 && classesTable.indexOf('>Many<') < classesTable.indexOf('>Few<')],
  ['transport screen: own sections and link component', transportSlots.includes('data-host-facts') && !transportSlots.includes('Avg duration (15 min)') && transportSlots.includes('href="/workers" data-own-link=""')],
  ['app translations: keys with values per locale::style', keys.includes('Save changes') && keys.includes('>de::FORMAL<') && keys.includes('>en::INFORMAL<')],
  ['app translations: completeness per active locale', keys.includes('data-slot="translation-completeness"') && keys.includes('de-DE')],
  ['app translations: generation enabled with write access', noneDisabled(buttonsNamed(keys, 'Generate all missing'))],
  ['app translations: generation, completeness and Add disabled without write access',
    allDisabled(buttonsNamed(keysReadOnly, 'Generate all missing')) && allDisabled(buttonsNamed(keysReadOnly, 'aria-label="Generate missing')) && allDisabled(buttonsNamed(keysReadOnly, 'Add '))],
  ['locales: one switch per flag and row, enabled with write access', switches(locales).length === 12 && switches(locales).every(button => !/ disabled=""/.test(button))],
  ['locales: isActive toggles disabled without write access', switches(localesReadOnly).length === 12 && switches(localesReadOnly).every(button => / disabled=""/.test(button))],
  ['locales: import from configuration disabled without write access', noneDisabled(buttonsNamed(locales, 'Import from configuration')) && allDisabled(buttonsNamed(localesReadOnly, 'Import from configuration'))],
  ['config import card: run disabled without write access', noneDisabled(buttonsNamed(importCard, 'Import')) && allDisabled(buttonsNamed(importCardReadOnly, 'Import'))],
  ['entity translator: one locale, the translated store back', JSON.stringify(store) === JSON.stringify({ title: { 'de::FORMAL': 'Übersetzt' } })],
  ['entities translator: several entities in one request, one store each', stores.length === 2 && JSON.stringify(stores[1]) === JSON.stringify({ title: { 'de::FORMAL': 'Übersetzt' } })],
  ['app translations: the key is a link to its drawer, rows are tab stops',
    keys.includes('data-slot="app-translation-key-link"') && /href="\?edit=\d+"/.test(keys) && count(keys, /<tr[^>]*tabindex="0"/g) > 0
      && keysWithHref.includes('href="/app-translations/')],
  ['config import card: a host kind with its own operation and texts', countriesCard.includes('Import countries from the configuration') && noneDisabled(buttonsNamed(countriesCard, 'Import'))],
  ['languages: the import button says what it does; the writing-styles select carries the write-access reason',
    languages.includes('title="Creates or updates every language of the configuration, matched by language code."')
      && [...render(h(LanguagesScreen, { api: translationsApi, asSpecimen: true }), READ_ONLY).matchAll(/<button[^>]*role="combobox"[^>]*>/g)].some(match => match[0].includes('title="Read-only workspace"'))],
  ['content locales: one key per active language', JSON.stringify(contentLocales) === JSON.stringify(['en::FORMAL', 'de::FORMAL'])],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
