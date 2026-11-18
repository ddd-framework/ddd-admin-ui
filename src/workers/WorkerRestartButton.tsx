'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { notify } from '../logic/pure/notify.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { StatusCallout } from '../page/StatusCallout.tsx';
import { Button } from '../primitives/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip.tsx';
import type { WorkersApi } from './api.ts';
import { isProcessStillLive, shortClassName, shortHost } from './format.ts';
import type { WorkerProcess } from './types.ts';
import { WorkerTruncatedText } from './hint.tsx';

export interface WorkerRestartButtonProps {
  api: WorkersApi;
  /** One transport; without it every live worker process is asked. */
  transport?: string;
  /** Live processes now (the confirmation names the count). */
  liveProcessCount?: number;
  /** `icon` for a table row, `button` for a page header. */
  variant?: 'button' | 'icon';
  /** The monitoring is off: the backend refuses a restart (400), the button says why. */
  monitoringEnabled?: boolean;
  /**
   * The live processes now (of the transport, or all), refreshed by the screen's polling: the result then follows each
   * asked process (stopped once it left the list, else still finishing) and counts how many stopped.
   */
  liveProcesses?: readonly WorkerProcess[];
}

interface RestartResult {
  requestedProcessCount: number;
  processes: WorkerProcess[];
}

const processCount = (t: TranslateFn, count: number): string => t('{count, plural, one {# process} other {# processes}}', { count });

/**
 * The only action of the workers screens (no scaling controls): a restart request. Each live process stops after its
 * current message and whatever runs the workers starts it again; a process inside a long job finishes that job first.
 * Confirmation first, then the asked processes. Disabled while `WriteAccessProvider` says no, or the monitoring is off.
 */
export const WorkerRestartButton = ({
  api,
  transport,
  liveProcessCount,
  variant = 'button',
  monitoringEnabled = true,
  liveProcesses,
}: WorkerRestartButtonProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const [restart, restartState] = api.useRestartMutation();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<RestartResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const label = transport ? t('Restart workers of %transport%', { replacements: { transport } }) : t('Restart all workers');
  const disabledReason = !writeAccess.allowed
    ? (writeAccess.reason ?? t('Writes are switched off'))
    : !monitoringEnabled
      ? t('The worker monitoring is off: the live processes are not known, so none can be asked.')
      : undefined;

  const openDialog = () => {
    setResult(null);
    setErrorMessage(null);
    setOpen(true);
  };

  const submit = async () => {
    if (!writeAccess.allowed) return;
    setErrorMessage(null);
    try {
      const response = await restart(transport ? { transport } : {}).unwrap();
      const restartResult = { requestedProcessCount: response.requestedProcessCount, processes: response.workerProcesses.elements ?? [] };
      setResult(restartResult);
      if (restartResult.requestedProcessCount > 0) {
        notify.success(t('Restart requested for %processes%', { replacements: { processes: processCount(t, restartResult.requestedProcessCount) } }));
      }
    } catch (restartError) {
      setErrorMessage(normalizeDddError(restartError, t('The restart could not be requested.')).message);
    }
  };

  return (
    // The dialog is portalled, but React bubbles its clicks through this tree: inside a table row they would run the
    // row's action. Stopping them here keeps the row inert while the dialog is open.
    // biome-ignore lint/a11y/noStaticElementInteractions: no interaction of its own, only a bubbling boundary
    // biome-ignore lint/a11y/useKeyWithClickEvents: no interaction of its own, only a bubbling boundary
    <span className="contents" onClick={event => event.stopPropagation()}>
      {/* a disabled button fires no pointer events: the wrapper is the tooltip's trigger and a tab stop while disabled */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className="inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              tabIndex={disabledReason ? 0 : undefined}
              data-row-action-ignore
              data-slot="worker-restart-trigger"
            >
              {variant === 'icon' ? (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={label} disabled={Boolean(disabledReason)} onClick={openDialog}>
                  <RotateCcw />
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled={Boolean(disabledReason)} onClick={openDialog}>
                  <RotateCcw aria-hidden />
                  {transport ? t('Restart workers') : t('Restart all workers')}
                </Button>
              )}
              {disabledReason && <span className="sr-only">{disabledReason}</span>}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-80">{disabledReason ?? label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          {result ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {result.requestedProcessCount === 0
                    ? t('No live process to ask')
                    : t('Asked %processes% to restart', { replacements: { processes: processCount(t, result.requestedProcessCount) } })}
                </DialogTitle>
                <DialogDescription>
                  {result.requestedProcessCount === 0
                    ? transport
                      ? t('No worker process of %transport% is running right now: nothing to restart.', { replacements: { transport } })
                      : t('No worker process is running right now: nothing to restart.')
                    : t('Each one stops after its current message and is started again. Its stop shows as “Restart requested” under Processes.')}
                </DialogDescription>
              </DialogHeader>
              {liveProcesses && result.processes.length > 0 && (
                <p className="text-sm tabular-nums" data-slot="worker-restart-progress">
                  {t('%stopped% of %asked% stopped', {
                    replacements: {
                      stopped: result.processes.filter(process => !isProcessStillLive(process, liveProcesses)).length,
                      asked: result.processes.length,
                    },
                  })}
                </p>
              )}
              {result.processes.length > 0 && (
                <ul className="max-h-64 divide-y overflow-y-auto rounded-xl bg-tint">
                  {result.processes.map(process => (
                    <li key={process.processKey ?? String(process.id)} className="space-y-0.5 px-3 py-2">
                      <p className="flex items-center justify-between gap-2 font-mono text-xs">
                        <WorkerTruncatedText full={process.processKey} className="truncate">
                          {t('%host% · pid %pid%', { replacements: { host: shortHost(process.hostName), pid: process.processId ?? '—' } })}
                        </WorkerTruncatedText>
                        {liveProcesses &&
                          (isProcessStillLive(process, liveProcesses) ? (
                            <span className="shrink-0 font-sans text-[11px] text-muted-foreground">{t('waiting to stop')}</span>
                          ) : (
                            <span className="shrink-0 font-sans text-[11px] font-semibold text-success">{t('stopped', { context: 'worker-restart' })}</span>
                          ))}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {process.transport}
                        {' · '}
                        {process.currentMessageClass
                          ? t('finishing %messageClass% first', { replacements: { messageClass: shortClassName(process.currentMessageClass) } })
                          : t('idle, stops at its next tick')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <DialogFooter>
                <Button type="button" onClick={() => setOpen(false)}>
                  {t('Done', { context: 'dialog-action' })}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>
                  {transport ? t('Restart the workers of %transport%?', { replacements: { transport } }) : t('Restart all workers?')}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    'Every live process stops after its current message and is started again with the current code and settings. A process inside a long job finishes that job first; nothing is scaled and no message is lost.'
                  )}
                </DialogDescription>
              </DialogHeader>
              {liveProcessCount !== undefined && (
                <p className="text-sm">
                  <span className="font-semibold tabular-nums">{processCount(t, liveProcessCount)}</span>{' '}
                  <span className="text-muted-foreground">{t('live right now.')}</span>
                </p>
              )}
              {errorMessage && <StatusCallout tone="destructive" size="compact" title={errorMessage} />}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  {t('Cancel', { context: 'dialog-action' })}
                </Button>
                <Button
                  type="button"
                  disabled={!writeAccess.allowed || restartState.isLoading}
                  title={writeAccess.allowed ? undefined : writeAccess.reason}
                  onClick={() => void submit()}
                >
                  <RotateCcw aria-hidden />
                  {restartState.isLoading ? t('Requesting…') : t('Request restart')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </span>
  );
};
