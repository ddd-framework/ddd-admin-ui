'use client';

import { useCallback, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import type { ConfirmDialogApi, ConfirmOptions } from '../logic/pure/confirm.ts';

/** @deprecated moved to logic/pure/confirm — the re-export is removed in a later minor */
export type { ConfirmDialogApi, ConfirmOptions } from '../logic/pure/confirm.ts';

/**
 * A promise-returning confirmation, as a hook: this block has no global modal host. Dialogs are only for
 * confirmations.
 */
export const useConfirmDialog = (): ConfirmDialogApi => {
  const { t } = useTranslate();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolverRef.current?.(false);
    setOptions(next);
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const dialog = (
    <Dialog open={options !== null} onOpenChange={open => !open && settle(false)}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{options?.title}</DialogTitle>
          {options?.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => settle(false)}>
            {options?.cancelLabel ?? t('Cancel', { context: 'confirm-dialog' })}
          </Button>
          <Button
            type="button"
            variant={options?.confirmVariant === 'destructive' ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? t('Confirm', { context: 'confirm-dialog' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, dialog };
};
