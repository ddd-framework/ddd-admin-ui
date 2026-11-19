'use client';

import type { ChangeHistory } from '@mgamadeus/ddd-web/contract';
import { XIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button, Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../primitives/index.ts';
import { isInlineDescription } from '../primitives/descriptionContent.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityMetadata } from '../page/EntityMetadata.tsx';
import { type DrawerFooterSlot, DrawerFooterSlotContext, DrawerSurfaceContext } from './drawerSlots.ts';
import { useConfirmDialog } from './useConfirmDialog.tsx';
import { type ConfirmFn, UnsavedChangesContext, useUnsavedChangesBoundary } from '../logic/react/useUnsavedChangesGuard.ts';
import { BREAKPOINT_QUERIES, useMediaQuery } from '../logic/react/useMediaQuery.ts';

export interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Text or block content: a string or number renders in a `<p>`, anything else in a `<div>`. */
  description?: ReactNode;
  /**
   * The entity's ID / Created / Updated, one compact line under the title (`EntityMetadata variant="inline"`); nothing
   * renders without an id (create).
   */
  metadata?: { id: number | string | null | undefined; changeHistory?: ChangeHistory | null };
  /**
   * Entity actions at the right end of the header (outline `sm` buttons, e.g. "Open as …", "Reset password"): never
   * the save — that stays in the form's `FormActions` footer.
   */
  headerActions?: ReactNode;
  /**
   * The host's confirmation service for "Discard changes?" (resolves `true` to close). Default: the package dialog
   * (`useConfirmDialog`). Pass a stable function; its dialog must use the same Radix copy as the drawer.
   */
  confirm?: ConfirmFn;
  /**
   * `false`: side by side with the page from `nonModalFrom` up (master-detail: picking another row swaps the drawer's
   * content): no overlay, the page stays clickable and scrollable, a click outside never closes it; Esc and the ✕ still
   * ask before discarding. Below that width (and before hydration) it is the modal drawer. Default `true`.
   */
  modal?: boolean;
  /** From which width `modal={false}` applies (default `md`; `always` at every width). */
  nonModalFrom?: 'md' | 'lg' | 'always';
  /** Classes of the panel while it is side by side (default width: up to 460 px from `sm`). */
  nonModalClassName?: string;
  children: ReactNode;
}

/**
 * Right-side drawer for an entity form: sticky header with the
 * ✕ in the corner, a scrolling body, and a footer pinned below it that the form's `FormActions` move into. Esc, an
 * overlay click or the ✕ ask "Discard changes?" when a form inside reported unsaved changes
 * (`useUnsavedChangesGuard`); the form's own close after a save is never asked about.
 */
export const FormDrawer = ({
  open,
  onClose,
  title,
  description,
  metadata,
  headerActions,
  confirm: hostConfirm,
  modal = true,
  nonModalFrom = 'md',
  nonModalClassName,
  children,
}: FormDrawerProps) => {
  const { t } = useTranslate();
  const wideEnough = useMediaQuery(nonModalFrom === 'always' ? 'all' : BREAKPOINT_QUERIES[nonModalFrom]);
  const sideBySide = !modal && wideEnough;
  const hasMetadata = metadata !== undefined && metadata.id !== null && metadata.id !== undefined && metadata.id !== '';
  const packageConfirm = useConfirmDialog();
  const { registry, guardClose } = useUnsavedChangesBoundary(hostConfirm ?? packageConfirm.confirm);
  const [bodyElement, setBodyElement] = useState<HTMLElement | null>(null);
  const [footerElement, setFooterElement] = useState<HTMLElement | null>(null);
  const slot = useMemo<DrawerFooterSlot | null>(
    () => (bodyElement && footerElement ? { bodyElement, footerElement } : null),
    [bodyElement, footerElement]
  );

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={isOpen => {
          if (!isOpen) void guardClose(onClose);
        }}
        {...(sideBySide ? { modal: false } : {})}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayKind="drawer"
          className={
            sideBySide
              ? cn('flex w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-[460px]', nonModalClassName)
              : 'flex w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-[760px]'
          }
          // Radix warns about a missing description; the title alone names the drawer.
          {...(description ? {} : { 'aria-describedby': undefined })}
          // side by side: the page beside it stays usable, so neither a click nor the focus outside closes it
          {...(sideBySide ? { onInteractOutside: (event: Event) => event.preventDefault(), 'data-drawer-mode': 'side-by-side' } : {})}
        >
          <SheetHeader className="flex shrink-0 flex-row items-start gap-3 space-y-0 border-b p-6 text-left">
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label={t('Close', { context: 'drawer-close-button' })}
                data-agent-skip=""
              >
                <XIcon />
              </Button>
            </SheetClose>
            <div
              className={cn(
                'flex min-w-0 flex-1 flex-col gap-0.5',
                description || hasMetadata ? '-mt-0.5' : 'mt-1.5'
              )}
            >
              <SheetTitle className="truncate text-base leading-5 font-semibold">{title}</SheetTitle>
              {description &&
                (isInlineDescription(description) ? (
                  <SheetDescription className="text-xs leading-4">{description}</SheetDescription>
                ) : (
                  <SheetDescription className="text-xs leading-4" asChild>
                    <div>{description}</div>
                  </SheetDescription>
                ))}
              {hasMetadata && (
                <EntityMetadata variant="inline" id={metadata?.id} changeHistory={metadata?.changeHistory} />
              )}
            </div>
            {headerActions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{headerActions}</div>}
          </SheetHeader>
          <div ref={setBodyElement} className="flex-1 overflow-y-auto px-6 py-6">
            <DrawerSurfaceContext.Provider value={true}>
              <DrawerFooterSlotContext.Provider value={slot}>
                <UnsavedChangesContext.Provider value={registry}>{children}</UnsavedChangesContext.Provider>
              </DrawerFooterSlotContext.Provider>
            </DrawerSurfaceContext.Provider>
          </div>
          <div
            ref={setFooterElement}
            className="shrink-0 border-t bg-card px-6 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] empty:hidden"
          />
        </SheetContent>
      </Sheet>
      {hostConfirm ? null : packageConfirm.dialog}
    </>
  );
};
