'use client';

import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from './cn.ts';
import {
  isSegmentedKey,
  segmentedDragDecision,
  segmentedIndexAtPoint,
  segmentedIndexForKey,
} from './segmentedControlNavigation.ts';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip.tsx';

/** One choice of a `SegmentedControl`. Texts are English UI texts (keys), translated by the control. */
export interface SegmentedControlOption<TValue extends string = string> {
  value: TValue;
  /** The option's name; with `iconOnly` the accessible name and the tooltip. */
  label: string;
  icon?: ReactNode;
  /** A small count or marker after the label; decorative (`aria-hidden`), so say it in `description` when it matters. */
  badge?: ReactNode;
  /** Announced after the label (`aria-describedby`); not shown. */
  description?: string;
  disabled?: boolean;
  /** Why the option is disabled: announced and shown as the option's tooltip. */
  disabledReason?: string;
  /** Translation context of `label`, `description` and `disabledReason` (key `<text>__<context>`). */
  context?: string;
  /**
   * `false`: the texts are already translated (e.g. names from the server) and are shown as they are. Default: they
   * are English UI texts, translated by the control (mark them for extraction with `m()`, the text and any
   * `{ context }` written as string literals).
   */
  translate?: boolean;
  /** Overrides the control's `badgeStyle` for this option. */
  badgeStyle?: SegmentedControlBadgeStyle;
  className?: string;
}

/** `pill` (default): the badge sits in a small pill of the current colour. `unstyled`: rendered as given (a host pill). */
export type SegmentedControlBadgeStyle = 'pill' | 'unstyled';

export interface SegmentedControlProps<TValue extends string = string> {
  /** The selected option's value; exactly one option is selected, so it must be one of `options`. */
  value: TValue;
  /** Called once per change: on a click, on an arrow key (automatic activation), on Space / Enter, on drag release. */
  onValueChange: (value: TValue) => void;
  options: readonly SegmentedControlOption<TValue>[];
  /** Accessible name of the group (required: the options alone do not say what is chosen). */
  'aria-label': string;
  /** Control height in px (default 32). Touch targets are at least 44 px on a coarse pointer whatever the height. */
  height?: 32 | 36 | 40 | 48;
  /**
   * What `height` measures. `control` (default): the whole control, the options are the height minus the track's
   * padding. `option`: each option; the track grows by its padding (a host track with `p-1` is 8 px taller).
   */
  heightOf?: 'control' | 'option';
  /**
   * On a coarse pointer (touch). `hit-area` (default): the look stays, each option gets an invisible hit area of at
   * least 44 × 44 px. `grow`: the options grow to at least `--segmented-control-coarse-option-height` (default 44 px,
   * also their minimum width) and the gap to `--segmented-control-coarse-gap` (default 8 px).
   */
  coarsePointer?: 'hit-area' | 'grow';
  /** Default look of the options' badges (see `SegmentedControlBadgeStyle`). */
  badgeStyle?: SegmentedControlBadgeStyle;
  /**
   * `false`: `aria-label` and the option texts are already translated and shown as they are (an option's own
   * `translate` still wins). Default: English UI texts, translated by the control.
   */
  translate?: boolean;
  /**
   * The indicator swells while the pointer holds the selected option or drags (`--segmented-control-held-scale`,
   * default 1.06). Off by default.
   */
  pressFeedback?: boolean;
  /** Icons only; the label stays the accessible name and shows as a tooltip. */
  iconOnly?: boolean;
  /** Stretch over the container's width, options sharing it equally. */
  fullWidth?: boolean;
  /** The selected option's look: the raised card surface (default) or the primary colour. */
  selection?: 'surface' | 'primary';
  /** `onBrand` on a brand-coloured background. */
  tone?: 'default' | 'onBrand';
  /**
   * `automatic` (default): arrow keys, Home and End move and select. `manual`: they move the focus only, Space or Enter
   * selects (an expensive change, e.g. one that loads data).
   */
  activation?: 'automatic' | 'manual';
  className?: string;
  /** Inline style of the root, e.g. `--segmented-control-*` variables for this control only. */
  style?: CSSProperties;
}

