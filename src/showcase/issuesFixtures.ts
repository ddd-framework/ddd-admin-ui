// Sample payloads of the ./issues endpoints (`IssuesControllerTrait`): two environments, six error groups, a stalled
// registry in staging, the details of every group (a failed request with a cause, a failed job, a browser error with a
// resolved frame and breadcrumbs, a group whose occurrences could not be read), a trend over any window. The showcase
// draws the screen with them through `createStaticIssuesApi`; a host can use them in its own tests.
import { staticQueryFailure } from '../logic/pure/injectedApi.ts';
import type { StaticIssuesData } from '../issues/api.ts';
import type {
  IssueEventDetail,
  IssueGroupDetailResponse,
  IssueGroupSummary,
  IssueGroupsListArg,
  IssuesTrendArg,
  IssuesTrendResponse,
} from '../issues/types.ts';
import { SHOWCASE_NOW_MS } from './fixtures.ts';

const at = (minutesAgo: number): string => new Date(SHOWCASE_NOW_MS - minutesAgo * 60_000).toISOString().slice(0, 19).replace('T', ' ');

const GROUPS: IssueGroupSummary[] = [
  {
    environment: 'production', groupHash: 'a1f04c9e2b7d4c55', status: 'OPEN', exceptionType: 'RuntimeException',
    sampleMessage: 'Could not import the price list: the file is not valid JSON', slug: 'runtime-exception-import', logOrigin: 'app',
    section: 'HTTP', routePattern: 'POST /api/admin/catalog/imports', firstSeenAt: at(60 * 30), lastSeenAt: at(4), eventCount: 412,
    releaseFirstSeen: '2026.01.08', releaseLastSeen: '2026.01.29', isNew: false, isRegression: true, resolvedAt: null,
  },
  {
    environment: 'production', groupHash: 'b27e9d0a6c3f1e88', status: 'OPEN', exceptionType: 'LogicException',
    sampleMessage: 'Push payload for order 881 has no recipient', slug: 'logic-exception-push', logOrigin: 'app', section: 'MESSENGER',
    routePattern: 'SendPushMessage (send_push)', firstSeenAt: at(180), lastSeenAt: at(12), eventCount: 38, releaseFirstSeen: '2026.01.29',
    releaseLastSeen: '2026.01.29', isNew: true, isRegression: false, resolvedAt: null,
  },
  {
    environment: 'production', groupHash: 'c93a71f5d2e04b16', status: 'OPEN', exceptionType: 'TypeError',
    sampleMessage: "Cannot read properties of undefined (reading 'price')", slug: 'type-error-price', logOrigin: 'web', section: 'WEB',
    routePattern: '/orders/[orderId]', firstSeenAt: at(60 * 50), lastSeenAt: at(33), eventCount: 1290, releaseFirstSeen: '2026.01.05',
    releaseLastSeen: '2026.01.29', isNew: false, isRegression: false, resolvedAt: null,
  },
  {
    environment: 'production', groupHash: 'd4b8e2c7a9f13d02', status: 'RESOLVED', exceptionType: 'PDOException',
    sampleMessage: 'SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying to get lock', slug: 'pdo-deadlock',
    logOrigin: 'app', section: 'CLI', routePattern: 'app:reports:aggregate', firstSeenAt: at(60 * 24 * 9), lastSeenAt: at(60 * 26),
    eventCount: 7, releaseFirstSeen: '2026.01.08', releaseLastSeen: '2026.01.20', isNew: false, isRegression: false, resolvedAt: at(60 * 25),
  },
  {
    environment: 'production', groupHash: 'e51c6a3b8d7f2a49', status: 'IGNORED', exceptionType: 'NotFoundHttpException',
    sampleMessage: 'No route found for "GET /favicon.png"', slug: 'not-found-favicon', logOrigin: 'app', section: 'HTTP',
    routePattern: null, firstSeenAt: at(60 * 24 * 20), lastSeenAt: at(90), eventCount: 5320, releaseFirstSeen: '2025.12.18',
    releaseLastSeen: '2026.01.29', isNew: false, isRegression: false, resolvedAt: null,
  },
  {
    environment: 'staging', groupHash: 'f06d2b9c4e8a7c31', status: 'OPEN', exceptionType: 'TimeoutException',
    sampleMessage: 'The payment provider did not answer within 10 s', slug: 'timeout-payment', logOrigin: 'app', section: 'HTTP',
    routePattern: 'POST /api/client/checkout', firstSeenAt: at(300), lastSeenAt: at(70), eventCount: 14, releaseFirstSeen: '2026.01.30-rc.1',
    releaseLastSeen: '2026.01.30-rc.1', isNew: true, isRegression: false, resolvedAt: null,
  },
];

