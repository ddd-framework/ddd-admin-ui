'use client';

import { Play } from 'lucide-react';
import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import { SectionHeader } from './SectionHeader.tsx';
import { StatusCallout } from './StatusCallout.tsx';

/** The outcome of the last run of a maintenance action. */
export interface MaintenanceActionOutcome {
  /** Success text (a green notice). */
  result?: ReactNode;
  /** The failure (a red notice), e.g. the server's message. */
  error?: ReactNode;
}

export interface MaintenanceActionCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Starts the action (the screen asks first with `useConfirm` when it is expensive or not idempotent). */
  onRun: () => void;
  isRunning?: boolean;
  /** The last run's result or error; `null` before the first run. */
  outcome?: MaintenanceActionOutcome | null;
  /** The run button's text (default "Run"). */
  runLabel?: ReactNode;
  /** A run is a write: the button is disabled while `WriteAccessProvider` says no (unless `ignoreWriteAccess`). */
  ignoreWriteAccess?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * One maintenance action (an import from config, a backfill, a re-index): title, description, the run button and the
 * result or error of the last run. The screen owns the request; the card shows its state.
 */
export const MaintenanceActionCard = ({
  title,
  description,
  onRun,
  isRunning = false,
  outcome,
  runLabel,
  ignoreWriteAccess = false,
  disabled = false,
  className,
}: MaintenanceActionCardProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const writeBlocked = !ignoreWriteAccess && !writeAccess.allowed;
  return (
    <Card className={cn('gap-0 py-0', className)} data-slot="maintenance-action-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <SectionHeader as="h3" title={title} description={description} className="mb-0 min-w-0 flex-1" />
          <Button
            type="button"
            onClick={onRun}
            disabled={disabled || isRunning || writeBlocked}
            title={writeBlocked ? writeAccess.reason : undefined}
            className="shrink-0"
          >
            <Play aria-hidden />
            {isRunning ? t('Running…', { context: 'maintenance-action' }) : (runLabel ?? t('Run', { context: 'maintenance-action' }))}
          </Button>
        </div>
        {outcome?.error && <StatusCallout tone="destructive" size="compact" title={<span className="break-words">{outcome.error}</span>} />}
        {outcome?.result && <StatusCallout tone="success" size="compact" title={outcome.result} />}
      </CardContent>
    </Card>
  );
};
