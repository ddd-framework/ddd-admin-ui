// Pure helpers of the issues screens: group keys, the trend window, the trend points and the stack frames as drawn.
import { parseDddDateTimeMs } from '@mgamadeus/ddd-web/contract';

import type { IssueEventDetail, IssueEventFrame, IssueGroupArg, IssueGroupSummary, IssuesTrendSeries } from './types.ts';

/** The environment value of "every environment" (list, counts and trend summed). */
export const ALL_ISSUE_ENVIRONMENTS = 'all';

/** The page size of the groups list (the trait's default; it clamps to 1 … 200). */
export const ISSUE_GROUPS_PAGE_SIZE = 50;

/** The sections a group can come from: the backend's and the clients'. */
export const ISSUE_SECTIONS = ['HTTP', 'CLI', 'MESSENGER', 'WEB', 'WEB_SERVER', 'MOBILE'] as const;

const CLIENT_SECTIONS = new Set<string>(['WEB', 'WEB_SERVER', 'MOBILE']);

/** Errors reported by a client (browser, server rendering, mobile) rather than the backend. */
export const isClientIssueSection = (section: string | null | undefined): boolean => Boolean(section && CLIENT_SECTIONS.has(section));

/**
 * The drawer key of a group: its own environment and hash (`prod:9f2c…`). The environment of a group may differ from
 * the screen's (the screen shows "all"), so the key carries it. Environments never contain `:`.
 */
export const issueGroupKey = (group: Pick<IssueGroupSummary, 'environment' | 'groupHash'>): string => `${group.environment}:${group.groupHash}`;

/** The group a drawer key names, or `null` for anything else. */
export const parseIssueGroupKey = (key: string | null | undefined): IssueGroupArg | null => {
  if (!key) return null;
  const separator = key.indexOf(':');
  if (separator <= 0 || separator === key.length - 1) return null;
  return { environment: key.slice(0, separator), groupHash: key.slice(separator + 1) };
};

/** The trend windows offered (at most the 31 days the trend endpoint accepts). */
export const ISSUES_WINDOW_PRESETS = ['1h', '6h', '24h', '7d', '30d'] as const;
export type IssuesWindowPreset = (typeof ISSUES_WINDOW_PRESETS)[number];
export const DEFAULT_ISSUES_WINDOW: IssuesWindowPreset = '24h';

const PRESET_MS: Record<IssuesWindowPreset, number> = {
  '1h': 3_600_000,
  '6h': 6 * 3_600_000,
  '24h': 24 * 3_600_000,
  '7d': 7 * 24 * 3_600_000,
  '30d': 30 * 24 * 3_600_000,
};

/** A window value from the URL; anything unknown is the default. */
export const toIssuesWindowPreset = (value: string | null | undefined): IssuesWindowPreset =>
  (ISSUES_WINDOW_PRESETS as readonly string[]).includes(value ?? '') ? (value as IssuesWindowPreset) : DEFAULT_ISSUES_WINDOW;

const toIsoSeconds = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

/** The window ending at the minute of `anchorMs`, as the ISO bounds the trend takes. */
export const resolveIssuesWindow = (preset: IssuesWindowPreset, anchorMs: number): { from: string; to: string } => {
  const to = Math.floor(anchorMs / 60_000) * 60_000;
  return { from: toIsoSeconds(to - PRESET_MS[preset]), to: toIsoSeconds(to) };
};

