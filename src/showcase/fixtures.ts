// Sample payloads of the screen entries, deterministic (no clock, no randomness): the showcase draws the screens
// with them through `createStaticWorkersApi` / `createStaticTranslationsApi`, and a host can use them in its own
// design reviews and tests. Transport, class and host names are neutral examples.

import type { StaticTranslationsData } from '../translations/api.ts';
import type { AdminLanguage, AdminLocale, AppTranslationKey } from '../translations/adminTypes.ts';
import type { StaticWorkersData } from '../workers/api.ts';
import type {
  DateTimeValue,
  DateTimeValueSequence,
  WorkerMessageRun,
  WorkerProcess,
  WorkersWindowArg,
  WorkerTransportHistory,
  WorkerTransportOverview,
} from '../workers/types.ts';

/** The "now" of the sample payloads: 2026-01-31 10:00 UTC. */
export const SHOWCASE_NOW_MS = Date.UTC(2026, 0, 31, 10, 0, 0);

const iso = (ms: number): string => new Date(ms).toISOString().replace('.000Z', 'Z');
/** An entity date-time (`Y-m-d H:i:s`, UTC). */
const dddTime = (ms: number): string => iso(ms).replace('T', ' ').replace('Z', '');

/** A smooth deterministic wave between 0 and 1 for step `index` of series `seed`. */
const wave = (index: number, seed: number): number => (Math.sin(index / 5 + seed) + Math.sin(index / 13 + seed * 2) + 2) / 4;

const sequence = (name: string, steps: number, startMs: number, stepSeconds: number, value: (index: number) => number | null): DateTimeValueSequence => ({
  name,
  elements: Array.from({ length: steps }, (_, index): DateTimeValue => ({ x: iso(startMs + index * stepSeconds * 1000), y: value(index) })),
});

interface TransportShape {
  transport: string;
  peak: number;
  rate: number;
  seed: number;
}

const SHAPES: readonly TransportShape[] = [
  { transport: 'import_orders', peak: 2, rate: 6, seed: 1 },
  { transport: 'send_mail', peak: 1, rate: 2, seed: 2 },
  { transport: 'render_images', peak: 3, rate: 1, seed: 3 },
  { transport: 'sync_catalog', peak: 1, rate: 0.5, seed: 4 },
];

const transportSequences = (shape: TransportShape, steps: number, startMs: number, stepSeconds: number): DateTimeValueSequence[] => {
  const factor = stepSeconds / 60;
  const processes = (index: number) => Math.round(wave(index, shape.seed) * shape.peak);
  const handled = (index: number) => Math.round(wave(index, shape.seed + 0.5) * shape.rate * factor);
  const failed = (index: number) => (index % 17 === shape.seed ? 1 : 0);
  return [
    sequence('processes', steps, startMs, stepSeconds, index => (index % 23 === 7 ? null : processes(index))),
    sequence('processStarts', steps, startMs, stepSeconds, index => (index % 11 === shape.seed ? 1 : 0)),
    sequence('waiting', steps, startMs, stepSeconds, index => (index % 23 === 7 ? null : Math.round(wave(index, shape.seed + 1) * shape.rate * 12))),
    sequence('inFlight', steps, startMs, stepSeconds, index => Math.min(processes(index), Math.round(wave(index, shape.seed + 2) * shape.peak))),
    sequence('handled', steps, startMs, stepSeconds, handled),
    sequence('failed', steps, startMs, stepSeconds, failed),
    sequence('thrown', steps, startMs, stepSeconds, failed),
    sequence('caught', steps, startMs, stepSeconds, () => 0),
    sequence('redelivered', steps, startMs, stepSeconds, index => (index % 19 === 3 ? 1 : 0)),
    sequence('durationAverageMs', steps, startMs, stepSeconds, index => (handled(index) > 0 ? 400 + wave(index, shape.seed) * 2600 : null)),
    sequence('durationMaxMs', steps, startMs, stepSeconds, index => (handled(index) > 0 ? 900 + wave(index, shape.seed + 3) * (index % 9 === 0 ? 90_000 : 5000) : null)),
    sequence('waitAverageMs', steps, startMs, stepSeconds, index => (handled(index) > 0 ? 200 + wave(index, shape.seed + 4) * 8000 : null)),
    sequence('waitMaxMs', steps, startMs, stepSeconds, index => (handled(index) > 0 ? 1000 + wave(index, shape.seed + 5) * 30_000 : null)),
  ];
};

