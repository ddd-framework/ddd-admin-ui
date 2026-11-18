/**
 * The payloads of Core's `IssuesControllerTrait` (mgamadeus/ddd 3.35.1): the error groups of the issues registry, the
 * trend, the details of one group and its status changes. Every set serialises as `{ elements: [...] }`; date-times of
 * the registry are `Y-m-d H:i:s` in UTC, the trend's `x`, `from` and `to` ISO 8601 in UTC. Structural copies of the
 * DTOs and value objects: the entry imports no host SDK.
 */

/** `IssueGroup::STATUS_*`. */
export type IssueGroupStatus = 'OPEN' | 'RESOLVED' | 'IGNORED';
/** The status filter of the list and the trend; `ALL` = no status filter. */
export type IssueStatusFilter = IssueGroupStatus | 'ALL';
/** Where an error was raised: the backend (`HTTP`, `CLI`, `MESSENGER`) or a client (`WEB`, `WEB_SERVER`, `MOBILE`). */
export type IssueSection = 'HTTP' | 'CLI' | 'MESSENGER' | 'WEB' | 'WEB_SERVER' | 'MOBILE';
/** `trendError` of the trend: why the points may be too low; `null` = complete. */
export type IssuesTrendError = 'backend_unavailable' | 'backend_not_configured' | 'backend_partial';

/** One set as the framework serialises it. */
export interface IssuesElements<T> {
  elements?: T[];
}

/** `IssueGroupSummary`: one error group (one root cause in one environment). */
export interface IssueGroupSummary {
  environment: string;
  groupHash: string;
  status: IssueGroupStatus | string;
  exceptionType?: string | null;
  sampleMessage?: string | null;
  slug?: string | null;
  logOrigin?: string | null;
  section?: IssueSection | string | null;
  /** The entry point readable (`POST /api/admin/orders`, `app:x:y`, `SendEmailMessage (send_email)`); null when unknown. */
  routePattern?: string | null;
  firstSeenAt?: string | null;
  lastSeenAt?: string | null;
  /** Approximate (collector replays). */
  eventCount: number;
  releaseFirstSeen?: string | null;
  releaseLastSeen?: string | null;
  isNew?: boolean;
  isRegression?: boolean;
  resolvedAt?: string | null;
}

/** `IssueGroupStatusTotals`: groups per status of the selected environment (summed for `all`). */
export interface IssueGroupStatusTotals {
  open: number;
  resolved: number;
  ignored: number;
}

/** `IssuesRegistryHealthSummary`: the registry job and the collector of the selected environment. */
export interface IssuesRegistryHealthSummary {
  lastSuccessfulRunAt?: string | null;
  newestEventAt?: string | null;
  jobStalled?: boolean;
  collectorSilent?: boolean;
  lastError?: string | null;
}

/** `GET /groups/list`. */
export interface IssueGroupsListResponse {
  /** Last seen first (across environments for `all`). */
  groups: IssuesElements<IssueGroupSummary>;
  statusCounts: IssueGroupStatusTotals;
  /** Configured environments first, then any others that hold groups. */
  environments: string[];
  /** The environment the page was resolved to (the request's, `all` included, or the default; `''` when none is known). */
  environment: string;
  health: IssuesRegistryHealthSummary;
}

/** `DateTimeValue` of a `DateTimeValueSequence`: `x` the bucket start (ISO 8601 UTC), `y` the events in it. */
export interface IssuesTrendPoint {
  x: string;
  y: number | null;
}

/** `DateTimeValueSequence`: gap-free, one point per bucket. */
export interface IssuesTrendSeries extends IssuesElements<IssuesTrendPoint> {
  name?: string;
  stepSeconds?: number | null;
}

/** `GET /trend`. */
export interface IssuesTrendResponse {
  environment: string;
  groupHash?: string | null;
  from: string;
  to: string;
  /** 60, 600, 3600 or 21600. */
  stepSeconds: number;
  series: IssuesTrendSeries;
  total: number;
  trendError?: IssuesTrendError | string | null;
  /** The points are the sum of the matching groups' trends (a list filter was sent). */
  isFilteredByGroups?: boolean;
  matchingGroupCount?: number | null;
  summedGroupCount?: number | null;
  /** Matching groups were left out of the sum: the points are a lower bound. */
  isTruncated?: boolean;
}

/** `IssueSummary`: one entry point of a group ("where it happens"), most events first. */
export interface IssueSummary {
  issueHash: string;
  entryPoint?: string | null;
  eventCount: number;
  lastSeenAt?: string | null;
}

/** `IssueEventKeyValue`. */
export interface IssueEventKeyValue {
  key: string;
  value?: string | null;
}

