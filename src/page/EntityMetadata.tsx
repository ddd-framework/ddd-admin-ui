'use client';

import { type ChangeHistory, parseDddDateTime } from '@mgamadeus/ddd-web/contract';
import { Check, Copy, History, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { formatDateTime, formatRelativeTime } from '../logic/pure/format.ts';
import { useCopyToClipboard } from '../logic/react/useCopyToClipboard.ts';

export interface EntityMetadataProps {
  /** The entity id; nothing renders while it is unset (create screens before the first save). */
  id: number | string | null | undefined;
  /** The entity's `changeHistory` (DDD `ChangeHistory` trait: `createdTime` / `modifiedTime`, UTC). */
  changeHistory?: ChangeHistory | null;
  /**
   * `strip` (default): three frosted pills in a row. `stacked`: a compact right-aligned three-line block for the page
   * header corner (detail shells) — no extra row on the page. `inline`: one compact muted line
   * (`ID 12 · Created … · Updated …`) under a drawer's title (`FormDrawer metadata`).
   */
  variant?: 'strip' | 'stacked' | 'inline';
  className?: string;
}

const MetaItem = ({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) => (
  <div className="surface flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm">
    <span className="text-muted-foreground" aria-hidden>
      {icon}
    </span>
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="min-w-0 truncate font-medium text-foreground">{children}</span>
  </div>
);

const TimeValue = ({ value }: { value: string | null | undefined }) => {
  const date = parseDddDateTime(value);
  if (!date) return <EmptyValue />;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={date.toISOString()} className="cursor-default">
          {formatDateTime(value)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatRelativeTime(date)}</TooltipContent>
    </Tooltip>
  );
};

/**
 * The standard metadata strip of every entity detail / edit screen: ID (copyable), Created and Updated in the viewer's
 * time zone (the `formatDateTime` format every date column uses), the relative time on hover. One look everywhere;
 * `EntityDetailShell` places it under the header.
 */
export const EntityMetadata = ({ id, changeHistory, variant = 'strip', className }: EntityMetadataProps) => {
  const { t } = useTranslate();
  const { copy, copied } = useCopyToClipboard();
  if (id === null || id === undefined || id === '') return null;

  if (variant === 'inline') {
    const label = 'text-[0.6875rem] font-medium uppercase tracking-wider';
    return (
      <dl
        className={cn(
          'flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs leading-5 text-muted-foreground',
          className
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <dt className={label}>{t('ID', { context: 'entity-id' })}</dt>
          <dd>
            <button
              type="button"
              onClick={() => void copy(String(id))}
              className="inline-flex items-center gap-1 font-mono font-medium tabular-nums text-foreground hover:text-brand-emphasis"
              aria-label={t('Copy ID %id%', { replacements: { id } })}
            >
              {id}
              {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
            </button>
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className={label}>{t('Created', { context: 'entity-metadata' })}</dt>
          <dd className="text-foreground">
            <TimeValue value={changeHistory?.createdTime} />
          </dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className={label}>{t('Updated', { context: 'entity-metadata' })}</dt>
          <dd className="text-foreground">
            <TimeValue value={changeHistory?.modifiedTime} />
          </dd>
        </div>
      </dl>
    );
  }

  if (variant === 'stacked') {
    const row = 'flex items-baseline justify-end gap-3 whitespace-nowrap';
    const label = 'text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground';
    return (
      <dl className={cn('grid gap-2 text-[0.8125rem] leading-5', className)}>
        <div className={row}>
          <dt className={label}>{t('ID', { context: 'entity-id' })}</dt>
          <dd>
            <button
              type="button"
              onClick={() => void copy(String(id))}
              className="inline-flex items-center gap-1.5 font-mono font-medium tabular-nums text-foreground hover:text-brand-emphasis"
              aria-label={t('Copy ID %id%', { replacements: { id } })}
            >
              {id}
              {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 text-muted-foreground" />}
            </button>
          </dd>
        </div>
        <div className={row}>
          <dt className={label}>{t('Created', { context: 'entity-metadata' })}</dt>
          <dd className="font-medium text-foreground">
            <TimeValue value={changeHistory?.createdTime} />
          </dd>
        </div>
        <div className={row}>
          <dt className={label}>{t('Updated', { context: 'entity-metadata' })}</dt>
          <dd className="font-medium text-foreground">
            <TimeValue value={changeHistory?.modifiedTime} />
          </dd>
        </div>
      </dl>
    );
  }

  return (
    <div className={cn('mb-6 flex flex-wrap items-center gap-2', className)}>
      <MetaItem icon={<span className="font-mono text-xs">#</span>} label={t('ID', { context: 'entity-id' })}>
        <button
          type="button"
          onClick={() => void copy(String(id))}
          className="inline-flex items-center gap-1.5 font-mono tabular-nums hover:text-brand-emphasis"
          aria-label={t('Copy ID %id%', { replacements: { id } })}
        >
          {id}
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5 text-muted-foreground" />}
        </button>
      </MetaItem>
      <MetaItem icon={<Plus className="size-3.5" />} label={t('Created', { context: 'entity-metadata' })}>
        <TimeValue value={changeHistory?.createdTime} />
      </MetaItem>
      <MetaItem icon={<History className="size-3.5" />} label={t('Updated', { context: 'entity-metadata' })}>
        <TimeValue value={changeHistory?.modifiedTime} />
      </MetaItem>
    </div>
  );
};
