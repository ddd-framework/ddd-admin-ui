'use client';

import { type FormEvent, type ReactNode, useContext, useRef, useState } from 'react';
import { type FieldValues, FormProvider, type SubmitHandler, type UseFormReturn } from 'react-hook-form';

import { useTranslate } from '../i18n/index.ts';
import { ConfirmContext } from '../logic/react/useConfirm.ts';
import { UnsavedChangesContext, useDiscardChangesConfirm } from '../logic/react/useUnsavedChangesGuard.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import { DrawerFooterSlotContext, DrawerSurfaceContext } from './drawerSlots.ts';
import { type FormFieldLabels, FormFieldLabelsContext } from './fieldLabels.ts';
import { useSaveShortcut } from './saveShortcut.ts';
import { useConfirmDialog } from './useConfirmDialog.tsx';

interface FormDialogBaseProps {
  open: boolean;
  /** `false` for a close request the dialog accepted (Escape, backdrop, Cancel; never while pending). */
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** The fields; with `form`, `FormField` and the other bound fields work inside. */
  children: ReactNode;
  /** The submit button's label (`Save`, `Create project`, `Delete`), already translated. */
  submitLabel: ReactNode;
  /** The submit button's label while pending (`Saving…`). */
  pendingLabel?: ReactNode;
  /** The Cancel button's label; default "Cancel". */
  cancelLabel?: ReactNode;
  /**
   * The save runs (a mutation's pending state): the submit button is disabled and relabelled, Cancel is disabled, and
   * every close request is ignored. A promise returned by `onSubmit` counts as pending too, until it settles.
   */
  isPending: boolean;
  /** Unsaved changes: a close request asks "Discard changes?" first (the provider's `useConfirm`, else its own dialog). */
  isDirty?: boolean;
  /** The submit button is off (nothing to save yet, a blocker of the screen). */
  submitDisabled?: boolean;
  /** `destructive` for a dialog whose submit cannot be undone. */
  submitVariant?: 'default' | 'destructive';
  /** A submit that only reads: not disabled by `WriteAccessProvider`. */
  ignoreWriteAccess?: boolean;
  /** Classes of the dialog content (width: `sm:max-w-xl`). */
  className?: string;
}

export type FormDialogProps<TFieldValues extends FieldValues = FieldValues, TTransformed = TFieldValues> = FormDialogBaseProps &
  (
    | {
        /** A react-hook-form instance: the dialog provides it, validates through it and passes the parsed values. */
        form: UseFormReturn<TFieldValues, unknown, TTransformed>;
        onSubmit: SubmitHandler<TTransformed>;
      }
    | {
        form?: undefined;
        /** Called on submit (the default is prevented); read the values from state or `event.currentTarget`. */
        onSubmit: (event: FormEvent<HTMLFormElement>) => unknown;
      }
  );

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as { then?: unknown }).then === 'function';

/**
 * A form in a dialog, with or without a form library: title, description, the fields, Cancel and the submit button in
 * a real `<form>`, so Enter in a text field and ⌘S / Ctrl+S submit it. Close requests (Escape, backdrop, Cancel) are
 * ignored while pending; after a failed submit (the handler shows its error) the dialog is usable again. The caller
 * closes it after a successful save (`onOpenChange(false)` or its own state). A dialog opened from it is its own
 * form: its submit never reaches this one.
 */
export const FormDialog = <TFieldValues extends FieldValues = FieldValues, TTransformed = TFieldValues>(
  props: FormDialogProps<TFieldValues, TTransformed>
) => {
  const {
    open,
    onOpenChange,
    title,
    description,
    children,
    submitLabel,
    pendingLabel,
    cancelLabel,
    isPending,
    isDirty = false,
    submitDisabled = false,
    submitVariant = 'default',
    ignoreWriteAccess = false,
    className,
  } = props;
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const providerConfirm = useContext(ConfirmContext);
  const ownConfirm = useConfirmDialog();
  const confirm = providerConfirm ?? ownConfirm.confirm;
  const discardConfirm = useDiscardChangesConfirm();
  const [fieldLabels] = useState<FormFieldLabels>(() => new Map());
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const busy = isPending || submitting;
  // opened without a Radix trigger: the element that had the focus when it opened gets it back on close
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current && typeof document !== 'undefined') {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpen.current = open;
  const focusTarget = returnFocus.current;
  const writeBlocked = !ignoreWriteAccess && !writeAccess.allowed;

  useSaveShortcut(() => ({ form: open ? formRef.current : null, actions: footerRef.current }));

  const requestClose = async () => {
    if (busy) return;
    if (isDirty && !(await confirm(discardConfirm))) return;
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    // a form in a dialog opened from this one is portalled out of it, but React still bubbles its submit up here
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const result = props.form ? props.form.handleSubmit(props.onSubmit)(event) : props.onSubmit(event);
    if (!isPromiseLike(result)) return;
    setSubmitting(true);
    // a rejection stays unhandled (the error is the handler's to show); the dialog is usable again either way
    void Promise.resolve(result).finally(() => setSubmitting(false));
  };

  const body = (
    <form
      ref={formRef}
      noValidate={props.form !== undefined}
      onSubmit={handleSubmit}
      aria-busy={busy || undefined}
      className="grid gap-4"
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      {children}
      <DialogFooter ref={footerRef}>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void requestClose()}>
          {cancelLabel ?? t('Cancel', { context: 'form-dialog' })}
        </Button>
        <Button
          type="submit"
          variant={submitVariant === 'destructive' ? 'destructive' : 'default'}
          disabled={busy || submitDisabled || writeBlocked}
          title={writeBlocked ? writeAccess.reason : undefined}
        >
          {busy && pendingLabel ? pendingLabel : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={next => (next ? onOpenChange(true) : void requestClose())}>
        <DialogContent
          className={cn('sm:max-w-lg', className)}
          onEscapeKeyDown={event => busy && event.preventDefault()}
          onInteractOutside={event => busy && event.preventDefault()}
          onCloseAutoFocus={event => {
            event.preventDefault();
            if (focusTarget?.isConnected) focusTarget.focus();
          }}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          {/* a dialog opened from a drawer is no part of the drawer: no footer to move into, no drawer dirty state */}
          <DrawerSurfaceContext.Provider value={false}>
            <DrawerFooterSlotContext.Provider value={null}>
              <UnsavedChangesContext.Provider value={null}>
                <FormFieldLabelsContext.Provider value={fieldLabels}>
                  {props.form ? <FormProvider {...props.form}>{body}</FormProvider> : body}
                </FormFieldLabelsContext.Provider>
              </UnsavedChangesContext.Provider>
            </DrawerFooterSlotContext.Provider>
          </DrawerSurfaceContext.Provider>
        </DialogContent>
      </Dialog>
      {providerConfirm ? null : ownConfirm.dialog}
    </>
  );
};