/** `IssueEventFrame`: a backend frame (with code context) or a client frame (minified, resolved by a source map). */
export interface IssueEventFrame {
  file?: string | null;
  line?: number | null;
  column?: number | null;
  function?: string | null;
  inApp?: boolean;
  resolvedFile?: string | null;
  resolvedLine?: number | null;
  resolvedColumn?: number | null;
  resolvedFunction?: string | null;
  /** Source lines around the resolved position (client frames). */
  contextLines?: string[];
  contextStartLine?: number | null;
  resolved?: boolean;
  /** `codeContextLines[0]` is line `codeContextStartLine` (backend frames). */
  codeContextStartLine?: number | null;
  codeContextLines?: string[];
}

/** `IssueEventCause`: a wrapped exception, outermost first. */
export interface IssueEventCause {
  type?: string | null;
  message?: string | null;
  file?: string | null;
  frames?: IssueEventFramesSet;
}

export type IssueEventFramesSet = IssuesElements<IssueEventFrame>;

/** `IssueEventClientContext`: the app that reported a client error. */
export interface IssueEventClientContext {
  runtime?: string | null;
  app?: string | null;
  release?: string | null;
  browserName?: string | null;
  browserVersion?: string | null;
  osName?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  tabId?: string | null;
  routePattern?: string | null;
  url?: string | null;
}

/** `IssueEventBreadcrumb`: what the client did before the error. */
export interface IssueEventBreadcrumb {
  at?: string | null;
  category?: string | null;
  message?: string | null;
  url?: string | null;
  from?: string | null;
  to?: string | null;
  status?: number | null;
}

/** `IssueEventMessageOrigin`: where a failed message was dispatched. */
export interface IssueEventMessageOrigin {
  route?: string | null;
  command?: string | null;
  accountId?: number | null;
  workspace?: string | null;
  dispatchedAt?: string | null;
}

/** `IssueEventWorkerContext`: a failed worker message. */
export interface IssueEventWorkerContext {
  messageClass?: string | null;
  handler?: string | null;
  messageKeys?: IssuesElements<IssueEventKeyValue>;
  attempt?: number | null;
  /** The attempts the transport allows in all, when the payload carries it (older servers send none). */
  maxAttempts?: number | null;
  /** `true`: the message is dropped (or in the failure transport); `false`: it comes back. */
  final?: boolean | null;
  retryCount?: number | null;
  transports?: string[];
  origin?: IssueEventMessageOrigin;
  ageSeconds?: number | null;
}

/** `IssueEventDetail`: one of the newest events of a group (newest first, up to 20). */
export interface IssueEventDetail {
  eventId?: string | null;
  timestamp?: string | null;
  level?: string | null;
  message?: string | null;
  errorType?: string | null;
  route?: string | null;
  httpStatus?: number | null;
  httpMethod?: string | null;
  routeParameters?: IssuesElements<IssueEventKeyValue>;
  command?: string | null;
  release?: string | null;
  /** The client's commit tag. */
  commit?: string | null;
  /** Cut at the event cap. */
  stackTrace?: string | null;
  /** Absent when the event has none. */
  client?: IssueEventClientContext;
  breadcrumbs?: IssuesElements<IssueEventBreadcrumb>;
  /** Client frames (minified, resolved where a source map of the release was found). */
  frames?: IssueEventFramesSet;
  backendFrames?: IssueEventFramesSet;
  causes?: IssuesElements<IssueEventCause>;
  /** Absent when the event has none. */
  worker?: IssueEventWorkerContext;
  /** Only when a frame was resolved. */
  resolvedStackTrace?: string | null;
  /** The source-map store failed. */
  resolveError?: string | null;
}

/** `GET /groups/{environment}/{groupHash}`. */
export interface IssueGroupDetailResponse {
  group: IssueGroupSummary;
  issues: IssuesElements<IssueSummary>;
  events: IssuesElements<IssueEventDetail>;
  /** Why the events could not be read from the log backend; null when they were. */
  eventsError?: string | null;
  /** The group in the log backend; null when not configured. */
  logBackendUrl?: string | null;
  /** The group, its issues and newest events as `app:issues:show --format=json` prints them. */
  agentJson: string;
}

/** `POST …/resolve`, `…/ignore`, `…/reopen`: the group with its new status. */
export interface IssueGroupResponse {
  group: IssueGroupSummary;
}

/** Arguments of `GET /groups/list`; an omitted environment resolves to the first known one. */
export interface IssueGroupsListArg {
  /** A registry environment, or `all`. */
  environment?: string;
  status?: IssueStatusFilter;
  search?: string;
  section?: string;
  release?: string;
  /** 50 by default, clamped to 1 … 200. */
  limit?: number;
  offset?: number;
}

/** Arguments of `GET /trend`: the list's filters, or one group (`groupHash`, a real environment, no list filter). */
export interface IssuesTrendArg {
  environment?: string;
  groupHash?: string;
  status?: IssueStatusFilter;
  search?: string;
  section?: string;
  release?: string;
  /** ISO 8601; default 24 hours before `to`, at most 31 days. */
  from?: string;
  /** ISO 8601; default now. */
  to?: string;
}

/** One group: a real environment (never `all`) and its hash. */
export interface IssueGroupArg {
  environment: string;
  groupHash: string;
}