const totalsSequences = (steps: number, startMs: number, stepSeconds: number): DateTimeValueSequence[] => {
  const perTransport = SHAPES.map(shape => transportSequences(shape, steps, startMs, stepSeconds));
  const names = perTransport[0]?.map(entry => entry.name ?? '') ?? [];
  return names.map((name, sequenceIndex) =>
    sequence(name, steps, startMs, stepSeconds, index => {
      const values = perTransport.map(list => list[sequenceIndex]?.elements?.[index]?.y);
      if (values.every(value => value === null || value === undefined)) return null;
      return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    })
  );
};

const HOUR_STEPS = 60;
const HOUR_START_MS = SHOWCASE_NOW_MS - HOUR_STEPS * 60_000;

const throughputWindows = (rate: number, processes: number) => ({
  elements: [300, 900, 3600, 86400].map(windowSeconds => ({
    windowSeconds,
    handledCount: Math.round((rate * windowSeconds) / 60),
    failedCount: windowSeconds >= 3600 ? 1 : 0,
    workerSeconds: processes * windowSeconds,
  })),
});

const process = (overrides: Partial<WorkerProcess> & { processId: number; transport: string }): WorkerProcess => ({
  processKey: `worker-7d9f8c-${overrides.processId}:${overrides.processId}`,
  hostName: `worker-${overrides.transport.replace('_', '-')}-7d9f8c-x${overrides.processId}`,
  startedAt: dddTime(SHOWCASE_NOW_MS - 42 * 60_000),
  firstMessageAt: dddTime(SHOWCASE_NOW_MS - 41 * 60_000),
  lastSeenAt: dddTime(SHOWCASE_NOW_MS - 5000),
  state: 'RUNNING',
  displayState: 'RUNNING',
  handledCount: 120,
  failedCount: 0,
  memoryBytes: 48 * 1024 * 1024,
  memoryPeakBytes: 63 * 1024 * 1024,
  ...overrides,
});

const LIVE_PROCESSES: WorkerProcess[] = [
  process({ processId: 134, transport: 'import_orders', displayState: 'BUSY', currentMessageClass: 'App\\Domain\\Orders\\ImportOrderMessage', currentMessageSince: dddTime(SHOWCASE_NOW_MS - 4000) }),
  process({ processId: 23, transport: 'import_orders', displayState: 'BUSY', currentMessageClass: 'App\\Domain\\Orders\\ImportOrderMessage', currentMessageSince: dddTime(SHOWCASE_NOW_MS - 33_000), restartRequestedAt: dddTime(SHOWCASE_NOW_MS - 20_000) }),
  process({ processId: 77, transport: 'send_mail' }),
  process({ processId: 91, transport: 'render_images', displayState: 'SILENT', currentMessageClass: 'App\\Domain\\Media\\RenderImageMessage', currentMessageSince: dddTime(SHOWCASE_NOW_MS - 400_000) }),
];

const overviewTransport = (shape: TransportShape, overrides: Partial<WorkerTransportOverview>): WorkerTransportOverview => ({
  transport: shape.transport,
  isDefined: true,
  definition: { transport: shape.transport, min: 0, max: shape.peak, limit: 200, memoryLimit: '256M', messageLog: 'all' },
  isAutoscaled: true,
  effectiveMin: 0,
  effectiveMax: shape.peak,
  waitingState: 'COUNTED',
  waiting: 0,
  waitingSampledAt: dddTime(SHOWCASE_NOW_MS - 20_000),
  inFlight: 0,
  liveProcessCount: 0,
  state: 'IDLE',
  restartPending: false,
  handledCount: Math.round(shape.rate * 15),
  thrownCount: 0,
  caughtCount: 0,
  durationAverageMs: 1200 * shape.seed,
  waitAverageMs: 800 * shape.seed,
  throughputWindows: throughputWindows(shape.rate, shape.peak),
  sequences: { elements: transportSequences(shape, HOUR_STEPS, HOUR_START_MS, 60).filter(entry => ['handled', 'failed', 'waiting', 'processes'].includes(entry.name ?? '')) },
  ...overrides,
});

