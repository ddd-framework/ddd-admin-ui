'use client';

import { HardDrive } from 'lucide-react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import { type FileAreaUsagePart, formatBytes } from './fileView.ts';

export interface QuotaPillProps {
  usedBytes: number | null | undefined;
  /** `null` / absent: only the usage is shown (no limit). */
  quotaBytes: number | null | undefined;
  isLoading?: boolean;
  /** What the usage counts (tooltip); default: every kept version, uploads being checked and the trash. */
  note?: string | null;
  /** What the usage is made of; shown in the tooltip, one line per part, when given. */
  parts?: readonly FileAreaUsagePart[] | null;
  className?: string;
}

/** Warning from 90 %, danger when full. */
const WARNING_RATIO = 0.9;

/** The area's usage (`1.2 GB of 5 GB`): a pill with a thin meter. */
export const QuotaPill = ({ usedBytes, quotaBytes, isLoading = false, note, parts, className }: QuotaPillProps) => {
  const { t } = useTranslate();
  if (isLoading) return <Skeleton className={cn('h-8 w-44 rounded-full', className)} />;
  if (usedBytes === null || usedBytes === undefined) return null;
  const noteText = note ? t(note) : t('Counts every kept version, uploads being checked and the trash.');
  const title = parts && parts.length > 0 ? [noteText, ...parts.map(part => `${part.label}: ${formatBytes(part.bytes)}`)].join('\n') : noteText;
  if (typeof quotaBytes !== 'number') {
    return (
      <div className={cn('surface-glass inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[13px] whitespace-nowrap', className)} title={title}>
        <HardDrive aria-hidden className="size-4 text-muted-foreground" />
        <span className="font-semibold tabular-nums">{t('%size% used', { replacements: { size: formatBytes(usedBytes) } })}</span>
      </div>
    );
  }
  const ratio = quotaBytes > 0 ? Math.min(usedBytes / quotaBytes, 1) : 1;
  const tone = ratio >= 1 ? 'danger' : ratio >= WARNING_RATIO ? 'warning' : 'normal';
  const percent = Math.round(ratio * 100);

  return (
    <div className={cn('surface-glass inline-flex h-8 items-center gap-2.5 rounded-full px-3.5 text-[13px] whitespace-nowrap', className)} title={title}>
      <HardDrive
        aria-hidden
        className={cn('size-4', tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : 'text-muted-foreground')}
      />
      <span className="font-semibold tabular-nums">
        {t('%used% of %quota%', { replacements: { used: formatBytes(usedBytes), quota: formatBytes(quotaBytes) } })}
      </span>
      <span className="sr-only">({t('%percent% % used', { replacements: { percent } })})</span>
      <span aria-hidden className="relative h-1.5 w-16 overflow-hidden rounded-full bg-tint-strong">
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 motion-reduce:transition-none',
            tone === 'danger' ? 'bg-destructive' : tone === 'warning' ? 'bg-warning' : 'bg-brand'
          )}
          style={{ width: `${Math.max(percent, usedBytes > 0 ? 3 : 0)}%` }}
        />
      </span>
    </div>
  );
};
