'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { type PointerEvent, type ReactNode, useMemo, useState } from 'react';

import { formatUiNumber, uiDateTimeFormat } from '../i18n/format.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { SegmentedControl } from '../primitives/segmented-control.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { IssuesApi } from './api.ts';
import { fromDateTimeInputValue, toDateTimeInputValue } from '../logic/pure/dateInput.ts';
import { Input } from '../primitives/input.tsx';
import {
  ISSUES_CUSTOM_WINDOW,
  type IssuesTrendBar,
  ISSUES_WINDOW_PRESETS,
  type IssuesWindowPreset,
  type IssuesWindowValue,
  resolveIssuesCustomRange,
  trendAxisMax,
  trendBarsOf,
} from './format.ts';
import type { IssuesTrendArg, IssuesTrendResponse } from './types.ts';

/**
 * The trend of the issues screens: error events per bucket as bars, drawn as SVG by the entry (no chart library). The
 * plot scales to its container (no measurement, the same markup on the server), the pointer shows the bucket under it.
 * A missing reading is a gap, never a 0. Bars take the danger text colour of the host (`text-destructive`).
 */

const formatBucket = (ms: number, stepSeconds: number): string =>
  stepSeconds >= 21_600
    ? uiDateTimeFormat({ month: 'short', day: 'numeric', hour: 'numeric' }).format(new Date(ms))
    : stepSeconds >= 3600
      ? uiDateTimeFormat({ weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(ms))
      : uiDateTimeFormat({ hour: 'numeric', minute: '2-digit' }).format(new Date(ms));

export interface IssuesTrendBarsProps {
  bars: readonly IssuesTrendBar[];
  /** The bucket size (labels of the axis and the pointer). */
  stepSeconds: number;
  /** Plot height in px (default 140; a sparkline passes 40). */
  height?: number;
  /** A sparkline: no axis, no labels. */
  compact?: boolean;
  /** The accessible name of the chart. */
  label: string;
  className?: string;
}

/** Error events per bucket as bars (SVG). `null` buckets draw nothing. */
export const IssuesTrendBars = ({ bars, stepSeconds, height = 140, compact = false, label, className }: IssuesTrendBarsProps) => {
  const { t } = useTranslate();
  const [hovered, setHovered] = useState<number | null>(null);
  const max = useMemo(() => trendAxisMax(bars), [bars]);
  const count = Math.max(bars.length, 1);
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const index = Math.floor(((event.clientX - box.left) / box.width) * count);
    setHovered(index >= 0 && index < bars.length ? index : null);
  };
  const hoveredBar = hovered === null ? undefined : bars[hovered];
  const first = bars[0];
  const middle = bars[Math.floor(bars.length / 2)];
  const last = bars[bars.length - 1];

  return (
    <div data-slot="issues-trend-chart" className={cn('relative min-w-0', className)}>
      {!compact && (
        <div className="mb-1 flex h-4 items-center justify-between gap-2 text-[11px] text-muted-foreground tabular-nums" aria-hidden>
          <span>{formatUiNumber(max)}</span>
          {hoveredBar && (
            <span data-slot="issues-trend-readout" className="truncate text-foreground">
              {t('%time%: %count% events', {
                replacements: { time: formatBucket(hoveredBar.ms, stepSeconds), count: hoveredBar.value === null ? '—' : formatUiNumber(hoveredBar.value) },
              })}
            </span>
          )}
        </div>
      )}
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${count} ${height}`}
        preserveAspectRatio="none"
        className="block w-full text-destructive"
        style={{ height }}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHovered(null)}
      >
        {!compact && <line x1={0} x2={count} y1={height - 0.5} y2={height - 0.5} stroke="var(--border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        {!compact && <line x1={0} x2={count} y1={height / 2} y2={height / 2} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        {bars.map((bar, index) => {
          if (bar.value === null || bar.value <= 0) return null;
          const barHeight = Math.max((bar.value / max) * (height - 2), 1.5);
          return (
            <rect
              key={bar.ms}
              x={index + 0.12}
              width={0.76}
              y={height - barHeight}
              height={barHeight}
              fill="currentColor"
              opacity={hovered === null || hovered === index ? 0.85 : 0.4}
            >
              <title>{`${formatBucket(bar.ms, stepSeconds)}: ${formatUiNumber(bar.value)}`}</title>
            </rect>
          );
        })}
      </svg>
      {!compact && first && last && (
        <div className="mt-1 flex justify-between gap-2 text-[11px] text-muted-foreground tabular-nums" aria-hidden>
          <span className="truncate">{formatBucket(first.ms, stepSeconds)}</span>
          {middle && bars.length > 4 && <span className="hidden truncate sm:inline">{formatBucket(middle.ms, stepSeconds)}</span>}
          <span className="truncate">{formatBucket(last.ms, stepSeconds)}</span>
        </div>
      )}
    </div>
  );
};

/** The bucket size as text (`per hour`). */
export const useStepLabel = () => {
  const { t } = useTranslate();
  return (stepSeconds: number): string => {
    if (stepSeconds === 60) return t('per minute');
    if (stepSeconds === 600) return t('per 10 minutes');
    if (stepSeconds === 3600) return t('per hour');
    if (stepSeconds === 21_600) return t('per 6 hours');
    return t('per %seconds% s', { replacements: { seconds: stepSeconds } });
  };
};

/** Why the trend may be too low, as a sentence; `null` when it is complete. */
export const useTrendErrorText = () => {
  const { t } = useTranslate();
  return (code: string | null | undefined): string | null => {
    if (!code) return null;
    if (code === 'backend_unavailable') return t('The log backend could not be read: every bucket shows 0, which does not mean there were no errors.');
    if (code === 'backend_not_configured') return t('No log backend watches this environment: the trend cannot count its errors.');
    if (code === 'backend_partial') return t('Some environments or groups could not be read and are missing from this trend.');
    return t('The trend may be incomplete (%code%).', { replacements: { code } });
  };
};

export interface IssuesTrendCardProps {
  api: IssuesApi;
  /** The list's environment and filters (or one group) and the window. */
  arg: IssuesTrendArg;
  /** `false`: no request (no environment known yet). */
  enabled?: boolean;
  /** Controls next to the title (the window switch). */
  actions?: ReactNode;
  className?: string;
}

/** The trend above the list, with its notes: the bucket, the total (approximate), the sum of groups, the lower bound, `trendError`. */
export const IssuesTrendCard = ({ api, arg, enabled = true, actions, className }: IssuesTrendCardProps) => {
  const { t } = useTranslate();
  const stepLabel = useStepLabel();
  const trendErrorText = useTrendErrorText();
  const query = api.useIssuesTrendQuery(arg, { skip: !enabled });
  const trend: IssuesTrendResponse | undefined = query.currentData ?? query.data;
  const bars = useMemo(() => trendBarsOf(trend?.series), [trend?.series]);
  const error = trend ? trendErrorText(trend.trendError) : null;

  return (
    <Card data-slot="issues-trend-card" className={cn('gap-0 py-0', className)}>
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">{t('Error events')}</h3>
            {trend && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t('%total% events, %step% (approximate)', { replacements: { total: formatUiNumber(trend.total), step: stepLabel(trend.stepSeconds) } })}
                {trend.isFilteredByGroups && (
                  <span data-slot="issues-trend-sum">
                    {' · '}
                    {t('sum of %summed% of %matching% matching groups', {
                      replacements: { summed: trend.summedGroupCount ?? 0, matching: trend.matchingGroupCount ?? 0 },
                    })}
                    {trend.isTruncated ? ` · ${t('a lower bound')}` : ''}
                  </span>
                )}
              </p>
            )}
          </div>
          {actions}
        </div>
        {query.isError && !trend ? (
          <p className="text-sm text-destructive">{normalizeDddError(query.error, t('The trend could not be loaded.')).message}</p>
        ) : !trend ? (
          <Skeleton className="h-[164px] w-full rounded-xl" />
        ) : (
          <>
            <IssuesTrendBars bars={bars} stepSeconds={trend.stepSeconds} label={t('Error events over time')} />
            {error && (
              <p data-slot="issues-trend-error" className="text-xs text-warning">
                {error}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export interface IssuesTrendRangeControlProps {
  /** A preset, or `custom` (the range below). */
  value: IssuesWindowValue;
  onValueChange: (value: IssuesWindowValue) => void;
  /** The custom range's bounds (ISO instants); shown in the viewer's time zone. */
  customFrom?: string | null;
  customTo?: string | null;
  /** A bound of the custom range changed (ISO instants, `''` for a cleared one). */
  onCustomRangeChange: (range: { from: string; to: string }) => void;
  /** The window the trend shows now: the bounds a switch to `custom` starts from. */
  currentWindow?: { from: string; to: string };
  className?: string;
}

/**
 * The window switch with a "Custom" choice: from and to (date and time in the viewer's zone, at most 31 days apart).
 * An unusable range says so; the trend keeps the default window meanwhile.
 */
export const IssuesTrendRangeControl = ({
  value,
  onValueChange,
  customFrom,
  customTo,
  onCustomRangeChange,
  currentWindow,
  className,
}: IssuesTrendRangeControlProps) => {
  const { t } = useTranslate();
  const hours = (count: number) => t('{count, plural, one {# hour} other {# hours}}', { count });
  const days = (count: number) => t('{count, plural, one {# day} other {# days}}', { count });
  const labels: Record<IssuesWindowPreset, string> = { '1h': hours(1), '6h': hours(6), '24h': hours(24), '7d': days(7), '30d': days(30) };
  const isCustom = value === ISSUES_CUSTOM_WINDOW;
  const inputValue = (iso: string | null | undefined) => toDateTimeInputValue(iso ? new Date(iso) : null, 'local');
  const toIso = (input: string) => fromDateTimeInputValue(input, 'local')?.toISOString().replace(/\.\d{3}Z$/, 'Z') ?? '';
  const invalid = isCustom && Boolean(customFrom || customTo) && resolveIssuesCustomRange(customFrom, customTo) === null;
  return (
    <div data-slot="issues-trend-range" className={cn('flex flex-wrap items-center gap-2', className)}>
      <SegmentedControl<IssuesWindowValue>
        aria-label={t('Time window')}
        value={value}
        onValueChange={next => {
          if (next === ISSUES_CUSTOM_WINDOW && !customFrom && !customTo && currentWindow) onCustomRangeChange(currentWindow);
          onValueChange(next);
        }}
        height={32}
        activation="manual"
        translate={false}
        options={[
          ...ISSUES_WINDOW_PRESETS.map(preset => ({ value: preset, label: labels[preset] })),
          { value: ISSUES_CUSTOM_WINDOW, label: t('Custom', { context: 'trend-window' }) },
        ]}
      />
      {isCustom && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('From', { context: 'trend-window' })}</span>
            <Input
              type="datetime-local"
              value={inputValue(customFrom)}
              onChange={event => onCustomRangeChange({ from: toIso(event.target.value), to: customTo ?? '' })}
              aria-invalid={invalid || undefined}
              className="h-8 w-auto text-xs"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{t('To', { context: 'trend-window' })}</span>
            <Input
              type="datetime-local"
              value={inputValue(customTo)}
              onChange={event => onCustomRangeChange({ from: customFrom ?? '', to: toIso(event.target.value) })}
              aria-invalid={invalid || undefined}
              className="h-8 w-auto text-xs"
            />
          </label>
          {invalid && (
            <span role="status" className="text-destructive" data-slot="issues-trend-range-invalid">
              {t('The range must end after it starts and span at most 31 days.')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export interface IssuesWindowSwitchProps {
  value: IssuesWindowPreset;
  onValueChange: (value: IssuesWindowPreset) => void;
  className?: string;
}

/** The trend window: 1 hour to 30 days (the trend endpoint takes at most 31). */
export const IssuesWindowSwitch = ({ value, onValueChange, className }: IssuesWindowSwitchProps) => {
  const { t } = useTranslate();
  const hours = (count: number) => t('{count, plural, one {# hour} other {# hours}}', { count });
  const days = (count: number) => t('{count, plural, one {# day} other {# days}}', { count });
  const labels: Record<IssuesWindowPreset, string> = { '1h': hours(1), '6h': hours(6), '24h': hours(24), '7d': days(7), '30d': days(30) };
  return (
    <SegmentedControl<IssuesWindowPreset>
      className={className}
      aria-label={t('Time window')}
      value={value}
      onValueChange={onValueChange}
      height={32}
      activation="manual"
      translate={false}
      options={ISSUES_WINDOW_PRESETS.map(preset => ({ value: preset, label: labels[preset] }))}
    />
  );
};