const [importOrders, sendMail, renderImages, syncCatalog] = SHAPES as [TransportShape, TransportShape, TransportShape, TransportShape];

const OVERVIEW_TRANSPORTS: WorkerTransportOverview[] = [
  overviewTransport(importOrders, { state: 'BACKLOG', waiting: 227, inFlight: 2, liveProcessCount: 2, restartPending: true, thrownCount: 1, lastErrorClass: 'App\\Domain\\Orders\\OrderNotFoundException', lastErrorMessage: 'Order 4711 does not exist', lastErrorAt: dddTime(SHOWCASE_NOW_MS - 600_000) }),
  overviewTransport(sendMail, { state: 'WORKING', waiting: null, waitingState: 'QUEUE_NOT_SET_UP', liveProcessCount: 1, isAutoscaled: false, effectiveMin: 1, effectiveMax: 1, definition: { transport: 'send_mail', replicas: 1, messageLog: 'failures' } }),
  overviewTransport(renderImages, { state: 'STUCK', stuckSince: dddTime(SHOWCASE_NOW_MS - 900_000), waiting: 14, inFlight: 1, liveProcessCount: 1 }),
  overviewTransport(syncCatalog, { state: 'UNDEFINED', isDefined: false, definition: null, isAutoscaled: false, effectiveMin: null, effectiveMax: null, durationAverageMs: null, waitAverageMs: null, handledCount: 0 }),
];

const historyFor = ({ from, to, stepSeconds = 300 }: WorkersWindowArg) => {
  const endMs = to ? Date.parse(to) : SHOWCASE_NOW_MS;
  const startMs = from ? Date.parse(from) : endMs - 3_600_000;
  const steps = Math.max(Math.round((endMs - startMs) / (stepSeconds * 1000)), 1);
  return { startMs, endMs, steps, stepSeconds };
};

const RUNS: WorkerMessageRun[] = Array.from({ length: 8 }, (_, index) => ({
  id: index + 1,
  transport: 'import_orders',
  messageClass: 'App\\Domain\\Orders\\ImportOrderMessage',
  processKey: 'worker-7d9f8c-134:134',
  dispatchedFromRoute: index % 3 === 0 ? 'POST /api/orders/import' : null,
  dispatchedFromCommand: index % 3 === 1 ? 'app:orders:import' : null,
  startedAt: dddTime(SHOWCASE_NOW_MS - index * 47_000),
  durationMs: 800 + index * 410,
  waitMs: index % 4 === 2 ? null : 300 + index * 1200,
  outcome: index === 1 ? 'THROWN' : index === 4 ? 'CAUGHT' : 'HANDLED',
  attempt: index === 1 ? 2 : 1,
  willRetry: index === 1 ? false : null,
  errorClass: index === 1 ? 'App\\Domain\\Orders\\OrderNotFoundException' : index === 4 ? 'RuntimeException' : null,
  errorMessage: index === 1 ? 'Order 4711 does not exist' : index === 4 ? 'Partner API answered 503' : null,
  issueGroupHash: index === 1 ? '9f2c1e7a4b5d6c8e0a1b2c3d4e5f6a7b' : null,
}));

const PROCESS_HISTORY: WorkerProcess[] = [
  ...LIVE_PROCESSES.filter(entry => entry.transport === 'import_orders'),
  process({ processId: 12, transport: 'import_orders', state: 'STOPPED', displayState: 'STOPPED', startedAt: dddTime(SHOWCASE_NOW_MS - 3 * 3_600_000), stoppedAt: dddTime(SHOWCASE_NOW_MS - 2 * 3_600_000), stopReason: 'MESSAGE_LIMIT', handledCount: 200 }),
  process({ processId: 9, transport: 'import_orders', state: 'STOPPED', displayState: 'LOST', startedAt: dddTime(SHOWCASE_NOW_MS - 5 * 3_600_000), lastSeenAt: dddTime(SHOWCASE_NOW_MS - 4.5 * 3_600_000), stoppedAt: dddTime(SHOWCASE_NOW_MS - 4.4 * 3_600_000), stopReason: 'LOST', handledCount: 31, failedCount: 2 }),
];

