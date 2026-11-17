'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { useState } from 'react';

import { FormDrawer } from '../form/FormDrawer.tsx';
import { useTranslate } from '../i18n/useTranslate.ts';
import { EntityListEmpty } from '../list/EntityListEmpty.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { DefinitionList } from '../page/DefinitionList.tsx';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { CronsApi } from './api.ts';
import { CronDurationChart } from './charts.tsx';
import { formatCronCount, formatCronDateTime, formatCronDuration, formatCronRate } from './format.ts';
import { CronLastRun, CronNextRun, CronRowActions, CronScheduleText } from './parts.tsx';
import { CronRunsView } from './runs.tsx';
import { CRON_STATUS, toCronStatus } from './status.ts';
import type { CronExecutionsResultFilter, CronOverview, CronStatus } from './types.ts';
import { type CronActions, isCronRunQueued } from './useCronActions.ts';

export interface CronDetailsDrawerProps {
  api: CronsApi;
  open: boolean;
  /** The Cron to show (kept while the drawer closes); `null` shows nothing. */
  cronId: number | null;
  onClose: () => void;
  actions: CronActions;
  onEdit?: (cron: CronOverview) => void;
  /** `false` stops the countdown (a showcase, a test). */
  tick?: boolean;
}

/**
 * One Cron (`GET /{cronId}`) in a drawer: its definition with Run now, the switch, Edit and Delete, the next 5 slots,
 * the 14-day stats, the durations of the last 100 ended runs, and its runs.
 */
export const CronDetailsDrawer = ({ api, open, cronId, onClose, actions, onEdit, tick = true }: CronDetailsDrawerProps) => {
  const { t } = useTranslate();
  const [result, setResult] = useState<CronExecutionsResultFilter>('ALL');
  const query = api.useCronQuery({ cronId: cronId ?? 0 }, { skip: cronId === null });
  const detail = cronId === null ? undefined : query.currentData;
  const cron = detail?.cron;
  const stats = detail?.stats14d;
  return (
    <FormDrawer
      open={open && cronId !== null}
      onClose={onClose}
      title={cron?.name ?? t('Cron #%id%', { replacements: { id: String(cronId ?? '') } })}
      description={cron?.description}
      metadata={cron ? { id: cron.id } : undefined}
      headerActions={
        cron && (
          <CronRowActions
            cron={cron}
            actions={actions}
            onEdit={onEdit}
          />
        )
      }
    >
      {query.isError && !detail ? (
        <EntityListEmpty tone="error" message={normalizeDddError(query.error, t('The Cron could not be loaded.')).message} />
      ) : !cron || !detail ? (
        <div className="space-y-4" aria-busy>
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6" data-slot="cron-details">
          <Card className="gap-0 py-0">
            <CardContent className="p-4">
              <DefinitionList
                layout="rows"
                items={[
                  { label: t('Status'), value: <StatusBadge value={(toCronStatus(cron.status) ?? cron.status) as CronStatus} map={CRON_STATUS} /> },
                  { label: t('Schedule'), value: <CronScheduleText schedule={cron.schedule} className="items-end" /> },
                  { label: t('Command'), value: <code className="font-mono text-xs break-all">{cron.command || cron.commandName}</code> },
                  {
                    label: t('Next run'),
                    value: <CronNextRun cron={cron} serverNow={detail.serverNow} tick={tick} queued={isCronRunQueued(actions.queued, cron)} />,
                  },
                  { label: t('Last run'), value: <CronLastRun execution={cron.lastExecution} /> },
                ]}
              />
              <p className="mt-3 text-xs text-muted-foreground">{t('Times are on the server clock, the zone the runner evaluates the schedule in.')}</p>
            </CardContent>
          </Card>

          <section>
            <SectionHeader as="h3" title={t('Next slots')} className="mb-2" />
            {(detail.nextRuns.elements ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('None: the Cron is paused or its command is missing.')}</p>
            ) : (
              <ol className="space-y-1 text-sm tabular-nums" data-slot="cron-next-slots">
                {(detail.nextRuns.elements ?? []).map(slot => (
                  <li key={slot.scheduledAt ?? ''}>{formatCronDateTime(slot.scheduledAt, { year: false })}</li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <SectionHeader as="h3" title={t('Last 14 days')} className="mb-2" />
            <DefinitionList
              columns={2}
              items={[
                { label: t('Runs'), value: formatCronCount(stats?.runCount) },
                { label: t('Failed', { context: 'cron-stats' }), value: formatCronCount(stats?.failureCount) },
                { label: t('Success rate'), value: formatCronRate(stats?.successRate) },
                {
                  label: t('Duration'),
                  value: t('avg %average% · max %max%', {
                    replacements: { average: formatCronDuration(stats?.averageDurationMs), max: formatCronDuration(stats?.maxDurationMs) },
                  }),
                },
              ]}
            />
          </section>

          <section>
            <SectionHeader as="h3" title={t('Durations of the last ended runs')} className="mb-2" />
            <CronDurationChart runs={detail.durationHistory.elements ?? []} />
          </section>

          <section>
            <SectionHeader as="h3" title={t('Runs')} className="mb-2" />
            <CronRunsView api={api} cronId={cron.id} result={result} onResultChange={setResult} compact pageSize={20} />
          </section>
        </div>
      )}
    </FormDrawer>
  );
};