const HEIGHT_CLASS = { 32: 'h-8 text-[13px]', 36: 'h-9 text-[13px]', 40: 'h-10 text-sm', 48: 'h-12 text-sm' } as const;
/** `heightOf="option"`: the options carry the height, the track follows (its padding added). */
const OPTION_HEIGHT_CLASS = { 32: 'h-8', 36: 'h-9', 40: 'h-10', 48: 'h-12' } as const;
const OPTION_TEXT_CLASS = { 32: 'text-[13px]', 36: 'text-[13px]', 40: 'text-sm', 48: 'text-sm' } as const;
const ICON_ONLY_WIDTH_CLASS = { 32: 'w-7', 36: 'w-8', 40: 'w-9', 48: 'w-11' } as const;

const TRACK_CLASS = { default: 'bg-tint text-muted-foreground', onBrand: 'bg-brand-ink/25 text-brand-light' } as const;
const INDICATOR_CLASS = {
  surface: { default: 'bg-segment-active shadow-[var(--surface-shadow)]', onBrand: 'bg-brand-light' },
  primary: { default: 'bg-primary', onBrand: 'bg-primary' },
} as const;
const HIGHLIGHT_TEXT_CLASS = {
  surface: { default: 'text-foreground', onBrand: 'text-brand-ink' },
  primary: { default: 'text-primary-foreground', onBrand: 'text-primary-foreground' },
} as const;
const HOVER_TEXT_CLASS = { default: 'hover:text-foreground', onBrand: 'hover:text-primary-foreground' } as const;

/**
 * Coarse pointers: an invisible hit area of at least 44 × 44 px around each option, so a 32 px control stays easy to
 * hit on a phone without changing its look.
 */
const COARSE_TARGET_CLASS =
  "pointer-coarse:before:absolute pointer-coarse:before:inset-x-[min(0px,calc((100%_-_44px)/2))] pointer-coarse:before:inset-y-[min(0px,calc((100%_-_44px)/2))] pointer-coarse:before:content-['']";

/** `coarsePointer="grow"`: real 44 px options (or the host's size) and a wider gap on a coarse pointer. */
const COARSE_GROW_TRACK_CLASS = 'pointer-coarse:h-auto pointer-coarse:gap-[var(--segmented-control-coarse-gap,0.5rem)]';
const COARSE_GROW_OPTION_CLASS =
  'pointer-coarse:min-h-[var(--segmented-control-coarse-option-height,44px)] pointer-coarse:min-w-[var(--segmented-control-coarse-option-height,44px)]';

/** Transitions read optional variables; without them the values of 0.1.0 apply. */
const TRACK_TRANSITION_CLASS =
  'transition-[background-color] duration-[var(--segmented-control-track-duration,0ms)] ease-[var(--segmented-control-track-easing,cubic-bezier(0.4,0,0.2,1))]';
const OPTION_TRANSITION_CLASS =
  'duration-[var(--segmented-control-option-duration,var(--segmented-control-duration))] ease-[var(--segmented-control-option-easing,cubic-bezier(0.4,0,0.2,1))]';

interface DragState {
  pointerId: number;
  pointerType: string;
  startX: number;
  startY: number;
  active: boolean;
  cancelled: boolean;
}

