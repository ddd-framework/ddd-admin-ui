'use client';

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { useTranslate } from '../../i18n/useTranslate.ts';
import { type ConfirmOptions, DISCARD_CHANGES_CONFIRM } from '../pure/confirm.ts';
import { dirtyFormFieldNames } from '../pure/formValues.ts';
import { type DirtyForm, type DirtyFormEntry, describeDirtyForm, setDirtyFormEntry } from '../pure/navigationGuard.ts';

/**
 * The forms inside one dismissible container (a `FormDrawer`) report whether they hold unsaved changes, so the
 * container can ask before it closes. A registry, because a drawer can host more
 * than one form.
 */
export interface UnsavedChangesRegistry {
  /** `details` (0.3.10): the form's label and its dirty field names, for `getDirtyForms`. */
  setDirty: (id: string, isDirty: boolean, details?: DirtyFormDetails) => void;
  hasUnsavedChanges: () => boolean;
  /**
   * The dirty forms of this container with their changed fields (0.3.10). Optional for a host's own registry; the
   * package's (`useUnsavedChangesBoundary`) always has it.
   */
  getDirtyForms?: () => DirtyForm[];
}

/** What a form tells the registry beside its dirty flag. */
export interface DirtyFormDetails {
  /** The form's id in `getDirtyForms()` (default: the registration id). */
  formId?: string;
  label?: string;
  /** Read when someone asks, so the names are current. */
  getDirtyFieldNames?: () => readonly string[];
}

export const UnsavedChangesContext = createContext<UnsavedChangesRegistry | null>(null);

/** The discard confirmation with its texts translated (the dialog renders the given strings as they are). */
export const useDiscardChangesConfirm = (): ConfirmOptions => {
  const { t } = useTranslate();
  return useMemo(
    () => ({
      ...DISCARD_CHANGES_CONFIRM,
      title: t('Discard changes?'),
      description: t('You have unsaved changes. Closing now will lose them.'),
      confirmLabel: t('Discard', { context: 'unsaved-changes-confirm' }),
      cancelLabel: t('Keep editing'),
    }),
    [t]
  );
};

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/**
 * For the container: provide `registry` through `UnsavedChangesContext` and route every user dismissal through
 * `guardClose`. A programmatic close (after a save) calls the close function directly.
 */
export const useUnsavedChangesBoundary = (confirm: ConfirmFn) => {
  const dirtyForms = useRef(new Map<string, DirtyFormEntry>());
  const discardConfirm = useDiscardChangesConfirm();

  const registry = useMemo<UnsavedChangesRegistry>(
    () => ({
      setDirty: (id, isDirty, details) => {
        if (isDirty) dirtyForms.current.set(id, { ...details, formId: details?.formId ?? id });
        else dirtyForms.current.delete(id);
      },
      hasUnsavedChanges: () => dirtyForms.current.size > 0,
      getDirtyForms: () => [...dirtyForms.current.values()].map(describeDirtyForm),
    }),
    []
  );

  const guardClose = useCallback(
    async (close: () => void) => {
      if (registry.hasUnsavedChanges() && !(await confirm(discardConfirm))) return;
      close();
    },
    [registry, confirm, discardConfirm]
  );

  return { registry, guardClose };
};

/** Options of `useUnsavedChangesGuard` (0.3.10): how the form is listed by `getDirtyForms()` / `canNavigate()`. */
export interface UnsavedChangesGuardOptions<TFieldValues extends FieldValues = FieldValues, TTransformed = TFieldValues> {
  /** The form's id in the listing (default: a generated id, stable while mounted). */
  formId?: string;
  /** The form's name for a person (`Edit item`). */
  label?: string;
  /**
   * The react-hook-form instance: its changed fields are listed (compared like `useFormDirty`, read when someone
   * asks). Pass the same `ignore` paths as to `useFormDirty` in `ignore`.
   */
  form?: Pick<UseFormReturn<TFieldValues, unknown, TTransformed>, 'control' | 'getValues'>;
  /** Paths left out of the field names (the `ignore` of `useFormDirty`). */
  ignore?: readonly string[];
  /** The changed fields of a form without react-hook-form (a list, or a function read when someone asks). */
  dirtyFieldNames?: readonly string[] | (() => readonly string[]);
}

/**
 * For a form: reports `isDirty` to the nearest container and to the page's navigation guard (`useNavigationGuard`),
 * warns before a reload or tab close while dirty, and returns `confirmDiscard` for the form's own Cancel:
 * `onClick={async () => (await confirmDiscard()) && onClose()}`. `options` names the form and its changed fields in
 * `getDirtyForms()`; without it the form is listed with a generated id and no field names.
 */
export const useUnsavedChangesGuard = <TFieldValues extends FieldValues = FieldValues, TTransformed = TFieldValues>(
  isDirty: boolean,
  confirm: ConfirmFn,
  options: UnsavedChangesGuardOptions<TFieldValues, TTransformed> = {}
) => {
  const registry = useContext(UnsavedChangesContext);
  const id = useId();
  const discardConfirm = useDiscardChangesConfirm();
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  // the latest options, read when someone asks for the field names (no re-registration on every render)
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { formId, label } = options;

  useEffect(() => {
    const getDirtyFieldNames = (): readonly string[] => {
      const { form, ignore = [], dirtyFieldNames } = optionsRef.current;
      if (dirtyFieldNames !== undefined) return typeof dirtyFieldNames === 'function' ? dirtyFieldNames() : dirtyFieldNames;
      if (form) return dirtyFormFieldNames(form.getValues(), form.control._defaultValues, ignore);
      return [];
    };
    const details: DirtyFormDetails = { formId: formId ?? id, label, getDirtyFieldNames };
    registry?.setDirty(id, isDirty, details);
    setDirtyFormEntry(id, isDirty ? { formId: details.formId ?? id, label, getDirtyFieldNames } : null);
    return () => {
      registry?.setDirty(id, false);
      setDirtyFormEntry(id, null);
    };
  }, [registry, id, isDirty, formId, label]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const confirmDiscard = useCallback(
    () => (isDirtyRef.current ? confirm(discardConfirm) : Promise.resolve(true)),
    [confirm, discardConfirm]
  );

  return { confirmDiscard };
};