const ENVIRONMENTS = ['production', 'staging'];

const groupsFor = ({ environment, status = 'OPEN', search, section, release, limit = 50, offset = 0 }: IssueGroupsListArg) => {
  const resolved = environment || 'production';
  const inScope = GROUPS.filter(group => resolved === 'all' || group.environment === resolved);
  const needle = search?.toLowerCase();
  const matching = inScope
    .filter(group => status === 'ALL' || group.status === status)
    .filter(group => !needle || `${group.exceptionType} ${group.sampleMessage} ${group.routePattern ?? ''}`.toLowerCase().includes(needle))
    .filter(group => !section || group.section === section)
    .filter(group => !release || group.releaseFirstSeen === release || group.releaseLastSeen === release)
    .sort((a, b) => (b.lastSeenAt ?? '').localeCompare(a.lastSeenAt ?? ''));
  const countOf = (value: string) => inScope.filter(group => group.status === value).length;
  const staging = resolved === 'staging';
  return {
    groups: { elements: matching.slice(offset, offset + limit) },
    statusCounts: { open: countOf('OPEN'), resolved: countOf('RESOLVED'), ignored: countOf('IGNORED') },
    environments: ENVIRONMENTS,
    environment: resolved,
    health: staging
      ? { lastSuccessfulRunAt: at(95), newestEventAt: at(70), jobStalled: true, collectorSilent: false, lastError: 'The log backend answered 502 Bad Gateway' }
      : { lastSuccessfulRunAt: at(1), newestEventAt: at(4), jobStalled: false, collectorSilent: false, lastError: null },
  };
};

const stepOf = (windowMs: number): number => (windowMs <= 3_600_000 ? 60 : windowMs <= 6 * 3_600_000 ? 600 : windowMs <= 24 * 3_600_000 ? 3600 : 21_600);