/**
 * One value out of a few, side by side (view modes, a period, a scope). A radio group: `role="radiogroup"`, options
 * `role="radio"` with `aria-checked`, one tab stop (the selected option), arrows / Home / End move (selecting at once
 * or, with `activation="manual"`, on Space / Enter), right-to-left aware, disabled options skipped and their reason
 * announced. Not tabs (no panels) and not a toggle group (always exactly one selected).
 *
 * The selected option sits on a sliding indicator, measured after layout (the server render and the hydration render
 * mark the selected option directly). Pressing and dragging across the options moves the indicator as a preview; the
 * value changes once, on release; Escape or a cancelled pointer restores it. A touch drag starts only after a sideways
 * movement, so a vertical swipe keeps scrolling the page.
 *
 * Tooltips (an `iconOnly` option's label, a disabled option's reason) need the tooltip provider of `AdminUiProvider`.
 * Duration and corner come from `--segmented-control-duration` and `--segmented-control-radius`. Optional, unset by
 * default: `--segmented-control-easing` (indicator slide, default ease-out), `--segmented-control-option-duration` /
 * `--segmented-control-option-easing` (option colour; default the slide's duration), `--segmented-control-track-duration`
 * / `--segmented-control-track-easing` (track background; default none), `--segmented-control-coarse-option-height` and
 * `--segmented-control-coarse-gap` (`coarsePointer="grow"`), `--segmented-control-held-scale` (`pressFeedback`). The
 * indicator takes the selected option's box, so a host track padding (`p-1`) insets it as much as the options.
 */
