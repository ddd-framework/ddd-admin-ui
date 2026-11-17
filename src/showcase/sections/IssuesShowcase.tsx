'use client';

import { createStaticIssuesApi, IssueEventDetails, IssueGroupStatusActions, IssuesScreen, IssuesTrendBars, trendBarsOf } from '../../issues/index.ts';
import type { IssueGroupDetailResponse, IssuesTrendResponse } from '../../issues/types.ts';
import { SHOWCASE_NOW_MS } from '../fixtures.ts';
import { showcaseIssuesData } from '../issuesFixtures.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const api = createStaticIssuesApi(showcaseIssuesData);
const detailOf = (groupHash: string) =>
  showcaseIssuesData.detail?.({ environment: 'production', groupHash }) as IssueGroupDetailResponse | undefined;
const jobDetail = detailOf('b27e9d0a6c3f1e88');
const clientDetail = detailOf('c93a71f5d2e04b16');
const trend = showcaseIssuesData.trend?.({ environment: 'production', groupHash: 'a1f04c9e2b7d4c55', to: new Date(SHOWCASE_NOW_MS).toISOString() }) as
  | IssuesTrendResponse
  | undefined;

/** The `./issues` section: the screen on sample payloads (no request), the trend pinned to a fixed hour, an occurrence of each kind. */
export const IssuesShowcase = () => (
  <div className="space-y-10">
    <Sample title="IssuesScreen (createStaticIssuesApi)">
      <div className="w-full">
        <IssuesScreen api={api} asSpecimen trendAnchorMs={SHOWCASE_NOW_MS} />
      </div>
    </Sample>
    <Sample title="IssueEventDetails: a failed job, a browser error with a resolved frame">
      <div className="grid w-full gap-6 lg:grid-cols-2">
        {jobDetail?.events.elements?.[0] && <IssueEventDetails event={jobDetail.events.elements[0]} />}
        {clientDetail?.events.elements?.[0] && <IssueEventDetails event={clientDetail.events.elements[0]} />}
      </div>
    </Sample>
    <Sample title="IssueGroupStatusActions, IssuesTrendBars (sparkline)">
      <div className="w-full max-w-md space-y-4">
        {jobDetail && <IssueGroupStatusActions api={api} group={jobDetail.group} />}
        {trend && <IssuesTrendBars bars={trendBarsOf(trend.series)} stepSeconds={trend.stepSeconds} height={48} compact label="Sparkline" />}
      </div>
    </Sample>
  </div>
);
