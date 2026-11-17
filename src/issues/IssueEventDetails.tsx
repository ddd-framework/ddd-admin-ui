'use client';

import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatUiNumber } from '../i18n/format.ts';
import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { DateCell } from '../list/cells.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { DefinitionList, type DefinitionItem } from '../page/DefinitionList.tsx';
import { cn } from '../primitives/cn.ts';
import {
  causeFrameViewsOf,
  codeContextRows,
  type IssueFrameView,
  issueFrameViewsOf,
  segmentIssueFrames,
} from './format.ts';
import type { IssueEventBreadcrumb, IssueEventCause, IssueEventDetail, IssueEventKeyValue, IssueEventWorkerContext } from './types.ts';

/**
 * One occurrence of an error group as the drawer shows it, top to bottom, each block only when its data is there:
 * the stack (application frames open with their code context, framework frames folded per run, client frames at their
 * original position when a source map resolved them, the raw stack trace as fallback), the causes, the request, the
 * console command, the failed job, the client and its breadcrumbs, the meta data.
 */

/** A titled block of the drawer. */
export const IssueDetailBlock = ({ title, children, className }: { title: string; children: ReactNode; className?: string }) => (
  <section className={cn('min-w-0 space-y-2', className)}>
    <h4 className="text-xs font-bold tracking-[0.08em] text-muted-foreground uppercase">{title}</h4>
    {children}
  </section>
);

/** Source lines around a frame, numbered, the frame's own line marked (`data-current`). */
export const IssueCodeContext = ({ frame }: { frame: IssueFrameView }) => {
  const rows = codeContextRows(frame.contextLines, frame.contextStartLine, frame.highlightLine);
  if (rows.length === 0) return null;
  return (
    <pre data-slot="issue-code-context" className="mt-1 overflow-x-auto rounded-md border bg-background py-1 font-mono text-xs text-muted-foreground">
      {rows.map((row, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: source lines are positional
          key={index}
          data-current={row.current ? '' : undefined}
          className={cn('flex w-max min-w-full gap-3 px-2', row.current && 'bg-destructive/10 font-semibold text-foreground')}
        >
          <span className="w-8 shrink-0 text-right tabular-nums select-none">{row.number ?? ''}</span>
          <span className="whitespace-pre">{row.text}</span>
        </div>
      ))}
    </pre>
  );
};

const FrameLine = ({ frame, muted }: { frame: IssueFrameView; muted?: boolean }) => {
  const { t } = useTranslate();
  return (
    <div className={cn('min-w-0 break-all', muted && 'text-muted-foreground')}>
      {frame.functionName && <div className={cn(!muted && 'font-semibold')}>{frame.functionName}</div>}
      <div className="text-muted-foreground">{frame.location}</div>
      {frame.minifiedLocation && (
        <div className="text-[11px] text-muted-foreground">{t('minified: %location%', { replacements: { location: frame.minifiedLocation } })}</div>
      )}
    </div>
  );
};

/** A stack, innermost frame first: application frames open, each run of framework frames folded to "+N framework frames". */
export const IssueFrameList = ({ frames }: { frames: readonly IssueFrameView[] }) => {
  const { t } = useTranslate();
  if (frames.length === 0) return null;
  return (
    <ol data-slot="issue-frames" className="max-h-[32rem] space-y-1.5 overflow-auto rounded-md bg-muted/30 p-2 font-mono text-xs">
      {segmentIssueFrames(frames).map(segment =>
        segment.kind === 'app' ? (
          <li key={segment.index} data-frame="app">
            <FrameLine frame={segment.frame} />
            <IssueCodeContext frame={segment.frame} />
          </li>
        ) : (
          <li key={segment.index} data-frame="framework">
            <details className="group/frames">
              <summary className="flex cursor-pointer list-none items-center gap-1 font-sans text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight className="size-3.5 shrink-0 transition-transform group-open/frames:rotate-90" aria-hidden />
                {t('{count, plural, one {+# framework frame} other {+# framework frames}}', { count: segment.frames.length })}
              </summary>
              <div className="mt-1 space-y-1 border-l pl-3">
                {segment.frames.map((frame, offset) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: frames are positional; one position may repeat
                  <FrameLine key={offset} frame={frame} muted />
                ))}
              </div>
            </details>
          </li>
        )
      )}
    </ol>
  );
};

/** A folded raw text (a stack trace). */
const RawText = ({ summary, text }: { summary: string; text: string }) => (
  <details className="group/raw">
    <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
      <ChevronRight className="size-3.5 shrink-0 transition-transform group-open/raw:rotate-90" aria-hidden />
      {summary}
    </summary>
    <pre className="mt-1 max-h-80 overflow-auto rounded-md bg-muted/30 p-2 font-mono text-xs whitespace-pre">{text}</pre>
  </details>
);