/** Sample payloads of the workers endpoints (four transports, live processes, history, runs, processes). */
export const showcaseWorkersData: StaticWorkersData = {
  overview: {
    workersOverview: {
      generatedAt: dddTime(SHOWCASE_NOW_MS),
      monitoringEnabled: true,
      samplerActive: true,
      sequenceWindowSeconds: 3600,
      stepSeconds: 60,
      recentWindowSeconds: 900,
      totals: {
        waiting: null,
        inFlight: 3,
        liveProcessCount: 4,
        handledCountLastHour: 571,
        failedCountLastHour: 3,
        sequences: { elements: totalsSequences(HOUR_STEPS, HOUR_START_MS, 60) },
        throughputWindows: throughputWindows(9.5, 7),
      },
      transports: { elements: OVERVIEW_TRANSPORTS },
      processes: { elements: LIVE_PROCESSES },
      loops: { elements: [{ name: 'Search index', args: 'app:search:reindex --changed', sleepSeconds: 300, prodOnly: true }] },
    },
  },
  history: arg => {
    const { startMs, endMs, steps, stepSeconds } = historyFor(arg);
    const transports: WorkerTransportHistory[] = SHAPES.map(shape => ({ transport: shape.transport, sequences: { elements: transportSequences(shape, steps, startMs, stepSeconds) } }));
    return {
      workersHistory: {
        interval: { startDate: iso(startMs), endDate: iso(endMs) },
        stepSeconds,
        transports: { elements: transports },
        totals: { transport: '', sequences: { elements: totalsSequences(steps, startMs, stepSeconds) } },
      },
    };
  },
  transportDetail: arg => {
    const shape = SHAPES.find(entry => entry.transport === arg.transport);
    if (!shape) return undefined;
    const { startMs, endMs, steps, stepSeconds } = historyFor(arg);
    return {
      workerTransportDetail: {
        transport: OVERVIEW_TRANSPORTS.find(entry => entry.transport === arg.transport),
        recentWindowSeconds: 900,
        interval: { startDate: iso(startMs), endDate: iso(endMs) },
        stepSeconds,
        sequences: { elements: transportSequences(shape, steps, startMs, stepSeconds) },
        messageClasses: {
          elements: [
            { messageClass: 'App\\Domain\\Orders\\ImportOrderMessage', handledCount: 375, thrownCount: 1, caughtCount: 0, redeliveredCount: 1, durationAverageMs: 2100, durationMaxMs: 41_000, waitAverageMs: 5300, waitMaxMs: 61_000, lastErrorClass: 'App\\Domain\\Orders\\OrderNotFoundException', lastErrorMessage: 'Order 4711 does not exist', lastErrorAt: dddTime(SHOWCASE_NOW_MS - 600_000) },
            { messageClass: 'App\\Domain\\Orders\\RefreshOrderStatusMessage', handledCount: 64, thrownCount: 0, caughtCount: 0, redeliveredCount: 0, durationAverageMs: 380, durationMaxMs: 950, waitAverageMs: null, waitMaxMs: null },
          ],
        },
        processes: { elements: LIVE_PROCESSES.filter(entry => entry.transport === arg.transport) },
      },
    };
  },
  messageRuns: arg => ({ workerMessageRuns: { elements: RUNS.filter(run => run.transport === arg.transport && (!arg.filters?.includes("ne 'HANDLED'") || run.outcome !== 'HANDLED')) } }),
  processes: arg => ({ workerProcesses: { elements: PROCESS_HISTORY.filter(entry => entry.transport === arg.transport) } }),
  restart: arg => {
    const asked = LIVE_PROCESSES.filter(entry => !arg.transport || entry.transport === arg.transport);
    return { requestedProcessCount: asked.length, workerProcesses: { elements: asked } };
  },
};

