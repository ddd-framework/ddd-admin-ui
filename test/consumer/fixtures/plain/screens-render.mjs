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
  useContentLocales,
  useEntityTranslator,
} from '@mgamadeus/ddd-admin-ui/translations';
import { createStaticWorkersApi, WorkersOverviewScreen, WorkerTransportScreen } from '@mgamadeus/ddd-admin-ui/workers';

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

const keys = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true }));
const keysReadOnly = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true }), READ_ONLY);
const locales = render(h(LocalesScreen, { api: translationsApi, asSpecimen: true }));
const localesReadOnly = render(h(LocalesScreen, { api: translationsApi, asSpecimen: true }), READ_ONLY);
const importCard = render(h(ConfigImportCard, { api: translationsApi, kind: 'locales' }));
const importCardReadOnly = render(h(ConfigImportCard, { api: translationsApi, kind: 'locales' }), READ_ONLY);

let translator;
let contentLocales;
const Probe = () => {
  translator = useEntityTranslator(translationsApi, { defaultLocale: 'en::FORMAL' });
  contentLocales = useContentLocales(translationsApi);
  return null;
};
render(h(Probe));
const store = await translator({ entity: { objectType: 'App\\Domain\\Item', id: 1, title: 'Hello' }, locale: 'de::FORMAL', signal: new AbortController().signal });

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
  ['workers overview: restart disabled without write access, with the reason', allDisabled(buttonsNamed(overviewReadOnly, 'Restart all workers')) && overviewReadOnly.includes('title="Read-only workspace"')],
  ['workers overview: row restarts disabled without write access', allDisabled(buttonsNamed(overviewReadOnly, 'aria-label="Restart workers of'))],
  ['workers overview: monitoring off banner, no measured zeros', monitoringOff.includes('The worker monitoring is off') && monitoringOff.includes('not measured') && !monitoringOff.includes('Throughput, all transports')],
  ['transport screen: facts, five charts, message classes, live processes', transport.includes('Avg duration (15 min)') && count(transport, /data-slot="worker-time-chart"/g) === 5 && transport.includes('RefreshOrderStatusMessage') && transport.includes('Live processes')],
  ['transport screen: back link and range reference lines', transport.includes('href="/workers"') && transport.includes('max 2')],
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
  ['content locales: one key per active language', JSON.stringify(contentLocales) === JSON.stringify(['en::FORMAL', 'de::FORMAL'])],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