const KeyValues = ({ entries }: { entries: readonly IssueEventKeyValue[] }) => (
  <ul className="space-y-0.5 font-mono text-xs">
    {entries.map((entry, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: keys may repeat
      <li key={index} className="break-all">
        <span className="text-muted-foreground">{entry.key}</span> = {entry.value ?? '—'}
      </li>
    ))}
  </ul>
);

/** The causes, outermost first: often the real error (a runtime error hiding a JSON or database error). */
export const IssueCauses = ({ causes }: { causes: readonly IssueEventCause[] }) => {
  const { t } = useTranslate();
  if (causes.length === 0) return null;
  return (
    <IssueDetailBlock title={t('Caused by')}>
      <ol data-slot="issue-causes" className="space-y-3">
        {causes.map((cause, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: causes are positional
          <li key={index} className="min-w-0 space-y-1 rounded-lg border p-3">
            <div className="text-sm font-semibold break-words">{cause.type ?? t('Unknown error')}</div>
            {cause.message && <p className="text-sm break-words text-muted-foreground">{cause.message}</p>}
            {cause.file && <p className="font-mono text-xs break-all text-muted-foreground">{cause.file}</p>}
            <IssueFrameList frames={causeFrameViewsOf(cause.frames?.elements)} />
          </li>
        ))}
      </ol>
    </IssueDetailBlock>
  );
};

/** The failed message: class, handler, keys, the attempt and what happens next, where it was dispatched. */
export const IssueWorkerContext = ({ worker }: { worker: IssueEventWorkerContext }) => {
  const { t } = useTranslate();
  const keys = worker.messageKeys?.elements ?? [];
  const delivery =
    worker.final === true
      ? t('Dropped: it is not tried again (or waits in the failure transport).')
      : worker.final === false
        ? t('It will be tried again.')
        : null;
  const origin = worker.origin;
  const items: DefinitionItem[] = [
    { id: 'messageClass', label: m('Message'), value: worker.messageClass && <span className="font-mono text-xs break-all">{worker.messageClass}</span> },
    { id: 'handler', label: m('Handler'), value: worker.handler && <span className="font-mono text-xs break-all">{worker.handler}</span> },
    {
      id: 'attempt',
      label: m('Attempt'),
      value: worker.attempt === null || worker.attempt === undefined ? null : formatUiNumber(worker.attempt),
      hint: delivery,
    },
    { id: 'retryCount', label: m('Retries'), value: worker.retryCount === null || worker.retryCount === undefined ? null : formatUiNumber(worker.retryCount) },
    { id: 'transports', label: m('Transports'), value: (worker.transports ?? []).join(', ') },
    {
      id: 'age',
      label: m('Age'),
      value: worker.ageSeconds === null || worker.ageSeconds === undefined ? null : t('%seconds% s after dispatch', { replacements: { seconds: worker.ageSeconds } }),
    },
    { id: 'origin', label: m('Dispatched by'), value: origin?.route ?? origin?.command },
    { id: 'originAccount', label: m('Account'), value: origin?.accountId === null || origin?.accountId === undefined ? null : String(origin.accountId) },
    { id: 'originWorkspace', label: m('Workspace'), value: origin?.workspace },
    { id: 'dispatchedAt', label: m('Dispatched'), value: origin?.dispatchedAt ? <DateCell value={origin.dispatchedAt} /> : null },
  ];
  return (
    <IssueDetailBlock title={t('Job')}>
      <div data-slot="issue-worker" className="space-y-2">
        <DefinitionList layout="rows" items={items.filter(item => item.value !== null && item.value !== undefined && item.value !== '')} />
        {keys.length > 0 && <KeyValues entries={keys} />}
      </div>
    </IssueDetailBlock>
  );
};

const Breadcrumbs = ({ breadcrumbs }: { breadcrumbs: readonly IssueEventBreadcrumb[] }) => {
  const { t } = useTranslate();
  return (
    <IssueDetailBlock title={t('Breadcrumbs')}>
      <ol data-slot="issue-breadcrumbs" className="space-y-1 text-xs">
        {breadcrumbs.map((crumb, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: breadcrumbs are positional
          <li key={index} className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            {crumb.at && <DateCell value={crumb.at} className="text-muted-foreground" />}
            {crumb.category && <span className="font-mono text-muted-foreground">{crumb.category}</span>}
            <span className="min-w-0 break-all">
              {crumb.message ?? (crumb.from || crumb.to ? `${crumb.from ?? ''} → ${crumb.to ?? ''}` : crumb.url)}
              {crumb.status ? ` (${crumb.status})` : ''}
            </span>
          </li>
        ))}
      </ol>
    </IssueDetailBlock>
  );
};

