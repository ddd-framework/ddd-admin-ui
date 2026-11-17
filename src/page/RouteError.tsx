'use client';

import { Flag, RotateCcw, TriangleAlert } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button, Card, CardContent } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface RouteErrorProps {
  /** Renders the route again (Next `error.tsx`: its `reset`). */
  onRetry: () => void;
  /**
   * Optional "Report problem" (the host's issue reporter, a feedback dialog). A returned promise shows the button busy;
   * after it resolves the button says the report was sent. Absent: no button (the crash is reported by the host's
   * error capture anyway).
   */
  onReport?: () => void | Promise<void>;
  /** English UI texts (translated) or nodes; defaults say the page could not be shown and that it can be retried. */
  title?: ReactNode;
  description?: ReactNode;
  /** A short technical detail (an error digest) under the text, in mono. */
  detail?: string;
  /** `page` (default): centred in 60 % of the viewport height. `inline`: inside a card or section, no minimum height. */
  variant?: 'page' | 'inline';
  className?: string;
}

/**
 * What a route shows when it crashed while rendering (Next `app/…/error.tsx`, `global-error.tsx` inside the host's
 * shell): a card with the message, "Try again" and optionally "Report problem". An alert for assistive technology;
 * the shell around it stays usable.
 */
export const RouteError = ({ onRetry, onReport, title, description, detail, variant = 'page', className }: RouteErrorProps) => {
  const { t } = useTranslate();
  const [report, setReport] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const text = (value: ReactNode, fallback: string) => (typeof value === 'string' ? t(value) : (value ?? fallback));

  const handleReport = async () => {
    if (!onReport) return;
    setReport('sending');
    try {
      await onReport();
      setReport('sent');
    } catch {
      setReport('failed');
    }
  };

  return (
    <div className={cn('flex items-center justify-center px-4', variant === 'page' && 'min-h-[60dvh] py-8', className)}>
      <Card role="alert" className="w-full max-w-md gap-0 py-0">
        <CardContent className="space-y-4 p-6 text-center">
          <TriangleAlert className="mx-auto size-8 text-warning" aria-hidden />
          <div className="space-y-1">
            <h2 className="text-title-card font-semibold">{text(title, t('Something went wrong'))}</h2>
            <p className="text-sm text-muted-foreground">
              {text(description, t('This page could not be shown. Try again, or reload the page.'))}
            </p>
            {detail && <p className="pt-1 font-mono text-xs break-all text-muted-foreground">{detail}</p>}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" onClick={onRetry}>
              <RotateCcw aria-hidden />
              {t('Try again')}
            </Button>
            {onReport && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleReport()}
                disabled={report === 'sending' || report === 'sent'}
              >
                <Flag aria-hidden />
                {report === 'sent'
                  ? t('Problem reported')
                  : report === 'sending'
                    ? t('Reporting…')
                    : t('Report problem')}
              </Button>
            )}
          </div>
          {report === 'failed' && (
            <p className="text-xs text-destructive" role="status">
              {t('The report could not be sent.')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
