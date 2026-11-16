'use client';

import { type ReactNode, type Ref, type RefObject, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { type Control, useFormContext } from 'react-hook-form';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { useFormActionsSlotFor } from '../primitives/formActionsSlot.tsx';
import { DrawerFooterView } from './DrawerFooter.tsx';
import { useIsInDrawer } from './drawerSlots.ts';
import { SAVE_SHORTCUT_CONTAINER_SELECTOR, useSaveShortcut } from './saveShortcut.ts';
import { useFormDirty } from '../logic/react/useFormDirty.ts';

export interface FormActionsProps {
  primary?: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
  /**
   * On a page: the glass action pill at the top right of the form, sticky under the header (default); `false` keeps a
   * plain row. Inside a dialog (`[role="dialog"]` / `[role="alertdialog"]`, not a `FormDrawer`) the plain row is the
   * default; `true` keeps the pill there. Ignored in a drawer: its pinned footer gets the plain row with the change
   * status.
   */
  sticky?: boolean;
  /**
   * Where the sticky pill sits: `auto` (default) moves it into the header slot closest above the form
   * (`FormActionsSlot`, e.g. `EntityDetailShell formActionsSlot`) when one is mounted, and otherwise, from `md` up,
   * beside the tabs when the page has an `EntityTabs` row (`data-entity-tabs`), else into a row of its own (create
   * pages, plain details, where it would cover the page header); `header` asks for the slot (without one: as `auto`);
   * `row` always keeps its own row (a tab row too wide to share), never the slot.
   */
  placement?: 'auto' | 'row' | 'header';
  /**
   * The change status for a form without react-hook-form (state-based forms): shows "Unsaved changes" / "No changes"
   * like an RHF form does. Ignored inside an RHF form (its own dirty state wins). ⌘S works in either case as long as
   * the actions are written inside a `<form>` that owns a `type="submit"` button.
   */
  isDirty?: boolean;
  /** Applies where the actions are written; dropped once they move into a drawer's footer. */
  className?: string;
}

/**
 * The value of the bar's `data-form-actions` attribute: `components.css` selects exactly this value, so a host's own
 * action bar with a bare `data-form-actions` is not restyled by the package.
 */
const FORM_ACTIONS_MARKER = 'admin-ui';

/** Below `sm` the buttons share the row; from `sm` up each keeps its own width. */
const ACTION_CLASS = 'flex-1 min-w-fit *:w-full sm:flex-none sm:*:w-auto';

/**
 * The page action pill (host CSS `.glass-bar`): compact, right-aligned at the top of the form and sticky under the
 * fixed chrome (`--nav-h`) while the form scrolls. Forms write `<FormActions>` last; `data-form-actions="admin-ui"` + the host
 * CSS move it first (`order: -1`), so the DOM / tab order is unchanged everywhere.
 */
// No row of its own where the page has tabs: the wrapper is 0 px tall and pulled 3.5 rem up (and as
// much margin below, so the form does not move), so from `md` the pill sits in the free space right of the tabs; the
// sticky top keeps it under the chrome while scrolling. Without a tab row it would cover
// the page header (description, ID / Created / Updated), so it keeps a row there. Below `md` the centred tabs fill the
// row, so the pill always keeps a row there.
const STICKY_WRAPPER_CLASS =
  'pointer-events-none sticky top-[calc(var(--nav-h)+0.5rem)] z-(--layer-sticky) mb-4 flex justify-end md:items-start';
const BESIDE_TABS_CLASS =
  'md:[body:has([data-entity-tabs])_&]:-mt-14 md:[body:has([data-entity-tabs])_&]:mb-14 md:[body:has([data-entity-tabs])_&]:h-0';
// Buttons inside follow the pill's shape (round); Cancel and other outline buttons drop their frame (ghost look).
const STICKY_PILL_CLASS = cn(
  'glass-bar pointer-events-auto flex max-w-full flex-wrap-reverse items-center gap-2 rounded-full py-1.5 pr-1.5 pl-5 shadow-[var(--surface-shadow)] max-sm:w-full max-sm:rounded-2xl max-sm:pl-3',
  '[&_[data-slot=button]]:rounded-full',
  '[&_[data-slot=button][data-variant=outline]]:border-transparent [&_[data-slot=button][data-variant=outline]]:bg-transparent [&_[data-slot=button][data-variant=outline]]:shadow-none [&_[data-slot=button][data-variant=outline]:hover]:bg-foreground/5'
);

const DirtyStatusLabel = ({ isDirty }: { isDirty: boolean }) => {
  const { t } = useTranslate();
  return (
  <span className="mr-2 inline-flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground max-sm:hidden" aria-live="polite">
    <span className={cn('size-2 rounded-full', isDirty ? 'bg-primary' : 'bg-muted-foreground/30')} aria-hidden />
    {isDirty ? t('Unsaved changes') : t('No changes')}
  </span>
  );
};

const DirtyStatus = ({ control }: { control: Control }) => <DirtyStatusLabel isDirty={useFormDirty({ control })} />;

/** The change status of an RHF form, else of the `isDirty` prop, else none. */
const ChangeStatus = ({ control, isDirty }: { control: Control | undefined; isDirty: boolean | undefined }) => {
  if (control) return <DirtyStatus control={control} />;
  if (isDirty !== undefined) return <DirtyStatusLabel isDirty={isDirty} />;
  return null;
};

/** Measures `--nav-h` in px (0 without it): a hidden probe of that height. */
const useNavHeightProbe = () => {
  const probe = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const element = document.createElement('div');
    element.setAttribute('aria-hidden', 'true');
    element.style.cssText = 'position:fixed;top:0;left:0;width:0;height:var(--nav-h,0px);visibility:hidden;pointer-events:none';
    document.body.append(element);
    probe.current = element;
    return () => {
      element.remove();
      probe.current = null;
    };
  }, []);
  return useCallback(() => probe.current?.offsetHeight ?? 0, []);
};

