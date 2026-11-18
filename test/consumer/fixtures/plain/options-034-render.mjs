// Server render of the optional props added in 0.3.4 on the sample payloads of ./showcase through the static apis:
// the workers screens' section state (`renderSection`'s third argument), the runs cap (`listMaxTop`) and the exported
// runs columns; the app translations screen's "has a value in" filter, its header and completeness switches, the card
// footer and row actions slots, the host's transform of the list request, the drawer's create value, and the host cache
// tags of the api factories.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build:
// node test/consumer/fixtures/plain/options-034-render.mjs
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { setTranslations, translateText } from '@mgamadeus/ddd-admin-ui/i18n';
import { withHostTags } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { SHOWCASE_NOW_MS, showcaseTranslationsData, showcaseWorkersData } from '@mgamadeus/ddd-admin-ui/showcase';
import { AppTranslationsScreen, createStaticTranslationsApi } from '@mgamadeus/ddd-admin-ui/translations';
import {
  createStaticWorkersApi,
  WORKER_LIST_MAX_TOP,
  workerMessageRunColumns,
  WorkersOverviewScreen,
  WorkerTransportScreen,
  workersEndpointDefinitions,
} from '@mgamadeus/ddd-admin-ui/workers';

setTranslations('en', 'FORMAL', {});
const render = element => renderToStaticMarkup(h(AdminUiProvider, {}, element));
const checks = [];

// ── workers ────────────────────────────────────────────────────────────────────────────────────────────────────────
const workersApi = createStaticWorkersApi(showcaseWorkersData);
const seenStates = [];
const overview = render(
  h(WorkersOverviewScreen, {
    api: workersApi,
    transportHref: transport => `/workers/${transport}`,
    historyAnchorMs: SHOWCASE_NOW_MS,
    pollingIntervalMs: 0,
    renderSection: (id, section, state) => {
      seenStates.push([id, state]);
      return id === 'loops' ? h('p', { 'data-host-section': '' }, `window ${state.window}, monitoring ${state.monitoringEnabled}`) : section;
    },
  }),
);
checks.push(
  ['workers overview: renderSection gets the section state', seenStates.length > 0 && seenStates.every(([, state]) => typeof state.window === 'string' && typeof state.search === 'string') && overview.includes('data-host-section')],
);
const transportStates = [];
render(
  h(WorkerTransportScreen, {
    api: workersApi,
    transport: 'import_orders',
    backHref: '/workers',
    historyAnchorMs: SHOWCASE_NOW_MS,
    pollingIntervalMs: 0,
    listMaxTop: 2000,
    renderSection: (id, section, state) => {
      transportStates.push(state);
      return section;
    },
  }),
);
checks.push(
  ['transport: renderSection gets tab, filters and the transport', transportStates.length > 0 && transportStates.every(state => state.transport === 'import_orders' && state.tab === 'overview' && state.outcome === '' && state.processFilter === '')],
  ['workers: the default list cap stays 500', WORKER_LIST_MAX_TOP === 500],
  ['workers: the runs columns are exported', workerMessageRunColumns(translateText).map(column => column.id).join(',') === 'started,outcome,message,wait,duration,attempt,error,issue'],
);
const tagged = withHostTags(workersEndpointDefinitions('/api/workers'), { provides: ['HostWorkers'], invalidates: ['HostWorkers'] });
checks.push(['workers api: host tags joined into queries and the restart', tagged.adminUiWorkersOverview.providesTags.includes('HostWorkers') && tagged.adminUiWorkersRestart.invalidatesTags.includes('HostWorkers')]);

// ── app translations ───────────────────────────────────────────────────────────────────────────────────────────────
const listArgs = [];
const translationsApi = createStaticTranslationsApi(showcaseTranslationsData);
const useListQuery = (args, options) => {
  listArgs.push(args);
  return translationsApi.useAppTranslationKeysQuery(args, options);
};
const defaultScreen = render(h(AppTranslationsScreen, { api: translationsApi, asSpecimen: true }));
const screen = render(
  h(AppTranslationsScreen, {
    api: translationsApi,
    asSpecimen: true,
    useListQuery,
    languageFilter: true,
    showGenerateAll: false,
    showCompleteness: false,
    displayMode: 'grid',
    cardFooter: key => h('p', { 'data-card-footer': '' }, `footer ${key.id}`),
    rowActions: (key, defaults) => h('span', { 'data-row-actions': '' }, defaults, h('button', { type: 'button' }, `Open ${key.id}`)),
    transformListArgs: args => ({ ...args, filters: args.filters ? `${args.filters} and scope eq 'app'` : "scope eq 'app'" }),
    columns: defaults => [...defaults, { id: 'created', header: 'Created', cell: () => '', sortKey: 'created' }],
  }),
);
checks.push(
  ['translations: the default screen keeps "Generate all missing" and no language filter', defaultScreen.includes('Generate all missing') && !defaultScreen.includes('Has a value in')],
  ['translations: showGenerateAll={false} hides the header action', !screen.includes('Generate all missing')],
  ['translations: showCompleteness={false} hides the completeness', !screen.includes('data-slot="translation-completeness"') && defaultScreen.includes('data-slot="translation-completeness"')],
  ['translations: the card footer and the row actions slot render', screen.includes('data-card-footer') && screen.includes('data-row-actions')],
  ['translations: transformListArgs reaches the list query', listArgs.length > 0 && listArgs.every(args => /scope eq 'app'/.test(args.filters ?? ''))],
);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
