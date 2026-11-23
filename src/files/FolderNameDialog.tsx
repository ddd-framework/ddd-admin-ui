'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { type FormEvent, useId, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Input } from '../primitives/input.tsx';
import { Label } from '../primitives/label.tsx';

/** Folder names: at most 120 characters by default; the server sanitises and checks uniqueness. */
export const MAX_FOLDER_NAME_LENGTH = 120;

export interface FolderNameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'rename';
  initialName?: string;
  /** Where the folder goes (`in “Reports”`). */
  parentLabel: string;
  writesAllowed: boolean;
  /** Default 120. */
  maxNameLength?: number;
  /** Creates / renames; rejects with the request error (shown in the dialog, the dialog stays open). */
  onSubmit: (name: string) => Promise<unknown>;
}

const FolderNameForm = ({
  mode,
  initialName = '',
  parentLabel,
  writesAllowed,
  maxNameLength = MAX_FOLDER_NAME_LENGTH,
  onSubmit,
  onOpenChange,
}: Omit<FolderNameDialogProps, 'open'>) => {
  const { t } = useTranslate();
  const inputId = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();
  const tooLong = trimmed.length > maxNameLength;
  const unchanged = mode === 'rename' && trimmed === initialName.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || tooLong || unchanged || !writesAllowed) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } catch (submitError) {
      setError(normalizeDddError(submitError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? t('New folder') : t('Rename folder')}</DialogTitle>
        <DialogDescription>{mode === 'create' ? t('The folder is created %location%.', { replacements: { location: parentLabel } }) : parentLabel}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-2">
        <Label htmlFor={inputId}>{t('Name', { context: 'folder-name' })}</Label>
        <Input
          id={inputId}
          value={name}
          onChange={event => setName(event.target.value)}
          maxLength={maxNameLength + 20}
          autoFocus
          aria-invalid={tooLong || error !== null}
          aria-describedby={error || tooLong ? `${inputId}-error` : undefined}
          placeholder={t('e.g. Reports 2026')}
        />
        {(error || tooLong) && (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {tooLong ? t('At most %max% characters.', { replacements: { max: maxNameLength } }) : error}
          </p>
        )}
      </div>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t('Cancel')}
        </Button>
        <Button type="submit" disabled={!writesAllowed || saving || !trimmed || tooLong || unchanged}>
          {saving ? (mode === 'create' ? t('Creating…') : t('Saving…')) : mode === 'create' ? t('Create folder') : t('Save')}
        </Button>
      </DialogFooter>
    </form>
  );
};

/** Create or rename a folder: one name field; the server's refusal (duplicate, depth) shows in the dialog. */
export const FolderNameDialog = ({ open, onOpenChange, ...props }: FolderNameDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      {open && <FolderNameForm {...props} onOpenChange={onOpenChange} />}
    </DialogContent>
  </Dialog>
);
