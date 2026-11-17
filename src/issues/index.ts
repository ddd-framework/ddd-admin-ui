// The issues entry: the screen of Core's issues registry (`IssuesControllerTrait`) on the host's RTK Query api
// (`createIssuesApi`), its parts, the payload types, the status map and the pure helpers. Charts are SVG, no peer.

// API
export { buildIssuesRequests, createIssuesApi, createStaticIssuesApi, ISSUES_TAG, issuesEndpointDefinitions } from './api.ts';
export type { CreateIssuesApiOptions, IssuesApi, StaticIssuesData } from './api.ts';
export type * from './types.ts';

// Screen and parts
export { ISSUE_SECTION_OPTIONS, IssuesScreen } from './IssuesScreen.tsx';
export type { IssuesScreenProps } from './IssuesScreen.tsx';
export { IssueGroupDrawer, IssueGroupFlags, IssueGroupStatusActions } from './IssueGroupDrawer.tsx';
export type { IssueGroupDrawerProps, IssueGroupStatusActionsProps } from './IssueGroupDrawer.tsx';
export { IssueCauses, IssueCodeContext, IssueDetailBlock, IssueEventDetails, IssueFrameList, IssueWorkerContext } from './IssueEventDetails.tsx';
export type { IssueEventDetailsProps } from './IssueEventDetails.tsx';
export { IssuesTrendBars, IssuesTrendCard, IssuesWindowSwitch, useStepLabel, useTrendErrorText } from './IssuesTrendChart.tsx';
export type { IssuesTrendBarsProps, IssuesTrendCardProps, IssuesWindowSwitchProps } from './IssuesTrendChart.tsx';

// Status map and helpers
export { ISSUE_GROUP_STATUS, toIssueGroupStatus } from './status.ts';
export {
  ALL_ISSUE_ENVIRONMENTS,
  causeFrameViewsOf,
  codeContextRows,
  DEFAULT_ISSUES_WINDOW,
  ISSUE_GROUPS_PAGE_SIZE,
  ISSUE_SECTIONS,
  isClientIssueSection,
  issueFrameViewsOf,
  issueGroupKey,
  ISSUES_WINDOW_PRESETS,
  issueShowCommand,
  parseIssueGroupKey,
  parseIssuesTime,
  resolveIssuesWindow,
  segmentIssueFrames,
  sortIssueEventsNewestFirst,
  toIssuesWindowPreset,
  trendAxisMax,
  trendBarsOf,
} from './format.ts';
export type { IssueFrameSegment, IssueFrameView, IssuesTrendBar, IssuesWindowPreset } from './format.ts';
