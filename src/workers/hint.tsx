'use client';

import { type KeyboardEvent, type MouseEvent, type ReactNode, useState } from 'react';

import { cn } from '../primitives/cn.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/tooltip.tsx';

export interface WorkerHintProps {
  /** The details (several lines keep their line breaks). */
  content: ReactNode;
  children: ReactNode;
  className?: string;
  /** Classes of the tooltip. */
  contentClassName?: string;
}

/**
 * Details of a truncated or terse value as the package tooltip instead of a native `title`: it opens on hover, on
 * keyboard focus (the value is a tab stop; Enter or Space toggles it, Escape closes it) and on a tap, keeps line
 * breaks, and never runs a row's action. It brings its own tooltip provider, so a part used without `AdminUiProvider`
 * still renders.
 */
export const WorkerHint = ({ content, children, className, contentClassName }: WorkerHintProps) => {
  const [open, setOpen] = useState(false);
  const toggle = (event: MouseEvent<HTMLSpanElement>) => {
    // the tooltip closes on a click by default; a tap toggles it instead (touch has no hover)
    event.preventDefault();
    setOpen(current => !current);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Escape') setOpen(false);
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    setOpen(current => !current);
  };
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          {/* biome-ignore lint/a11y/useSemanticElements: a span, not a button: the value may hold block content (a bar) */}
          <span
            role="button"
            tabIndex={0}
            data-row-action-ignore
            data-slot="worker-hint"
            onClick={toggle}
            onKeyDown={onKeyDown}
            className={cn('cursor-help rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none', className)}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent className={cn('max-w-80 text-left whitespace-pre-line', contentClassName)}>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
