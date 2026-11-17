'use client';

import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';
import { HoverReadout } from '../primitives/hint.tsx';
import { formatCronClock, formatCronDateTime, formatCronDuration, parseCronTime } from './format.ts';
import { cronRunResultOf } from './status.ts';
import type { CronExecutionOverview, CronsTimelineResponse, CronTimelineBucket } from './types.ts';

/**
 * The crons charts, drawn as SVG and CSS grid without a chart library (no optional peer). Colours are colour roles of the
 * host contract (`var(--primary)`, `var(--destructive)`); a failed run never rests on colour alone (its bar is full
 * height and its tooltip says so).
 */

const CHART_HEIGHT = 120;

export interface CronDurationChartProps {
  /** Ended runs, oldest first (`durationHistory` of the details). */
  runs: readonly CronExecutionOverview[];
  className?: string;
}

/** The durations of the last ended runs as bars, oldest left; failed runs in the danger colour; the average as a line. */
export const CronDurationChart = ({ runs, className }: CronDurationChartProps) => {
  const { t } = useTranslate();
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('No ended run yet.')}</p>;
  }
  const durations = runs.map(run => run.durationMs ?? 0);
  const longest = Math.max(1000, ...durations);
  const average = durations.reduce((sum, value) => sum + value, 0) / durations.length;
  const failed = runs.filter(run => cronRunResultOf(run) === 'FAILED').length;
  const width = Math.max(runs.length * 6, 60);
  const barWidth = 4;
  const averageY = CHART_HEIGHT - (average / longest) * (CHART_HEIGHT - 4);
  return (
    <figure data-slot="cron-duration-chart" className={cn('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        <span>{t('max %duration%', { replacements: { duration: formatCronDuration(longest) } })}</span>
        <span>{t('average %duration%', { replacements: { duration: formatCronDuration(average) } })}</span>
      </div>
      <svg
        role="img"
        aria-label={t('Durations of the last %runs% ended runs, %failed% failed', { replacements: { runs: String(runs.length), failed: String(failed) } })}
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={CHART_HEIGHT}
        className="block rounded-lg bg-tint"
      >
        {runs.map((run, index) => {
          const isFailed = cronRunResultOf(run) === 'FAILED';
          const height = Math.max(2, ((run.durationMs ?? 0) / longest) * (CHART_HEIGHT - 4));
          return (
            <rect
              key={run.id}
              x={index * 6 + 1}
              y={CHART_HEIGHT - height}
              width={barWidth}
              height={height}
              rx={1}
              fill={isFailed ? 'var(--destructive)' : 'var(--primary)'}
              fillOpacity={isFailed ? 1 : 0.75}
            >
              <title>{`${formatCronDateTime(run.startedAt)} · ${formatCronDuration(run.durationMs)}${isFailed ? ` · ${t('failed', { context: 'cron-run' })}` : ''}`}</title>
            </rect>
          );
        })}
        <line x1={0} x2={width} y1={averageY} y2={averageY} stroke="var(--muted-foreground)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-primary" />
          {t('Successful', { context: 'cron-run-result' })}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px] bg-destructive" />
          {t('Failed', { context: 'cron-run-result' })}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-0 w-3.5 border-t-2 border-dashed border-muted-foreground" />
          {t('Average')}
        </span>
      </figcaption>
    </figure>
  );
};

/** The colour of a timeline cell: runs with failures in the danger or warning colour, runs without in the success one. */
const cellClass = (bucket: CronTimelineBucket | undefined): string => {
  if (!bucket || (bucket.runCount ?? 0) === 0) return 'bg-tint';
  const failures = bucket.failureCount ?? 0;
  if (failures === 0) return 'bg-success';
  return failures >= (bucket.runCount ?? 0) ? 'bg-destructive' : 'bg-warning';
};

export interface CronTimelineProps {
  timeline: CronsTimelineResponse;
  className?: string;
}

/**
 * Runs per Cron per bucket (`bucketMinutes`) over the window: one lane per Cron, one cell per bucket, coloured by
 * failures and runs, its tooltip with the counts and the longest run. A lane without buckets is an idle Cron. The grid
 * scrolls sideways inside itself on a narrow screen.
 */
export const CronTimeline = ({ timeline, className }: CronTimelineProps) => {
  const { t } = useTranslate();
  const fromMs = parseCronTime(timeline.from);
  const toMs = parseCronTime(timeline.to);
  const stepMs = Math.max(1, timeline.bucketMinutes) * 60_000;
  const lanes = timeline.lanes.elements ?? [];
  if (fromMs === null || toMs === null || lanes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('No Cron in the window.')}</p>;
  }
  const firstBucket = Math.floor(fromMs / stepMs) * stepMs;
  const count = Math.max(1, Math.ceil((toMs - firstBucket) / stepMs));
  const starts = Array.from({ length: count }, (_, index) => firstBucket + index * stepMs);
  const tickEvery = Math.max(1, Math.round(count / 6));
  return (
    <HoverReadout slot="cron-timeline" className={cn('min-w-0 overflow-x-auto', className)}>
      <table className="w-max border-separate border-spacing-y-1 text-xs">
        <caption className="sr-only">{t('Runs per Cron and time bucket')}</caption>
        <tbody>
          {lanes.map(lane => {
            const byStart = new Map<number, CronTimelineBucket>();
            for (const bucket of lane.buckets?.elements ?? []) {
              const ms = parseCronTime(bucket.startsAt);
              if (ms !== null) byStart.set(Math.floor(ms / stepMs) * stepMs, bucket);
            }
            const idle = byStart.size === 0;
            return (
              <tr key={lane.cronId} data-cron-lane={lane.cronName}>
                <th scope="row" className="sticky left-0 z-(--layer-raised) max-w-40 truncate bg-card pr-3 text-left font-medium">
                  {lane.cronName}
                  {idle && <span className="ml-1.5 font-normal text-muted-foreground">{t('idle', { context: 'cron-lane' })}</span>}
                </th>
                {starts.map(start => {
                  const bucket = byStart.get(start);
                  const runs = bucket?.runCount ?? 0;
                  const label = runs
                    ? t('%time%: %runs% runs, %failures% failed, longest %duration%', {
                        replacements: {
                          time: formatCronDateTime(start),
                          runs: String(runs),
                          failures: String(bucket?.failureCount ?? 0),
                          duration: formatCronDuration(bucket?.maxDurationMs),
                        },
                      })
                    : t('%time%: no run', { replacements: { time: formatCronDateTime(start) } });
                  return (
                    <td key={start} className="p-0">
                      <span data-readout={label} aria-label={label} role="img" className={cn('block h-5 w-2.5 rounded-[2px] sm:w-3', cellClass(bucket))} />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td />
            {starts.map((start, index) => (
              <td key={start} className="relative h-4 p-0 text-muted-foreground">
                {index % tickEvery === 0 && <span className="absolute top-0 left-0 whitespace-nowrap tabular-nums">{formatCronClock(start)}</span>}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </HoverReadout>
  );
};