const trendFor = ({ environment, groupHash, status, search, section, release, from, to }: IssuesTrendArg): IssuesTrendResponse => {
  const toMs = to ? Date.parse(to) : SHOWCASE_NOW_MS;
  const fromMs = from ? Date.parse(from) : toMs - 24 * 3_600_000;
  const stepSeconds = stepOf(toMs - fromMs);
  const step = stepSeconds * 1000;
  const first = Math.floor(fromMs / step) * step;
  const seed = (groupHash ?? environment ?? 'x').length;
  const elements: { x: string; y: number }[] = [];
  for (let ms = first, index = 0; ms <= toMs; ms += step, index += 1) {
    const wave = Math.round((Math.sin((index + seed) / 2.3) + 1.2) * (groupHash ? 2 : 9) + ((index * 7 + seed) % 5));
    elements.push({ x: new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z'), y: index % 11 === 4 ? 0 : wave });
  }
  const filtered = !groupHash && (status !== 'ALL' || Boolean(search || section || release));
  const total = elements.reduce((sum, point) => sum + point.y, 0);
  return {
    environment: environment ?? 'production',
    groupHash: groupHash ?? null,
    from: new Date(fromMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    to: new Date(toMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    stepSeconds,
    series: { name: environment ?? 'production', stepSeconds, elements },
    total,
    trendError: environment === 'staging' ? 'backend_partial' : null,
    isFilteredByGroups: filtered,
    matchingGroupCount: filtered ? 3 : null,
    summedGroupCount: filtered ? 3 : null,
    isTruncated: false,
  };
};

const backendFrames = {
  elements: [
    {
      file: 'src/Domain/Catalog/Services/PriceListImportService.php', line: 88, function: 'App\\Domain\\Catalog\\Services\\PriceListImportService->decode',
      inApp: true, codeContextStartLine: 86,
      codeContextLines: ['        $raw = $this->objectStorage->getObject($path);', '        try {', '            return json_decode($raw, true, 512, JSON_THROW_ON_ERROR);', '        } catch (JsonException $exception) {', "            throw new RuntimeException('Could not import the price list: the file is not valid JSON', 0, $exception);"],
    },
    { file: 'src/Presentation/Api/Admin/Catalog/ImportsController.php', line: 41, function: 'App\\Presentation\\Api\\Admin\\Catalog\\ImportsController->create', inApp: true, codeContextLines: [] },
    { file: 'vendor/symfony/http-kernel/HttpKernel.php', line: 183, function: 'Symfony\\Component\\HttpKernel\\HttpKernel->handleRaw', inApp: false, codeContextLines: [] },
    { file: 'vendor/symfony/http-kernel/HttpKernel.php', line: 76, function: 'Symfony\\Component\\HttpKernel\\HttpKernel->handle', inApp: false, codeContextLines: [] },
    { file: 'public/index.php', line: 20, function: '{main}', inApp: false, codeContextLines: [] },
  ],
};

const requestEvent = (minutesAgo: number, id: string): IssueEventDetail => ({
  eventId: id, timestamp: at(minutesAgo), level: 'ERROR', message: 'RuntimeException: Could not import the price list: the file is not valid JSON',
  errorType: 'RuntimeException', route: '/api/admin/catalog/imports', httpStatus: 500, httpMethod: 'POST',
  routeParameters: { elements: [{ key: 'format', value: 'json' }] }, command: null, release: '2026.01.29', commit: null,
  stackTrace: '#0 src/Domain/Catalog/Services/PriceListImportService.php(88): json_decode()\n#1 src/Presentation/Api/Admin/Catalog/ImportsController.php(41)\n#2 vendor/symfony/http-kernel/HttpKernel.php(183)',
  breadcrumbs: { elements: [] }, frames: { elements: [] }, backendFrames,
  causes: { elements: [{ type: 'JsonException', message: 'Syntax error', file: 'src/Domain/Catalog/Services/PriceListImportService.php:88', frames: { elements: [{ file: 'src/Domain/Catalog/Services/PriceListImportService.php', line: 88, function: 'json_decode', inApp: true, codeContextLines: [] }] } }] },
});

const DETAILS: Record<string, Omit<IssueGroupDetailResponse, 'group'>> = {
  a1f04c9e2b7d4c55: {
    issues: { elements: [{ issueHash: 'i-01', entryPoint: 'POST /api/admin/catalog/imports', eventCount: 398, lastSeenAt: at(4) }, { issueHash: 'i-02', entryPoint: 'app:catalog:import-nightly', eventCount: 14, lastSeenAt: at(60 * 8) }] },
    events: { elements: [requestEvent(4, 'evt-7f3a01'), requestEvent(19, 'evt-7f2c88')] },
    eventsError: null,
    logBackendUrl: 'https://logs.example.com/explore?group=a1f04c9e2b7d4c55',
    agentJson: '{"group":{"groupHash":"a1f04c9e2b7d4c55","environment":"production"},"issues":[],"events":[]}',
  },
  b27e9d0a6c3f1e88: {
    issues: { elements: [{ issueHash: 'i-03', entryPoint: 'MessageHandler:send_push', eventCount: 38, lastSeenAt: at(12) }] },
    events: {
      elements: [
        {
          eventId: 'evt-55d1a0', timestamp: at(12), level: 'CRITICAL', message: 'LogicException: Push payload for order 881 has no recipient', errorType: 'LogicException',
          routeParameters: { elements: [] }, release: '2026.01.29', breadcrumbs: { elements: [] }, frames: { elements: [] },
          backendFrames: { elements: [{ file: 'src/Domain/Notifications/SendPushHandler.php', line: 23, function: 'App\\Domain\\Notifications\\SendPushHandler->__invoke', inApp: true, codeContextStartLine: 21, codeContextLines: ['        $payload = [];', "        $payload['to'] = $device['pushToken'] ?? null;", "        throw new LogicException('Push payload for order ' . $message->orderId . ' has no recipient');"] }, { file: 'vendor/symfony/messenger/Middleware/HandleMessageMiddleware.php', line: 148, function: 'Symfony\\Component\\Messenger\\Middleware\\HandleMessageMiddleware->callHandler', inApp: false, codeContextLines: [] }] },
          causes: { elements: [] },
          worker: { messageClass: 'App\\Domain\\Notifications\\SendPushMessage', handler: 'App\\Domain\\Notifications\\SendPushHandler::__invoke', messageKeys: { elements: [{ key: 'orderId', value: '881' }, { key: 'reason', value: 'order ready' }] }, attempt: 4, final: true, retryCount: 3, transports: ['send_push'], origin: { route: 'POST /api/client/orders/{orderId}/ready', accountId: 4211, workspace: null, dispatchedAt: at(13) }, ageSeconds: 8 },
        },
      ],
    },
    eventsError: null,
    logBackendUrl: null,
    agentJson: '{"group":{"groupHash":"b27e9d0a6c3f1e88","environment":"production"},"issues":[],"events":[]}',
  },
  c93a71f5d2e04b16: {
    issues: { elements: [{ issueHash: 'i-04', entryPoint: '/orders/[orderId]', eventCount: 1290, lastSeenAt: at(33) }] },
    events: {
      elements: [
        {
          eventId: 'evt-c0ffee', timestamp: at(33), level: 'ERROR', message: "TypeError: Cannot read properties of undefined (reading 'price')", errorType: 'TypeError',
          routeParameters: { elements: [] }, release: '2026.01.29', commit: '9c1d2e7', breadcrumbs: { elements: [{ at: at(34), category: 'navigation', from: '/orders', to: '/orders/881' }, { at: at(33), category: 'fetch', url: '/api/client/orders/881', status: 200 }, { at: at(33), category: 'ui.click', message: 'button "Reorder"' }] },
          frames: { elements: [{ file: 'https://app.example.com/_next/static/chunks/812-4f1e.js', line: 1, column: 22841, function: 'r', inApp: true, resolved: true, resolvedFile: 'src/orders/OrderSummary.tsx', resolvedLine: 42, resolvedColumn: 31, resolvedFunction: 'OrderSummary', contextStartLine: 40, contextLines: ['  const lines = order.lines;', '  const first = lines[0];', '  const total = first.product.price * first.quantity;'] }, { file: 'https://app.example.com/_next/static/chunks/framework-2c7d.js', line: 1, column: 48113, function: 'Nh', inApp: false }] },
          backendFrames: { elements: [] }, causes: { elements: [] }, resolvedStackTrace: "TypeError: Cannot read properties of undefined (reading 'price')\n    at OrderSummary (src/orders/OrderSummary.tsx:42:31)",
          client: { runtime: 'browser', app: 'web', release: '2026.01.29', browserName: 'Safari', browserVersion: '18.1', osName: 'iOS', viewportWidth: 390, viewportHeight: 844, tabId: 'tab-3', routePattern: '/orders/[orderId]', url: 'https://app.example.com/orders/881' },
        },
      ],
    },
    eventsError: null,
    logBackendUrl: 'https://logs.example.com/explore?group=c93a71f5d2e04b16',
    agentJson: '{"group":{"groupHash":"c93a71f5d2e04b16","environment":"production"},"issues":[],"events":[]}',
  },
  d4b8e2c7a9f13d02: {
    issues: { elements: [{ issueHash: 'i-05', entryPoint: 'CLI:app:reports:aggregate', eventCount: 7, lastSeenAt: at(60 * 26) }] },
    events: { elements: [{ eventId: 'evt-d1', timestamp: at(60 * 26), level: 'ERROR', errorType: 'PDOException', message: 'SQLSTATE[40001]: Serialization failure: 1213 Deadlock found when trying to get lock', command: 'app:reports:aggregate --day=yesterday', routeParameters: { elements: [] }, breadcrumbs: { elements: [] }, frames: { elements: [] }, backendFrames: { elements: [] }, causes: { elements: [] }, stackTrace: '#0 vendor/doctrine/dbal/src/Connection.php(1897): PDOStatement->execute()\n#1 src/Domain/Reports/Services/ReportsAggregationService.php(130)' }] },
    eventsError: null,
    logBackendUrl: null,
    agentJson: '{"group":{"groupHash":"d4b8e2c7a9f13d02","environment":"production"}}',
  },
  e51c6a3b8d7f2a49: {
    issues: { elements: [{ issueHash: 'i-06', entryPoint: 'GET /favicon.png', eventCount: 5320, lastSeenAt: at(90) }] },
    events: { elements: [] },
    eventsError: 'The log backend did not answer within 10 s.',
    logBackendUrl: null,
    agentJson: '{"group":{"groupHash":"e51c6a3b8d7f2a49","environment":"production"}}',
  },
  f06d2b9c4e8a7c31: {
    issues: { elements: [{ issueHash: 'i-07', entryPoint: 'POST /api/client/checkout', eventCount: 14, lastSeenAt: at(70) }] },
    events: { elements: [requestEvent(70, 'evt-s1')] },
    eventsError: null,
    logBackendUrl: null,
    agentJson: '{"group":{"groupHash":"f06d2b9c4e8a7c31","environment":"staging"}}',
  },
};

/** Sample payloads of the issues endpoints (two environments, six groups, details, a trend over any window). */
export const showcaseIssuesData: StaticIssuesData = {
  groups: arg => groupsFor(arg),
  trend: arg => trendFor(arg),
  detail: ({ environment, groupHash }) => {
    const group = GROUPS.find(candidate => candidate.environment === environment && candidate.groupHash === groupHash);
    const detail = DETAILS[groupHash];
    if (!group || !detail) return staticQueryFailure({ status: 404, data: { error: `No issue group ${groupHash} in environment ${environment}` } });
    return { group, ...detail };
  },
};