interface FloatingBox {
  width: number;
  height: number;
  right: number;
}

interface SlotPillProps {
  children: ReactNode;
  pillRef: Ref<HTMLDivElement>;
  /** The actions' anchor in the form: the pill floats only while the form is still in view. */
  anchorRef: RefObject<HTMLSpanElement | null>;
}

/**
 * The pill in a header slot: in the header while it is in view; once the header scrolls under the top bar
 * (`--nav-h`), fixed under the bar at the slot's right edge while the form is still in view, the slot keeping its size
 * so the header does not move.
 */
const SlotPill = ({ children, pillRef, anchorRef }: SlotPillProps) => {
  const holder = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLDivElement | null>(null);
  const [floating, setFloating] = useState<FloatingBox | null>(null);
  const navHeight = useNavHeightProbe();

  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const holderElement = holder.current;
      const pillElement = pill.current;
      if (!holderElement || !pillElement) return;
      const box = holderElement.getBoundingClientRect();
      // the pill's own top offset under the bar: 0.5rem, as the sticky pill on pages
      const gap = parseFloat(getComputedStyle(document.documentElement).fontSize || '16') * 0.5;
      const top = navHeight() + gap;
      const formElement = anchorRef.current?.closest('form') ?? anchorRef.current?.parentElement ?? null;
      const formBottom = formElement ? formElement.getBoundingClientRect().bottom : Number.POSITIVE_INFINITY;
      const shouldFloat = box.top < top && formBottom > top + pillElement.offsetHeight;
      setFloating(current => {
        if (!shouldFloat) return null;
        const size = current ?? { width: pillElement.offsetWidth, height: pillElement.offsetHeight, right: 0 };
        const right = Math.max(0, document.documentElement.clientWidth - box.right);
        return current && current.right === right ? current : { ...size, right };
      });
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [navHeight, anchorRef]);

  const setPill = useCallback(
    (element: HTMLDivElement | null) => {
      pill.current = element;
      if (typeof pillRef === 'function') pillRef(element);
      else if (pillRef) pillRef.current = element;
    },
    [pillRef]
  );

  return (
    <div
      ref={holder}
      data-form-actions={FORM_ACTIONS_MARKER}
      data-form-actions-placement="header"
      style={floating ? { width: floating.width, height: floating.height } : undefined}
    >
      <div
        ref={setPill}
        data-form-actions-floating={floating ? '' : undefined}
        className={cn(STICKY_PILL_CLASS, 'max-sm:w-auto', floating && 'fixed top-[calc(var(--nav-h)+0.5rem)] z-(--layer-sticky)')}
        style={floating ? { right: floating.right } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * A form's Save / Cancel actions — the one standard of every entity create / edit screen. On a page: a glass pill at
 * the top right of the form, sticky under the header, with the change status ("Unsaved changes" / "No changes", from
 * the surrounding RHF form), tertiary, secondary (Cancel) and the primary next to each other, primary last; in a
 * header slot (`placement`) the same pill in the header. Inside a `FormDrawer` the buttons move into the drawer's
 * pinned footer; inside another dialog, and with `sticky={false}`, a plain row. ⌘S / Ctrl+S submits
 * (`useSaveShortcut`: in a dialog or drawer anywhere inside it; on a page with focus in the form, on the actions or
 * nowhere).
 */
export const FormActions = ({
  primary,
  secondary,
  tertiary,
  sticky,
  placement = 'auto',
  isDirty,
  className,
}: FormActionsProps) => {
  const formContext = useFormContext();
  const isInDrawer = useIsInDrawer();
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [anchor, setAnchorState] = useState<HTMLSpanElement | null>(null);
  const [isInDialog, setIsInDialog] = useState(false);
  const setAnchor = useCallback((element: HTMLSpanElement | null) => {
    anchorRef.current = element;
    setAnchorState(element);
  }, []);

  useLayoutEffect(() => {
    setIsInDialog(anchor?.closest(SAVE_SHORTCUT_CONTAINER_SELECTOR) != null);
  }, [anchor]);

  useSaveShortcut(() => ({ form: anchorRef.current?.closest('form') ?? null, actions: actionsRef.current }));

  const slotElement = useFormActionsSlotFor(placement === 'row' ? null : anchor);
  const status = <ChangeStatus control={formContext?.control} isDirty={isDirty} />;

  if (isInDrawer) {
    // The drawer's pinned footer: the change status left, the buttons right, primary last.
    return (
      <DrawerFooterView anchorRef={setAnchor} inlineClassName={cn('pt-6', className)}>
        <div ref={actionsRef} className="flex flex-wrap-reverse items-center gap-2">
          {(formContext || isDirty !== undefined) && <div className="mr-auto">{status}</div>}
          {tertiary && <div className={ACTION_CLASS}>{tertiary}</div>}
          {secondary && <div className={ACTION_CLASS}>{secondary}</div>}
          {primary && <div className={ACTION_CLASS}>{primary}</div>}
        </div>
      </DrawerFooterView>
    );
  }

  if (sticky === false || (sticky === undefined && isInDialog)) {
    return (
      <DrawerFooterView anchorRef={setAnchor} inlineClassName={cn('pt-6', className)}>
        <div ref={actionsRef} className="flex flex-wrap-reverse items-center gap-2">
          {secondary && <div className={ACTION_CLASS}>{secondary}</div>}
          {tertiary && <div className={ACTION_CLASS}>{tertiary}</div>}
          {primary && <div className={cn(ACTION_CLASS, 'sm:ml-auto')}>{primary}</div>}
        </div>
      </DrawerFooterView>
    );
  }

  const buttons = (
    <>
      {status}
      {tertiary && <div className={ACTION_CLASS}>{tertiary}</div>}
      {secondary && <div className={ACTION_CLASS}>{secondary}</div>}
      {primary && <div className={ACTION_CLASS}>{primary}</div>}
    </>
  );

  if (slotElement) {
    return (
      <DrawerFooterView anchorRef={setAnchor} portalInto={slotElement} className={className}>
        <SlotPill pillRef={actionsRef} anchorRef={anchorRef}>
          {buttons}
        </SlotPill>
      </DrawerFooterView>
    );
  }

  return (
    <DrawerFooterView
      anchorRef={setAnchor}
      inlineClassName={cn(STICKY_WRAPPER_CLASS, placement !== 'row' && BESIDE_TABS_CLASS, className)}
      inlineProps={{ 'data-form-actions': FORM_ACTIONS_MARKER }}
    >
      <div ref={actionsRef} className={STICKY_PILL_CLASS}>
        {buttons}
      </div>
    </DrawerFooterView>
  );
};