const LANGUAGES: AdminLanguage[] = [
  { id: 1, languageCode: 'en', iso3Code: 'eng', name: 'English', nativeName: 'English', textDirection: 'LTR', isActive: true, supportedWritingStyles: 'INFORMAL' },
  { id: 2, languageCode: 'de', iso3Code: 'deu', name: 'German', nativeName: 'Deutsch', textDirection: 'LTR', isActive: true, supportedWritingStyles: 'FORMAL_AND_INFORMAL' },
  { id: 3, languageCode: 'fr', iso3Code: 'fra', name: 'French', nativeName: 'Français', textDirection: 'LTR', isActive: false, supportedWritingStyles: 'FORMAL_AND_INFORMAL' },
  { id: 4, languageCode: 'ar', iso3Code: 'ara', name: 'Arabic', nativeName: 'العربية', textDirection: 'RTL', isActive: false, supportedWritingStyles: 'FORMAL' },
];

const LOCALES: AdminLocale[] = [
  { id: 11, name: 'English (United Kingdom)', languageCode: 'en', languageId: 1, countryShortCode: 'GB', isActive: true, isDefaultLocaleForLanguage: true, isDefaultLocaleForCountry: true },
  { id: 12, name: 'German (Germany)', languageCode: 'de', languageId: 2, countryShortCode: 'DE', isActive: true, isDefaultLocaleForLanguage: true, isDefaultLocaleForCountry: true },
  { id: 13, name: 'German (Austria)', languageCode: 'de', languageId: 2, countryShortCode: 'AT', isActive: false, isDefaultLocaleForLanguage: false, isDefaultLocaleForCountry: true },
  { id: 14, name: 'French (France)', languageCode: 'fr', languageId: 3, countryShortCode: 'FR', isActive: false, isDefaultLocaleForLanguage: true, isDefaultLocaleForCountry: true },
];

const KEYS: AppTranslationKey[] = [
  {
    id: 3,
    key: 'Save changes',
    translationHint: 'Button at the end of every form.',
    requiresContext: false,
    doNotTranslateAutomatically: false,
    reTranslate: false,
    appTranslationValues: {
      elements: [
        { id: 31, appTranslationKeyId: 3, languageId: 1, translation: 'Save changes', context: 'ONE', writingStyle: 'INFORMAL' },
        { id: 32, appTranslationKeyId: 3, languageId: 2, translation: 'Änderungen speichern', context: 'ONE', writingStyle: 'INFORMAL' },
        { id: 33, appTranslationKeyId: 3, languageId: 2, translation: 'Änderungen speichern', context: 'ONE', writingStyle: 'FORMAL' },
      ],
    },
  },
  {
    id: 2,
    key: '{count, plural, one {# item} other {# items}}',
    requiresContext: true,
    reTranslate: true,
    appTranslationValues: { elements: [{ id: 21, appTranslationKeyId: 2, languageId: 2, translation: '{count, plural, one {# Eintrag} other {# Einträge}}', context: 'MANY', writingStyle: 'INFORMAL' }] },
  },
  { id: 1, key: 'Welcome back, %name%', doNotTranslateAutomatically: true, appTranslationValues: { elements: [] } },
];

/** Sample payloads of the translation endpoints (keys with values, completeness, languages, locales). */
export const showcaseTranslationsData: StaticTranslationsData = {
  appTranslationKeys: () => ({ appTranslationKeys: { elements: KEYS } }),
  appTranslationKey: arg => {
    const found = KEYS.find(key => String(key.id) === String(arg.appTranslationKeyId));
    return found ? { appTranslationKey: found } : undefined;
  },
  completeness: {
    appTranslationCompletenesses: {
      elements: [
        { locale: LOCALES[0], totalKeys: 3, informalTranslatedCount: 3, formalTranslatedCount: 3 },
        { locale: LOCALES[1], totalKeys: 3, informalTranslatedCount: 2, formalTranslatedCount: 1 },
      ],
    },
  },
  languages: arg => ({ languages: { elements: arg.filters?.includes('isActive') ? LANGUAGES.filter(language => language.isActive) : LANGUAGES } }),
  locales: arg => ({ locales: { elements: arg.filters?.includes('isActive') ? LOCALES.filter(locale => locale.isActive) : LOCALES } }),
  translateEntities: arg => ({
    translatedEntities: {
      elements: arg.entitiesToTranslate.elements?.map(entity => ({
        ...entity,
        translationInfos: { translationsStore: { title: { [`${arg.localesToTranslate.elements?.[0]?.languageCode ?? 'de'}::FORMAL`]: 'Übersetzt' } } },
      })),
    },
  }),
};
