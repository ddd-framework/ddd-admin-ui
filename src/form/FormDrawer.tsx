'use client';

import type { ChangeHistory } from '@mgamadeus/ddd-web/contract';
import { XIcon } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { Button, Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityMetadata } from '../page/EntityMetadata.tsx';
import { type DrawerFooterSlot, DrawerFooterSlotContext, DrawerSurfaceContext } from './drawerSlots.ts';
import { useConfirmDialog } from './useConfirmDialog.tsx';
import { type ConfirmFn, UnsavedChangesContext, useUnsavedChangesBoundary } from '../logic/react/useUnsavedChangesGuard.ts';

export interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
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
  children,
}: FormDrawerProps) => {
  const { t } = useTranslate();
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
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="flex w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-[760px]"
          // Radix warns about a missing description; the title alone names the drawer.
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <SheetHeader className="flex shrink-0 flex-row items-start gap-3 space-y-0 border-b p-6 text-left">
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="shrink-0" aria-label={t('Close', { context: 'drawer-close-button' })}>
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
              {description && <SheetDescription className="text-xs leading-4">{description}</SheetDescription>}
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
