'use client';

import { type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode, useState } from 'react';

import { cn } from './cn.ts';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip.tsx';

// The package tooltips the screens use instead of native `title` attributes. Not an entry of its own: `WorkerHint`
// (`./workers`) is the public face of `Hint`; the other screens import both relatively.

export interface HintProps {
  /** The details (several lines keep their line breaks). */
  content: ReactNode;
  children: ReactNode;
  className?: string;
  /** Classes of the tooltip. */
  contentClassName?: string;
  /** `data-slot` of the trigger. */
  slot?: string;
}

/**
 * Details of a truncated or terse value as the package tooltip instead of a native `title`: it opens on hover, on
 * keyboard focus (the value is a tab stop; Enter or Space toggles it, Escape closes it) and on a tap, keeps line
 * breaks, and never runs a row's action. It brings its own tooltip provider, so a part used without `AdminUiProvider`
 * still renders.
 */
export const Hint = ({ content, children, className, contentClassName, slot = 'hint' }: HintProps) => {
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
            data-slot={slot}
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

export interface ControlHintProps {
  /** What the control does (its tooltip while it is enabled). */
  label?: ReactNode;
  /** Why the control is disabled: the tooltip, screen-reader text, and the wrapper becomes a tab stop. */
  disabledReason?: string | null;
  /** The control (a button, a switch). */
  children: ReactNode;
  className?: string;
  /** `data-slot` of the wrapper. */
  slot?: string;
}

/**
 * The tooltip of a control: its label, or the reason it is disabled. A disabled control fires no pointer events and
 * takes no focus, so the wrapper is the trigger and, while disabled, a tab stop of its own that carries the reason
 * (also as screen-reader text). Without a label or a reason the wrapper carries no tooltip.
 */
export const ControlHint = ({ label, disabledReason, children, className, slot = 'control-hint' }: ControlHintProps) => {
  const content = disabledReason || label;
  if (!content) {
    return (
      <span className={cn('inline-flex', className)} data-row-action-ignore data-slot={slot}>
        {children}
      </span>
    );
  }
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('inline-flex rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none', className)}
            tabIndex={disabledReason ? 0 : undefined}
            data-row-action-ignore
            data-slot={slot}
          >
            {children}
            {disabledReason && <span className="sr-only">{disabledReason}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-80 text-left whitespace-pre-line">{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export interface HoverReadoutProps {
  /** The marks; each one that has a readout carries it in `data-readout` (several lines keep their line breaks). */
  children: ReactNode;
  className?: string;
  /** The element drawn (default `div`). */
  as?: 'div' | 'span';
  /** `data-slot` of the element. */
  slot?: string;
  role?: string;
  'aria-label'?: string;
}

interface ReadoutAnchor {
  key: string;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * One package tooltip for many small marks (bars of a strip, cells of a timeline) instead of a native `title` on each:
 * pointing at or tapping a mark with `data-readout` shows its text above it; leaving the marks (or Escape, or a tap
 * elsewhere) closes it. The marks stay out of the tab order (their `aria-label` is the keyboard and screen-reader
 * path); a single tooltip keeps a long list light.
 */
export const HoverReadout = ({ children, className, as: Tag = 'div', slot, role, 'aria-label': ariaLabel }: HoverReadoutProps) => {
  const [anchor, setAnchor] = useState<ReadoutAnchor | null>(null);
  const show = (event: PointerEvent<HTMLElement>) => {
    const container = event.currentTarget;
    const mark = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-readout]') : null;
    if (!mark || !container.contains(mark)) return;
    const text = mark.dataset.readout ?? '';
    const box = mark.getBoundingClientRect();
    const frame = container.getBoundingClientRect();
    const key = `${box.left}:${box.top}:${text}`;
    setAnchor(current =>
      current?.key === key
        ? current
        : {
            key,
            text,
            left: box.left - frame.left + container.scrollLeft - container.clientLeft,
            top: box.top - frame.top + container.scrollTop - container.clientTop,
            width: box.width,
            height: box.height,
          }
    );
  };
  const hide = (event: PointerEvent<HTMLElement>) => {
    // a tap ends with a pointer leave: the readout stays until the next tap or Escape
    if (event.pointerType !== 'touch') setAnchor(null);
  };
  return (
    <Tag data-slot={slot} role={role} aria-label={ariaLabel} className={cn('relative', className)} onPointerOver={show} onPointerDown={show} onPointerLeave={hide}>
      {children}
      {anchor && (
        <TooltipProvider delayDuration={0}>
          <Tooltip key={anchor.key} open onOpenChange={open => !open && setAnchor(null)}>
            <TooltipTrigger asChild>
              <span
                aria-hidden
                data-slot="hover-readout-anchor"
                className="pointer-events-none absolute"
                style={{ left: anchor.left, top: anchor.top, width: anchor.width, height: anchor.height }}
              />
            </TooltipTrigger>
            <TooltipContent className="max-w-80 text-left whitespace-pre-line">{anchor.text}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </Tag>
  );
};
