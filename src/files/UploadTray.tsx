'use client';

import { Ban, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Loader2, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import { formatBytes } from './fileView.ts';
import type { FileUploadQueue, UploadItem } from './useFileUploadQueue.ts';

export interface UploadTrayProps {
  queue: FileUploadQueue;
  /** Uploads are checked for malware after the upload (the done line says "being checked"). Default `true`. */
  scansUploads?: boolean;
  className?: string;
}

const percentOf = (item: UploadItem): number =>
  item.status === 'done' ? 100 : item.file.size > 0 ? Math.round((item.loaded / item.file.size) * 100) : 0;

const StatusLine = ({ item, scansUploads }: { item: UploadItem; scansUploads: boolean }) => {
  const { t } = useTranslate();
  switch (item.status) {
    case 'queued':
      return <span className="text-muted-foreground">{t('Waiting · %size%', { replacements: { size: formatBytes(item.file.size) } })}</span>;
    case 'uploading':
      return (
        <span className="text-muted-foreground tabular-nums">
          {t('%percent% % · %loaded% of %total%', {
            replacements: { percent: percentOf(item), loaded: formatBytes(item.loaded), total: formatBytes(item.file.size) },
          })}
        </span>
      );
    case 'done':
      return scansUploads ? (
        <span className="text-muted-foreground">
          {t('Uploaded to %target% ·', { replacements: { target: item.target.label } })}{' '}
          <span className="text-warning">{t('being checked', { context: 'upload-status' })}</span>
        </span>
      ) : (
        <span className="text-muted-foreground">{t('Uploaded to %target%', { replacements: { target: item.target.label } })}</span>
      );
    case 'cancelled':
      return <span className="text-muted-foreground">{t('Cancelled', { context: 'upload-status' })}</span>;
    case 'refused':
    case 'failed':
      return <span className="text-destructive">{item.error ?? t('Upload failed')}</span>;
  }
};

const StatusIcon = ({ item }: { item: UploadItem }) => {
  switch (item.status) {
    case 'uploading':
      return <Loader2 aria-hidden className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" />;
    case 'done':
      return <CheckCircle2 aria-hidden className="size-4 text-success" />;
    case 'refused':
    case 'failed':
      return <CircleAlert aria-hidden className="size-4 text-destructive" />;
    case 'cancelled':
      return <Ban aria-hidden className="size-4 text-muted-foreground" />;
    case 'queued':
      return null;
  }
};

const TrayRow = ({ item, queue, scansUploads }: { item: UploadItem; queue: FileUploadQueue; scansUploads: boolean }) => {
  const { t } = useTranslate();
  const running = item.status === 'queued' || item.status === 'uploading';
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <FileFamilyIcon family={item.family} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] font-semibold" title={item.file.name}>
            {item.file.name}
          </p>
          <StatusIcon item={item} />
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs">
          <StatusLine item={item} scansUploads={scansUploads} />
        </p>
        {item.status === 'uploading' && (
          <div
            role="progressbar"
            aria-label={t('Uploading %name%', { replacements: { name: item.file.name } })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentOf(item)}
            className="mt-1.5 h-1 overflow-hidden rounded-full bg-tint-strong"
          >
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-150 motion-reduce:transition-none"
              style={{ width: `${percentOf(item)}%` }}
            />
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center">
        {(item.status === 'failed' || item.status === 'cancelled') && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Retry %name%', { replacements: { name: item.file.name } })} onClick={() => queue.retry(item.id)}>
            <RotateCcw />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={
            running
              ? t('Cancel %name%', { replacements: { name: item.file.name } })
              : t('Remove %name% from the list', { replacements: { name: item.file.name } })
          }
          onClick={() => (running ? queue.cancel(item.id) : queue.dismiss(item.id))}
        >
          <X />
        </Button>
      </div>
    </li>
  );
};

/**
 * The upload tray: a glass panel at the bottom right with one row per file — name, progress, cancel,
 * the error. Collapsible; closing it is possible once nothing runs. The summary line is `aria-live`, so screen readers
 * hear progress without the per-file noise.
 */
export const UploadTray = ({ queue, scansUploads = true, className }: UploadTrayProps) => {
  const { t } = useTranslate();
  const [collapsed, setCollapsed] = useState(false);
  const { items, activeCount } = queue;
  if (items.length === 0) return null;

  const done = items.filter(item => item.status === 'done').length;
  const problems = items.filter(item => item.status === 'failed' || item.status === 'refused').length;
  // "Uploading 3 of 5": refused and cancelled files never started, so they do not count.
  const started = items.filter(item => item.status !== 'refused' && item.status !== 'cancelled').length;
  const finished = started - activeCount;
  const summary =
    activeCount > 0
      ? t('Uploading · %finished% of %started% done', { replacements: { finished, started } })
      : problems > 0
        ? t('%done% uploaded · %problems% not uploaded', { replacements: { done, problems } })
        : t('{count, plural, one {# file uploaded} other {# files uploaded}}', { count: done });

  return (
    <section
      aria-label={t('Uploads')}
      className={cn(
        'glass-bar fixed right-4 bottom-4 z-(--layer-sticky) flex max-h-[min(60dvh,28rem)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-[var(--glass-shadow)]',
        className
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2.5">
        {activeCount > 0 ? (
          <Loader2 aria-hidden className="size-4 animate-spin text-brand-emphasis motion-reduce:animate-none" />
        ) : problems > 0 ? (
          <CircleAlert aria-hidden className="size-4 text-destructive" />
        ) : (
          <CheckCircle2 aria-hidden className="size-4 text-success" />
        )}
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold" aria-live="polite">
          {summary}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={collapsed ? t('Show uploads') : t('Hide upload list')}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(value => !value)}
        >
          {collapsed ? <ChevronUp /> : <ChevronDown />}
        </Button>
        {activeCount === 0 && (
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Close uploads')} onClick={queue.clearFinished}>
            <X />
          </Button>
        )}
      </header>
      {!collapsed && (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
          {items.map(item => (
            <TrayRow key={item.id} item={item} queue={queue} scansUploads={scansUploads} />
          ))}
        </ul>
      )}
    </section>
  );
};