export const SegmentedControl = <TValue extends string = string>({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  height = 32,
  iconOnly = false,
  fullWidth = false,
  selection = 'surface',
  tone = 'default',
  activation = 'automatic',
  className,
  heightOf = 'control',
  coarsePointer = 'hit-area',
  badgeStyle = 'pill',
  translate = true,
  pressFeedback = false,
  style,
}: SegmentedControlProps<TValue>) => {
  const { t } = useTranslate();
  const baseId = useId();
  const groupRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [preview, setPreview] = useState<TValue | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; top: number; height: number } | null>(null);
  const [held, setHeld] = useState(false);
  // wider than its container (five options in a phone column): it scrolls inside itself, never the page
  const [overflowing, setOverflowing] = useState(false);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  const disabled = options.map(option => option.disabled === true);
  const selectedIndex = options.findIndex(option => option.value === value);
  const tabStop = selectedIndex !== -1 ? selectedIndex : disabled.indexOf(false);
  const target = preview ?? value;
  const targetIndex = options.findIndex(option => option.value === target);
  const layoutKey = `${options.map(option => option.value).join('|')}:${height}:${iconOnly}:${fullWidth}:${heightOf}:${coarsePointer}`;

  // After layout only: place the indicator under the selected (or previewed) option, again on every resize.
  // biome-ignore lint/correctness/useExhaustiveDependencies: layoutKey re-measures when the options' boxes may change
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const place = () => {
      const wider = group.scrollWidth > group.clientWidth + 1;
      // the attribute at once (a resize observer runs before the paint), the state for the drag rules: until React
      // renders the state, a track that turned wider would widen the page (a phone, a slow device)
      group.toggleAttribute('data-overflowing', wider);
      setOverflowing(wider);
      const option = optionRefs.current[targetIndex];
      if (!option || option.offsetWidth === 0) {
        setIndicator(previous => (previous === null ? previous : null));
        return;
      }
      // the option's own box: the indicator follows the track's padding (a host `p-1` track included)
      const next = { left: option.offsetLeft, width: option.offsetWidth, top: option.offsetTop, height: option.offsetHeight };
      setIndicator(previous =>
        previous &&
        previous.left === next.left &&
        previous.width === next.width &&
        previous.top === next.top &&
        previous.height === next.height
          ? previous
          : next
      );
    };
    place();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(place);
    observer.observe(group);
    return () => observer.disconnect();
  }, [targetIndex, layoutKey]);

  // keep the selected option in view while the control scrolls (keyboard focus scrolls by itself)
  useLayoutEffect(() => {
    const group = groupRef.current;
    const option = optionRefs.current[selectedIndex];
    if (!overflowing || !group || !option) return;
    const frame = group.getBoundingClientRect();
    const box = option.getBoundingClientRect();
    if (box.left < frame.left) group.scrollLeft -= frame.left - box.left + 4;
    else if (box.right > frame.right) group.scrollLeft += box.right - frame.right + 4;
  }, [selectedIndex, overflowing]);

  const select = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled || option.value === value) return;
      onValueChange(option.value);
    },
    [options, value, onValueChange]
  );

  const endDrag = useCallback(() => {
    const group = groupRef.current;
    const state = drag.current;
    if (group && state && group.hasPointerCapture?.(state.pointerId)) group.releasePointerCapture(state.pointerId);
    drag.current = null;
    setPreview(null);
    setHeld(false);
  }, []);

  // Escape during a drag restores the value; the release that follows changes nothing.
  const isDragging = preview !== null;
  useEffect(() => {
    if (!isDragging) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !drag.current) return;
      event.preventDefault();
      drag.current.cancelled = true;
      setPreview(null);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isDragging]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!isSegmentedKey(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
    const current = optionRefs.current.findIndex(option => option === event.target);
    if (current === -1) return;
    event.preventDefault();
    const direction = groupRef.current && getComputedStyle(groupRef.current).direction === 'rtl' ? 'rtl' : 'ltr';
    const next = segmentedIndexForKey(disabled, current, event.key, direction);
    optionRefs.current[next]?.focus();
    if (activation === 'automatic') select(next);
  };

  const indexAt = (clientX: number) =>
    segmentedIndexAtPoint(
      optionRefs.current.map(option => {
        const box = option?.getBoundingClientRect();
        return { left: box?.left ?? 0, right: box?.right ?? 0 };
      }),
      disabled,
      clientX
    );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    if (pressFeedback && selectedIndex !== -1 && optionRefs.current[selectedIndex]?.contains(event.target as Node)) setHeld(true);
    drag.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      cancelled: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId || state.cancelled) return;
    if (!state.active) {
      const decision = segmentedDragDecision(state.pointerType, event.clientX - state.startX, event.clientY - state.startY);
      if (decision === 'wait') return;
      // a scrolling control keeps touch swipes for scrolling
      if (decision === 'abandon' || (overflowing && state.pointerType === 'touch')) {
        drag.current = null;
        setHeld(false);
        return;
      }
      state.active = true;
      if (pressFeedback) setHeld(true);
      groupRef.current?.setPointerCapture?.(event.pointerId);
    }
    const index = indexAt(event.clientX);
    const option = options[index];
    if (option) setPreview(option.value);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.active) {
      // a press without a drag: the option's click selects it
      drag.current = null;
      setHeld(false);
      return;
    }
    suppressClick.current = true;
    const next = state.cancelled ? null : preview;
    endDrag();
    if (next !== null && next !== value) onValueChange(next);
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.active) suppressClick.current = true;
    endDrag();
  };

  const onOptionClick = (index: number) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    select(index);
  };

  const indicatorReady = indicator !== null;

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={translate ? t(ariaLabel) : ariaLabel}
      data-held={held || undefined}
      data-overflowing={overflowing || undefined}
      style={style}
      data-slot="segmented-control"
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      className={cn(
        'relative isolate max-w-full shrink-0 items-stretch gap-0.5 rounded-(--segmented-control-radius) p-0.5 select-none',
        'touch-pan-y data-overflowing:touch-auto data-overflowing:overflow-x-auto data-overflowing:[scrollbar-width:none] data-overflowing:[&::-webkit-scrollbar]:hidden',
        fullWidth ? 'flex w-full' : 'inline-flex',
        heightOf === 'option' ? OPTION_TEXT_CLASS[height] : HEIGHT_CLASS[height],
        coarsePointer === 'grow' && COARSE_GROW_TRACK_CLASS,
        TRACK_TRANSITION_CLASS,
        TRACK_CLASS[tone],
        className
      )}
    >
      {indicator && (
        <span
          aria-hidden
          data-slot="segmented-control-indicator"
          className={cn(
            'pointer-events-none absolute inset-y-0.5 left-0 -z-10 rounded-(--segmented-control-radius) transition-[translate,width,height,top,scale] duration-(--segmented-control-duration) ease-[var(--segmented-control-easing,cubic-bezier(0,0,0.2,1))] motion-reduce:transition-none',
            held && 'scale-[var(--segmented-control-held-scale,1.06)]',
            INDICATOR_CLASS[selection][tone]
          )}
          style={{ translate: `${indicator.left}px 0`, width: indicator.width, top: indicator.top, height: indicator.height }}
        />
      )}
      {options.map((option, index) => {
        const checked = index === selectedIndex;
        const highlighted = index === targetIndex;
        const descriptionId = option.description ? `${baseId}-description-${index}` : undefined;
        const reasonId = option.disabled && option.disabledReason ? `${baseId}-reason-${index}` : undefined;
        const describedBy = [descriptionId, reasonId].filter(Boolean).join(' ') || undefined;
        const text = (raw: string) =>
          (option.translate ?? translate) === false ? raw : t(raw, option.context ? { context: option.context } : undefined);
        const unstyledBadge = (option.badgeStyle ?? badgeStyle) === 'unstyled';
        const label = text(option.label);
        const button = (
          <button
            ref={element => {
              optionRefs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={option.disabled || undefined}
            aria-describedby={describedBy}
            tabIndex={index === tabStop ? 0 : -1}
            data-state={checked ? 'checked' : 'unchecked'}
            onClick={() => onOptionClick(index)}
            className={cn(
              'relative inline-flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-(--segmented-control-radius) px-3 font-bold whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
              OPTION_TRANSITION_CLASS,
              coarsePointer === 'grow' ? COARSE_GROW_OPTION_CLASS : COARSE_TARGET_CLASS,
              heightOf === 'option' && OPTION_HEIGHT_CLASS[height],
              fullWidth ? 'flex-1' : 'shrink-0',
              iconOnly && cn('px-0', ICON_ONLY_WIDTH_CLASS[height]),
              highlighted ? HIGHLIGHT_TEXT_CLASS[selection][tone] : !option.disabled && HOVER_TEXT_CLASS[tone],
              // before the indicator is measured (server render, hydration) the selected option carries its look
              checked && !indicatorReady && INDICATOR_CLASS[selection][tone],
              option.disabled && 'cursor-not-allowed opacity-50',
              option.className
            )}
          >
            {option.icon}
            <span className={iconOnly ? 'sr-only' : 'truncate'}>{label}</span>
            {option.badge !== undefined &&
              (unstyledBadge ? (
                option.badge !== null && option.badge !== false && option.badge !== '' && (
                  <span aria-hidden className="inline-flex shrink-0 items-center">
                    {option.badge}
                  </span>
                )
              ) : (
                <span
                  aria-hidden
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-current/15 px-1 text-[11px] leading-none tabular-nums"
                >
                  {option.badge}
                </span>
              ))}
          </button>
        );
        const reason = reasonId ? text(option.disabledReason as string) : undefined;
        // outside the button: text inside it would join the accessible name; `hidden` text still describes
        const descriptions = (
          <>
            {descriptionId && (
              <span id={descriptionId} hidden>
                {text(option.description as string)}
              </span>
            )}
            {reasonId && (
              <span id={reasonId} hidden>
                {reason}
              </span>
            )}
          </>
        );
        if (!iconOnly && !reason) {
          return (
            <Fragment key={option.value}>
              {button}
              {descriptions}
            </Fragment>
          );
        }
        return (
          <Fragment key={option.value}>
            <Tooltip>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent>
                {iconOnly && reason ? (
                  <>
                    {label}
                    <br />
                    {reason}
                  </>
                ) : (
                  (reason ?? label)
                )}
              </TooltipContent>
            </Tooltip>
            {descriptions}
          </Fragment>
        );
      })}
    </div>
  );
};