/** A registry date-time (`Y-m-d H:i:s` UTC) or an ISO instant, in ms; `null` when absent or unreadable. */
export const parseIssuesTime = (value: string | null | undefined): number | null => {
  if (!value) return null;
  if (/[TZ+]/.test(value.slice(10))) {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return parseDddDateTimeMs(value);
};

/** One bar of the trend: the bucket start and its events (a missing reading stays `null`, never 0). */
export interface IssuesTrendBar {
  ms: number;
  value: number | null;
}

/** The points of a trend series in time order, unreadable ones dropped. */
export const trendBarsOf = (series: IssuesTrendSeries | null | undefined): IssuesTrendBar[] =>
  (series?.elements ?? [])
    .map(point => ({ ms: parseIssuesTime(point.x), value: typeof point.y === 'number' ? point.y : null }))
    .filter((bar): bar is IssuesTrendBar => bar.ms !== null)
    .sort((a, b) => a.ms - b.ms);

/** A rounded axis maximum and its ticks (0, ½, max) for event counts. */
export const trendAxisMax = (bars: readonly IssuesTrendBar[]): number => {
  const max = bars.reduce((highest, bar) => Math.max(highest, bar.value ?? 0), 0);
  if (max <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find(candidate => candidate * magnitude >= max / 2) ?? 10;
  return Math.ceil(max / (step * magnitude)) * step * magnitude;
};

/** A frame as the drawer draws it. */
export interface IssueFrameView {
  functionName: string | null;
  /** `file:line[:column]` (the original position of a resolved client frame). */
  location: string;
  /** The minified position of a resolved client frame; `null` otherwise. */
  minifiedLocation: string | null;
  isApp: boolean;
  contextLines: string[];
  contextStartLine: number | null;
  /** The frame's own line inside the context. */
  highlightLine: number | null;
}

const position = (file: string | null | undefined, line: number | null | undefined, column?: number | null): string =>
  [file || '?', line ?? null, column ?? null].filter(part => part !== null).join(':');

const toFrameView = (frame: IssueEventFrame): IssueFrameView => {
  const resolved = Boolean(frame.resolved && (frame.resolvedFile || frame.resolvedLine !== null));
  if (resolved) {
    return {
      functionName: frame.resolvedFunction || frame.function || null,
      location: position(frame.resolvedFile, frame.resolvedLine, frame.resolvedColumn),
      minifiedLocation: position(frame.file, frame.line, frame.column),
      isApp: frame.inApp !== false,
      contextLines: frame.contextLines ?? [],
      contextStartLine: frame.contextStartLine ?? null,
      highlightLine: frame.resolvedLine ?? null,
    };
  }
  const codeLines = frame.codeContextLines ?? [];
  return {
    functionName: frame.function || null,
    location: position(frame.file, frame.line, frame.column),
    minifiedLocation: null,
    isApp: frame.inApp === true,
    contextLines: codeLines.length > 0 ? codeLines : (frame.contextLines ?? []),
    contextStartLine: codeLines.length > 0 ? (frame.codeContextStartLine ?? null) : (frame.contextStartLine ?? null),
    highlightLine: frame.line ?? null,
  };
};

/** The frames of an event, innermost first: the backend's, else the client's (with their resolved positions). */
export const issueFrameViewsOf = (event: IssueEventDetail): IssueFrameView[] => {
  const backend = event.backendFrames?.elements ?? [];
  const frames = backend.length > 0 ? backend : (event.frames?.elements ?? []);
  return frames.map(toFrameView);
};

/** The frames of a cause, as views. */
export const causeFrameViewsOf = (frames: readonly IssueEventFrame[] | undefined): IssueFrameView[] => (frames ?? []).map(toFrameView);

/** A stack in runs: each application frame alone, consecutive framework frames as one foldable run. */
export type IssueFrameSegment =
  | { kind: 'app'; frame: IssueFrameView; index: number }
  | { kind: 'framework'; frames: IssueFrameView[]; index: number };

export const segmentIssueFrames = (frames: readonly IssueFrameView[]): IssueFrameSegment[] => {
  const segments: IssueFrameSegment[] = [];
  frames.forEach((frame, index) => {
    const last = segments[segments.length - 1];
    if (frame.isApp) segments.push({ kind: 'app', frame, index });
    else if (last?.kind === 'framework') last.frames.push(frame);
    else segments.push({ kind: 'framework', frames: [frame], index });
  });
  return segments;
};

/** The source lines of a code context with their numbers; the frame's own line marked. */
export const codeContextRows = (
  lines: readonly string[],
  startLine: number | null,
  highlightLine: number | null
): { number: number | null; text: string; current: boolean }[] =>
  lines.map((text, index) => {
    const number = startLine === null ? null : startLine + index;
    return { number, text, current: number !== null && number === highlightLine };
  });

/** Events newest first (the endpoint sends them so; a host fixture may not). */
export const sortIssueEventsNewestFirst = (events: readonly IssueEventDetail[]): IssueEventDetail[] =>
  [...events].sort((a, b) => (parseIssuesTime(b.timestamp) ?? 0) - (parseIssuesTime(a.timestamp) ?? 0));

/** The command that prints the same group again, for an agent (`app:issues:show`). */
export const issueShowCommand = ({ environment, groupHash }: IssueGroupArg): string =>
  `php bin/console app:issues:show ${groupHash} --environment=${environment} --events=3 --format=json`;
