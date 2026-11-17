'use client';

import { LineChart } from 'lucide-react';
import { type PointerEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import { type ChartRow, formatBucketRange, formatBucketTick, formatCount } from './format.ts';

/**
 * The workers charts, drawn as SVG without a chart library (no optional peer, server-rendered at a default width and
 * measured in the browser). One time chart for every form (stacked step areas, lines, bars, combined), one sparkline.
 * Colours are colour roles of the host contract (`var(--primary)`, `var(--destructive)`); axes, grid and tooltip use the
 * text, border and popover roles. A `null` value is a gap, never a 0.
 */

export interface ChartLegendItem {
  key: string;
  label: string;
  color: string;
  /** `line` draws a short stroke (dashed when `dashed`), otherwise a square swatch. */
  shape?: 'swatch' | 'line';
  dashed?: boolean;
}

/** The legend of a chart: colour mark and label, wrapping. */
export const ChartLegend = ({ items, className }: { items: readonly ChartLegendItem[]; className?: string }) => (
  <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
    {items.map(item => (
      <li key={item.key} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
        {item.shape === 'line' ? (
          <span
            aria-hidden
            className="h-0 w-3.5 shrink-0 border-t-2"
            style={{ borderColor: item.color, borderStyle: item.dashed ? 'dashed' : 'solid' }}
          />
        ) : (
          <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: item.color }} />
        )}
        <span className="truncate">{item.label}</span>
      </li>
    ))}
  </ul>
);

