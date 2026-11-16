'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { type Control, useFormContext } from 'react-hook-form';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { DrawerFooter } from './DrawerFooter.tsx';
import { useIsInDrawer } from './drawerSlots.ts';
import { useFormDirty } from '../logic/react/useFormDirty.ts';

export interface FormActionsProps {
  primary?: ReactNode;
  secondary?: ReactNode;
  tertiary?: ReactNode;
  /**
   * On a page: the glass action pill at the top right of the form, sticky under the header (default);
   * `false` keeps a plain row (a dialog). Ignored in a drawer: its pinned footer gets the plain row with
   * the change status.
   */
  sticky?: boolean;
  /**
   * Where the sticky pill sits from `md` up: `auto` (default) moves it up beside the tabs when the page has an
   * `EntityTabs` row (`data-entity-tabs`) and keeps a row of its own on pages without tabs (create pages, plain details),
   * where it would otherwise cover the page header; `row` always keeps its own row (a tab row too wide to share).
   */
  placement?: 'auto' | 'row';
  /**
   * The change status for a form without react-hook-form (state-based forms): shows "Unsaved changes" / "No changes"
   * like an RHF form does. Ignored inside an RHF form (its own dirty state wins). ⌘S works in either case as long as
   * the actions sit inside a `<form>` with a `type="submit"` primary.
   */
  isDirty?: boolean;
  /** Applies where the actions are written; dropped once they move into a drawer's footer. */
  className?: string;
}

/** Below `sm` the buttons share the row; from `sm` up each keeps its own width. */
const ACTION_CLASS = 'flex-1 min-w-fit *:w-full sm:flex-none sm:*:w-auto';

/**
 * The page action pill (host CSS `.glass-bar`): compact, right-aligned at the top of the form and sticky under the
 * fixed chrome (`--nav-h`) while the form scrolls. Forms write `<FormActions>` last; `data-form-actions` + the host
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

/** ⌘S / Ctrl+S inside the form submits it (the primary is `type="submit"`, so the form's own validation runs). */
const useSaveShortcut = (anchor: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const form = anchor.current?.closest('form');
    if (!form) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 's' || !(event.metaKey || event.ctrlKey) || event.altKey) return;
      event.preventDefault();
      // In a drawer the buttons sit in the portalled footer, linked back to the form by its `form` attribute.
      const submit =
        form.querySelector<HTMLButtonElement>('button[type="submit"]') ??
        (form.id ? document.querySelector<HTMLButtonElement>(`button[type="submit"][form="${CSS.escape(form.id)}"]`) : null);
      if (submit && !submit.disabled) form.requestSubmit(submit);
    };
    form.addEventListener('keydown', onKeyDown);
    return () => form.removeEventListener('keydown', onKeyDown);
  }, [anchor]);
};

/**
 * A form's Save / Cancel actions — the one standard of every entity create / edit screen. On a
 * page: a glass pill at the top right of the form, sticky under the header, with the change status ("Unsaved
 * changes" / "No changes", from the surrounding RHF form), tertiary, secondary (Cancel) and the primary next to each
 * other, primary last; ⌘S / Ctrl+S submits. Inside a `FormDrawer` the buttons move into the drawer's pinned footer;
 * `sticky={false}` is a plain row.
 */
export const FormActions = ({
  primary,
  secondary,
  tertiary,
  sticky = true,
  placement = 'auto',
  isDirty,
  className,
}: FormActionsProps) => {
  const formContext = useFormContext();
  const isInDrawer = useIsInDrawer();
  const anchor = useRef<HTMLDivElement>(null);
  useSaveShortcut(anchor);

  if (isInDrawer) {
    // The drawer's pinned footer: the change status left, the buttons right, primary last.
    return (
      <DrawerFooter inlineClassName={cn('pt-6', className)}>
        <div ref={anchor} className="flex flex-wrap-reverse items-center gap-2">
          {(formContext || isDirty !== undefined) && (
            <div className="mr-auto">
              <ChangeStatus control={formContext?.control} isDirty={isDirty} />
            </div>
          )}
          {tertiary && <div className={ACTION_CLASS}>{tertiary}</div>}
          {secondary && <div className={ACTION_CLASS}>{secondary}</div>}
          {primary && <div className={ACTION_CLASS}>{primary}</div>}
        </div>
      </DrawerFooter>
    );
  }

  if (!sticky) {
    return (
      <DrawerFooter inlineClassName={cn('pt-6', className)}>
        <div ref={anchor} className="flex flex-wrap-reverse items-center gap-2">
          {secondary && <div className={ACTION_CLASS}>{secondary}</div>}
          {tertiary && <div className={ACTION_CLASS}>{tertiary}</div>}
          {primary && <div className={cn(ACTION_CLASS, 'sm:ml-auto')}>{primary}</div>}
        </div>
      </DrawerFooter>
    );
  }

  return (
    <DrawerFooter
      inlineClassName={cn(STICKY_WRAPPER_CLASS, placement === 'auto' && BESIDE_TABS_CLASS, className)}
      inlineProps={{ 'data-form-actions': '' }}
    >
      <div ref={anchor} className={STICKY_PILL_CLASS}>
        <ChangeStatus control={formContext?.control} isDirty={isDirty} />
        {tertiary && <div className={ACTION_CLASS}>{tertiary}</div>}
        {secondary && <div className={ACTION_CLASS}>{secondary}</div>}
        {primary && <div className={ACTION_CLASS}>{primary}</div>}
      </div>
    </DrawerFooter>
  );
};