export interface IssueEventDetailsProps {
  event: IssueEventDetail;
  className?: string;
}

/** Every block of one occurrence: stack, causes, request, command, job, client, breadcrumbs, meta. */
export const IssueEventDetails = ({ event, className }: IssueEventDetailsProps) => {
  const { t } = useTranslate();
  const frames = issueFrameViewsOf(event);
  const parameters = event.routeParameters?.elements ?? [];
  const causes = event.causes?.elements ?? [];
  const breadcrumbs = event.breadcrumbs?.elements ?? [];
  const client = event.client;
  const hasRequest = Boolean(event.route || event.httpMethod || event.httpStatus || parameters.length > 0);
  const rawStack = event.resolvedStackTrace || event.stackTrace;

  return (
    <div data-slot="issue-event-details" className={cn('min-w-0 space-y-4', className)}>
      {event.message && <p className="text-sm break-words">{event.message}</p>}
      <IssueDetailBlock title={t('Stack')}>
        {frames.length > 0 ? <IssueFrameList frames={frames} /> : rawStack ? null : <p className="text-sm text-muted-foreground">{t('No stack recorded.')}</p>}
        {event.resolveError && <p className="text-xs text-warning">{t('The source maps could not be read: %error%', { replacements: { error: event.resolveError } })}</p>}
        {rawStack &&
          (frames.length > 0 ? (
            <RawText summary={t('Raw stack trace')} text={rawStack} />
          ) : (
            <pre className="max-h-80 overflow-auto rounded-md bg-muted/30 p-2 font-mono text-xs whitespace-pre">{rawStack}</pre>
          ))}
      </IssueDetailBlock>
      <IssueCauses causes={causes} />
      {hasRequest && (
        <IssueDetailBlock title={t('Request')}>
          <div data-slot="issue-request" className="space-y-2">
            <p className="flex flex-wrap items-center gap-2 font-mono text-xs break-all">
              {event.httpMethod && <span className="font-semibold">{event.httpMethod}</span>}
              {event.route && <span>{event.route}</span>}
              {event.httpStatus ? <StatusBadge tone={event.httpStatus >= 500 ? 'danger' : 'warning'} label={String(event.httpStatus)} /> : null}
            </p>
            {parameters.length > 0 && <KeyValues entries={parameters} />}
          </div>
        </IssueDetailBlock>
      )}
      {event.command && (
        <IssueDetailBlock title={t('Console command')}>
          <p className="font-mono text-xs break-all">{event.command}</p>
        </IssueDetailBlock>
      )}
      {event.worker && <IssueWorkerContext worker={event.worker} />}
      {client && (
        <IssueDetailBlock title={t('Client')}>
          <DefinitionList
            layout="rows"
            items={[
              { id: 'app', label: m('App'), value: [client.app, client.runtime].filter(Boolean).join(' · ') },
              { id: 'release', label: m('Release'), value: client.release },
              { id: 'browser', label: m('Browser'), value: [client.browserName, client.browserVersion].filter(Boolean).join(' ') },
              { id: 'os', label: m('Operating system'), value: client.osName },
              {
                id: 'viewport',
                label: m('Viewport'),
                value: client.viewportWidth && client.viewportHeight ? `${client.viewportWidth} × ${client.viewportHeight}` : null,
              },
              { id: 'route', label: m('Route'), value: client.routePattern },
              { id: 'url', label: m('URL'), value: client.url && <span className="break-all">{client.url}</span> },
            ].filter(item => item.value)}
          />
        </IssueDetailBlock>
      )}
      {breadcrumbs.length > 0 && <Breadcrumbs breadcrumbs={breadcrumbs} />}
      <IssueDetailBlock title={t('Meta')}>
        <DefinitionList
          layout="rows"
          items={[
            { id: 'timestamp', label: m('Time'), value: event.timestamp ? <DateCell value={event.timestamp} /> : null },
            { id: 'level', label: m('Level'), value: event.level },
            { id: 'release', label: m('Release'), value: event.release && <span className="font-mono text-xs break-all">{event.release}</span> },
            { id: 'commit', label: m('Commit'), value: event.commit && <span className="font-mono text-xs break-all">{event.commit}</span> },
            { id: 'eventId', label: m('Event ID'), value: event.eventId && <span className="font-mono text-xs break-all">{event.eventId}</span> },
          ].filter(item => item.value)}
        />
      </IssueDetailBlock>
    </div>
  );
};
