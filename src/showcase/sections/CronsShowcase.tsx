'use client';

import { useState } from 'react';

import { createStaticCronsApi } from '../../crons/api.ts';
import { CronDurationChart, CronTimeline } from '../../crons/charts.tsx';
import { CronDetailsDrawer } from '../../crons/CronDetailsDrawer.tsx';
import { CronFormDrawer, CronSchedulePreview } from '../../crons/CronFormDrawer.tsx';
import { CronsScreen, CronTimelineCard, type CronTimelineWindow } from '../../crons/CronsScreen.tsx';
import {
  CronActionErrorCallout,
  CronLastRun,
  CronNextRun,
  CronRowActions,
  CronRunnerBanner,
  CronRunStrip,
  CronScheduleText,
  CronsTable,
  CronSummaryTiles,
} from '../../crons/parts.tsx';
import { CronExecutionDialog, CronRunsView } from '../../crons/runs.tsx';
import type { CronExecutionsResultFilter, CronsListResponse, CronsTimelineResponse } from '../../crons/types.ts';
import { useCronActions } from '../../crons/useCronActions.ts';
import { Button } from '../../primitives/button.tsx';
import { showcaseCronsData } from '../cronsFixtures.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const api = createStaticCronsApi(showcaseCronsData);
const list = showcaseCronsData.list as CronsListResponse;
const crons = list.crons.elements ?? [];
const failing = crons.find(cron => cron.status === 'FAILING') ?? crons[0];
const stalledRunner = { ...list.runner, activeCount: 2, overdueCount: 2, runningCount: 0 };

/** The `./crons` section: the screen on sample payloads (no request, the countdowns still), its parts on their own. */
export const CronsShowcase = () => {
  const actions = useCronActions(api);
  const [result, setResult] = useState<CronExecutionsResultFilter>('ALL');
  const [hours, setHours] = useState<CronTimelineWindow>('24');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [executionId, setExecutionId] = useState<number | null>(null);
  const timeline = showcaseCronsData.timeline?.({ hours: 24 }) as CronsTimelineResponse;
  const detail = showcaseCronsData.detail?.({ cronId: failing?.id ?? 0 });
  return (
    <div className="space-y-10">
      <Sample title="CronsScreen (createStaticCronsApi)">
        <div className="w-full">
          <CronsScreen api={api} pollingIntervalMs={0} tick={false} />
        </div>
      </Sample>
      <Sample title="CronSummaryTiles, CronRunnerBanner (every active Cron overdue), CronActionErrorCallout">
        <div className="w-full space-y-4">
          <CronSummaryTiles runner={list.runner} />
          <CronRunnerBanner runner={stalledRunner} />
          <CronActionErrorCallout
            actions={{ ...actions, error: { cronId: 2, cronName: 'rebuild-search-index', message: 'The Cron rebuild-search-index is running: wait until the run has finished.', isConflict: true } }}
          />
        </div>
      </Sample>
      <Sample title="CronsTable">
        <div className="w-full">
          <CronsTable crons={crons} runner={list.runner} actions={actions} tick={false} />
        </div>
      </Sample>
      {failing && (
        <Sample title="CronScheduleText, CronNextRun, CronLastRun, CronRunStrip, CronRowActions">
          <div className="flex w-full flex-wrap items-start gap-6">
            <CronScheduleText schedule={failing.schedule} />
            <CronNextRun cron={failing} serverNow={list.runner.serverNow} tick={false} />
            <CronLastRun execution={failing.lastExecution} />
            <CronRunStrip runs={failing.recentExecutions?.elements ?? []} />
            <CronRowActions cron={failing} actions={actions} onEdit={() => setFormOpen(true)} />
          </div>
        </Sample>
      )}
      {detail && 'durationHistory' in detail && (
        <Sample title="CronDurationChart">
          <div className="w-full max-w-xl">
            <CronDurationChart runs={detail.durationHistory.elements ?? []} />
          </div>
        </Sample>
      )}
      <Sample title="CronTimeline, CronTimelineCard">
        <div className="w-full space-y-6">
          <CronTimeline timeline={timeline} />
          <CronTimelineCard api={api} hours={hours} onHoursChange={setHours} />
        </div>
      </Sample>
      <Sample title="CronRunsView, CronExecutionDialog">
        <div className="w-full space-y-3">
          <CronRunsView api={api} result={result} onResultChange={setResult} pollingIntervalMs={0} />
          <Button type="button" variant="outline" onClick={() => setExecutionId(2001)}>
            Open a failed run
          </Button>
          <CronExecutionDialog api={api} executionId={executionId} onClose={() => setExecutionId(null)} />
        </div>
      </Sample>
      <Sample title="CronDetailsDrawer, CronFormDrawer, CronSchedulePreview">
        <div className="flex w-full flex-wrap items-start gap-3">
          <Button type="button" variant="outline" onClick={() => setDetailsOpen(true)}>
            Open the details drawer
          </Button>
          <Button type="button" variant="outline" onClick={() => setFormOpen(true)}>
            Open the edit form
          </Button>
          <div className="w-full max-w-md">
            <CronSchedulePreview api={api} schedule="*/15 * * * *" />
          </div>
          <CronDetailsDrawer api={api} open={detailsOpen} cronId={failing?.id ?? null} onClose={() => setDetailsOpen(false)} actions={actions} tick={false} />
          <CronFormDrawer api={api} open={formOpen} cron={failing} onClose={() => setFormOpen(false)} />
        </div>
      </Sample>
    </div>
  );
};