export interface WorkerChartCardProps {
  title: string;
  description?: ReactNode;
  /** Shown for two or more items. */
  legend?: readonly ChartLegendItem[];
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A chart in a card: section-label title, muted description, legend, then the plot. */
export const WorkerChartCard = ({ title, description, legend, actions, children, className }: WorkerChartCardProps) => (
  <Card className={cn('gap-0 py-0', className)}>
    <CardContent className="space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {legend && legend.length > 1 && <ChartLegend items={legend} />}
      {children}
    </CardContent>
  </Card>
);

export interface ChartBodyProps {
  height: number;
  isLoading?: boolean;
  /** No point to draw: the empty message instead of a flat chart. */
  isEmpty?: boolean;
  emptyMessage?: string;
  /** A background refetch: the chart dims a little. */
  isRefreshing?: boolean;
  children: ReactNode;
}

/** A fixed-height slot for a chart: skeleton while loading, an empty state, the chart otherwise. */
export const ChartBody = ({ height, isLoading = false, isEmpty = false, emptyMessage, isRefreshing = false, children }: ChartBodyProps) => {
  const { t } = useTranslate();
  return (
    <div style={{ height }} className={cn('transition-opacity', isRefreshing ? 'opacity-70' : 'opacity-100')}>
      {isLoading ? (
        <Skeleton className="size-full rounded-xl" />
      ) : isEmpty ? (
        <div className="flex size-full flex-col items-center justify-center gap-2 rounded-xl bg-tint text-center">
          <LineChart className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">{emptyMessage ?? t('Nothing in this window')}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export interface WorkerChartSeries {
  key: string;
  label: string;
  /** A colour role: `var(--primary)`, `var(--destructive)`. */
  color: string;
  kind: 'area' | 'line' | 'bar';
  /** Series with the same id stack (in the order given, the first at the bottom). */
  stackId?: string;
  /** `step` for counts that hold until the next sample (processes, queue), `linear` for rates (default). */
  curve?: 'step' | 'linear';
  dashed?: boolean;
}

export interface WorkerChartReferenceLine {
  y: number;
  label: string;
}

export interface WorkerTimeChartProps {
  rows: readonly ChartRow[];
  series: readonly WorkerChartSeries[];
  windowMs: number;
  stepSeconds: number;
  height: number;
  /** Axis tick text of the values (default: counts). */
  formatTick?: (value: number) => string;
  /** Tooltip value text (default: counts). */
  formatValue?: (value: number) => string;
  /** Logarithmic value axis, for maxima that dwarf the averages (a value ≤ 0 is a gap there). */
  logScale?: boolean;
  /** Dashed horizontal lines (a configured minimum and maximum). */
  referenceLines?: readonly WorkerChartReferenceLine[];
  /** Adds a "Total" line to the tooltip (stacked charts). */
  showTotal?: boolean;
  /** Accessible description of the chart. */
  ariaLabel: string;
}

const MARGIN = { top: 8, right: 12, bottom: 22, left: 44 };
const DEFAULT_WIDTH = 640;

/** The width of an element, measured in the browser (`fallback` on the server and before the first measurement). */
const useMeasuredWidth = (fallback: number) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const next = Math.round(element.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
};

/** Round ticks from 0 to at least `maximum` (about four steps). */
export const niceTicks = (maximum: number, count = 4): number[] => {
  if (!(maximum > 0)) return [0, 1];
  const raw = maximum / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].map(factor => factor * magnitude).find(candidate => candidate >= raw) ?? raw);
  const ticks: number[] = [];
  for (let tick = 0; tick < maximum + step * 0.999; tick += step) ticks.push(Number(tick.toFixed(10)));
  if ((ticks[ticks.length - 1] ?? 0) < maximum) ticks.push(Number((ticks.length * step).toFixed(10)));
  return ticks;
};

/** Decade ticks of a logarithmic axis between `floor` and `maximum`. */
const logTicks = (floor: number, maximum: number): number[] => {
  const ticks: number[] = [];
  for (let tick = 10 ** Math.floor(Math.log10(floor)); tick <= maximum * 10; tick *= 10) {
    ticks.push(tick);
    if (tick >= maximum) break;
  }
  return ticks;
};

interface PlotPoint {
  x: number;
  y: number;
}

/**
 * A path through segments of points (a `null` breaks the line); `step` holds a value until the next point. `reversed`:
 * the points run backwards along a step line (the lower edge of an area), so the vertical comes first.
 */
const linePath = (points: readonly (PlotPoint | null)[], step: boolean, reversed = false): string => {
  let path = '';
  let previous: PlotPoint | null = null;
  for (const point of points) {
    if (!point) {
      previous = null;
      continue;
    }
    if (!previous) path += `M${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    else if (step && reversed) path += `V${point.y.toFixed(1)}H${point.x.toFixed(1)}`;
    else if (step) path += `H${point.x.toFixed(1)}V${point.y.toFixed(1)}`;
    else path += `L${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    previous = point;
  }
  return path;
};

/** Closed areas between an upper and a lower edge, one per run of points without a gap. */
const areaPaths = (upper: readonly (PlotPoint | null)[], lower: readonly (PlotPoint | null)[], step: boolean): string[] => {
  const paths: string[] = [];
  let run: number[] = [];
  const flush = () => {
    if (run.length > 0) {
      const top = run.map(index => upper[index] as PlotPoint);
      const bottom = run.map(index => lower[index] as PlotPoint).reverse();
      const topPath = linePath(top, step);
      const bottomPath = linePath(bottom, step, true).replace(/^M/, 'L');
      paths.push(`${topPath}${bottomPath}Z`);
    }
    run = [];
  };
  upper.forEach((point, index) => {
    if (point && lower[index]) run.push(index);
    else flush();
  });
  flush();
  return paths;
};

/** A time chart of one window: every series in its own form, on one value axis. */
export const WorkerTimeChart = ({
  rows,
  series,
  windowMs,
  stepSeconds,
  height,
  formatTick = formatCount,
  formatValue = formatCount,
  logScale = false,
  referenceLines = [],
  showTotal = false,
  ariaLabel,
}: WorkerTimeChartProps) => {
  const { t } = useTranslate();
  const gradientPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { ref, width } = useMeasuredWidth(DEFAULT_WIDTH);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plot = useMemo(() => {
    const stepMs = stepSeconds * 1000;
    const innerWidth = Math.max(width - MARGIN.left - MARGIN.right, 10);
    const innerHeight = Math.max(height - MARGIN.top - MARGIN.bottom, 10);
    const startMs = rows[0]?.ms ?? 0;
    const endMs = (rows[rows.length - 1]?.ms ?? startMs) + stepMs;
    const span = Math.max(endMs - startMs, stepMs);
    const xOf = (ms: number) => MARGIN.left + ((ms - startMs) / span) * innerWidth;
    const slot = (stepMs / span) * innerWidth;

    // stacked offsets per stack id, in series order (the first at the bottom)
    const stackBase = new Map<string, number[]>();
    const lowerByKey = new Map<string, (number | null)[]>();
    const upperByKey = new Map<string, (number | null)[]>();
    for (const item of series) {
      const values = rows.map(row => {
        const value = row[item.key];
        return value === null || value === undefined || (logScale && value <= 0) ? null : value;
      });
      if (item.stackId) {
        const base = stackBase.get(item.stackId) ?? rows.map(() => 0);
        lowerByKey.set(item.key, values.map((value, index) => (value === null ? null : (base[index] ?? 0))));
        upperByKey.set(item.key, values.map((value, index) => (value === null ? null : (base[index] ?? 0) + value)));
        stackBase.set(item.stackId, base.map((offset, index) => offset + (values[index] ?? 0)));
      } else {
        lowerByKey.set(item.key, values.map(value => (value === null ? null : 0)));
        upperByKey.set(item.key, values);
      }
    }
    let maximum = 0;
    let floor = Number.POSITIVE_INFINITY;
    for (const values of upperByKey.values()) {
      for (const value of values) {
        if (value === null) continue;
        maximum = Math.max(maximum, value);
        if (value > 0) floor = Math.min(floor, value);
      }
    }
    for (const line of referenceLines) maximum = Math.max(maximum, line.y);
    const ticks = logScale ? logTicks(Number.isFinite(floor) ? floor : 1, Math.max(maximum, 1)) : niceTicks(maximum);
    const top = ticks[ticks.length - 1] ?? 1;
    const bottom = logScale ? (ticks[0] ?? 1) : 0;
    const yOf = (value: number) => {
      const ratio = logScale
        ? (Math.log10(Math.max(value, bottom)) - Math.log10(bottom)) / Math.max(Math.log10(top) - Math.log10(bottom), 1e-9)
        : (value - bottom) / Math.max(top - bottom, 1e-9);
      return MARGIN.top + innerHeight - Math.min(Math.max(ratio, 0), 1) * innerHeight;
    };
    const centre = (index: number) => xOf((rows[index]?.ms ?? 0) + stepMs / 2);
    const barSeries = series.filter(item => item.kind === 'bar');
    const barGroups = [...new Set(barSeries.map(item => item.stackId ?? item.key))];
    const barWidth = Math.max(Math.min((slot * 0.82) / Math.max(barGroups.length, 1), 28), 1);
    const timeTickCount = Math.max(Math.floor(innerWidth / 90), 2);
    const timeTicks = rows.length === 0 ? [] : Array.from({ length: timeTickCount + 1 }, (_, index) => startMs + (span * index) / timeTickCount);
    return { innerHeight, xOf, yOf, centre, ticks, barGroups, barWidth, slot, timeTicks, lowerByKey, upperByKey, stepMs };
  }, [rows, series, width, height, stepSeconds, logScale, referenceLines]);

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (rows.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    rows.forEach((_, index) => {
      const delta = Math.abs(plot.centre(index) - x);
      if (delta < distance) {
        distance = delta;
        nearest = index;
      }
    });
    setHoverIndex(nearest);
  };

  const hovered = hoverIndex !== null ? rows[hoverIndex] : undefined;
  const tooltipEntries = hovered
    ? [...series].reverse().map(item => ({ item, value: hovered[item.key] ?? null }))
    : [];
  const tooltipTotal = tooltipEntries.reduce((sum, entry) => sum + (entry.value ?? 0), 0);
  const hoverX = hoverIndex !== null ? plot.centre(hoverIndex) : 0;

  return (
    <div ref={ref} className="relative w-full overflow-hidden" data-slot="worker-time-chart">
      <svg
        role="img"
        aria-label={ariaLabel}
        width={width}
        height={height}
        className="block touch-pan-y select-none"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          {series
            .filter(item => item.kind === 'area' && !item.stackId)
            .map(item => (
              <linearGradient key={item.key} id={`${gradientPrefix}-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={item.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={item.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
        </defs>
        {plot.ticks.map(tick => (
          <g key={`y-${tick}`}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={plot.yOf(tick)} y2={plot.yOf(tick)} stroke="var(--border)" strokeWidth={1} />
            <text x={MARGIN.left - 6} y={plot.yOf(tick)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {formatTick(tick)}
            </text>
          </g>
        ))}
        {plot.timeTicks.map((ms, index) => (
          <text
            key={`x-${ms}`}
            x={plot.xOf(ms)}
            y={height - 6}
            fontSize={11}
            fill="var(--muted-foreground)"
            textAnchor={index === 0 ? 'start' : index === plot.timeTicks.length - 1 ? 'end' : 'middle'}
          >
            {formatBucketTick(ms, windowMs)}
          </text>
        ))}
        {hoverIndex !== null && (
          <rect
            x={plot.centre(hoverIndex) - plot.slot / 2}
            y={MARGIN.top}
            width={Math.max(plot.slot, 1)}
            height={plot.innerHeight}
            fill="var(--tint)"
          />
        )}
        {series.map(item => {
          const upper = plot.upperByKey.get(item.key) ?? [];
          const lower = plot.lowerByKey.get(item.key) ?? [];
          if (item.kind === 'bar') {
            const group = plot.barGroups.indexOf(item.stackId ?? item.key);
            const offset = (group - (plot.barGroups.length - 1) / 2) * plot.barWidth;
            return (
              <g key={item.key} fill={item.color}>
                {upper.map((value, index) => {
                  const base = lower[index];
                  if (value === null || value === undefined || base === null || base === undefined || value <= base) return null;
                  const yTop = plot.yOf(value);
                  const yBottom = plot.yOf(base);
                  return (
                    <rect
                      // biome-ignore lint/suspicious/noArrayIndexKey: one bar per step, the step index is its identity
                      key={index}
                      x={plot.centre(index) + offset - plot.barWidth / 2}
                      y={yTop}
                      width={plot.barWidth}
                      height={Math.max(yBottom - yTop, 1)}
                      stroke="var(--card)"
                      strokeWidth={item.stackId ? 0.5 : 0}
                    />
                  );
                })}
              </g>
            );
          }
          const upperPoints = upper.map((value, index) => (value === null ? null : { x: plot.centre(index), y: plot.yOf(value) }));
          const step = item.curve === 'step';
          if (item.kind === 'area') {
            const lowerPoints = lower.map((value, index) => (value === null ? null : { x: plot.centre(index), y: plot.yOf(value) }));
            const stacked = Boolean(item.stackId);
            return (
              <g key={item.key}>
                {areaPaths(upperPoints, lowerPoints, step).map(path => (
                  <path
                    key={path}
                    d={path}
                    fill={stacked ? item.color : `url(#${gradientPrefix}-${item.key})`}
                    fillOpacity={stacked ? 0.9 : 1}
                  />
                ))}
                <path d={linePath(upperPoints, step)} fill="none" stroke={stacked ? 'var(--card)' : item.color} strokeWidth={stacked ? 1 : 2} />
              </g>
            );
          }
          return (
            <g key={item.key}>
              <path
                d={linePath(upperPoints, step)}
                fill="none"
                stroke={item.color}
                strokeWidth={2}
                strokeDasharray={item.dashed ? '5 4' : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {upperPoints.map((point, index) =>
                point && !upperPoints[index - 1] && !upperPoints[index + 1] ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: an isolated point of one step
                  <circle key={index} cx={point.x} cy={point.y} r={3} fill={item.color} stroke="var(--card)" strokeWidth={1.5} />
                ) : null
              )}
            </g>
          );
        })}
        {referenceLines.map(line => (
          <g key={line.label}>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={plot.yOf(line.y)}
              y2={plot.yOf(line.y)}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
            <text x={width - MARGIN.right} y={plot.yOf(line.y) - 4} textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {line.label}
            </text>
          </g>
        ))}
        {hoverIndex !== null && (
          <line x1={hoverX} x2={hoverX} y1={MARGIN.top} y2={MARGIN.top + plot.innerHeight} stroke="var(--muted-foreground)" strokeWidth={1} />
        )}
      </svg>
      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-(--layer-raised) min-w-44 rounded-xl bg-popover px-3 py-2 text-popover-foreground shadow-[var(--surface-shadow-raised)] ring-1 ring-foreground/5"
          style={hoverX > width / 2 ? { right: width - hoverX + 8 } : { left: hoverX + 8 }}
        >
          <p className="mb-1.5 text-xs text-muted-foreground">{formatBucketRange(hovered.ms, stepSeconds)}</p>
          <ul className="space-y-1">
            {tooltipEntries.map(({ item, value }) => (
              <li key={item.key} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden
                  className={item.kind === 'line' ? 'h-0.5 w-3 rounded-full' : 'size-2.5 rounded-[3px]'}
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="font-semibold tabular-nums">{value === null ? t('No data') : formatValue(value)}</span>
              </li>
            ))}
          </ul>
          {showTotal && (
            <p className="mt-1.5 flex justify-between border-t pt-1.5 text-xs">
              <span className="text-muted-foreground">{t('Total', { context: 'chart-tooltip' })}</span>
              <span className="font-semibold tabular-nums">{formatValue(tooltipTotal)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export interface WorkerSparklineProps {
  rows: readonly ChartRow[];
  valueKey: string;
  color: string;
  /** Accessible description (`handled in the last hour`). */
  label: string;
  height?: number;
}

/** The last hour of one value in a tile or a table row: a thin line over a soft wash, no axes; gaps stay gaps. */
export const WorkerSparkline = ({ rows, valueKey, color, label, height = 36 }: WorkerSparklineProps) => {
  const gradientId = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-spark`;
  const values = rows.map(row => row[valueKey] ?? null);
  const maximum = Math.max(1, ...values.map(value => value ?? 0));
  const count = Math.max(values.length - 1, 1);
  const points = values.map((value, index) =>
    value === null ? null : { x: (index / count) * 100, y: height - 1 - (value / maximum) * (height - 4) }
  );
  const baseline = points.map(point => (point ? { x: point.x, y: height - 1 } : null));
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} className="block">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {areaPaths(points, baseline, false).map(path => (
        <path key={path} d={path} fill={`url(#${gradientId})`} />
      ))}
      <path d={linePath(points, false)} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
