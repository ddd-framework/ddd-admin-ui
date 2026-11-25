'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { type FormEvent, useId, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Input } from '../primitives/input.tsx';
import { Label } from '../primitives/label.tsx';
import { type FileView, fileNameStem } from './fileView.ts';

/** File names: at most 255 characters including the extension (the rule of the details form). */
export const MAX_FILE_NAME_LENGTH = 255;

export interface FileNameDialogProps {
  /** The file to rename; null = closed. */
  file: Pick<FileView, 'id' | 'name' | 'extension'> | null;
  onOpenChange: (open: boolean) => void;
  writesAllowed: boolean;
  /** Renames to `name` (stem + the unchanged extension); rejects with the request error (shown, the dialog stays open). */
  onSubmit: (name: string) => Promise<unknown>;
}

const FileNameForm = ({ file, writesAllowed, onSubmit, onOpenChange }: Omit<FileNameDialogProps, 'file'> & { file: Pick<FileView, 'id' | 'name' | 'extension'> }) => {
  const { t } = useTranslate();
  const inputId = useId();
  const initialStem = fileNameStem(file.name, file.extension);
  const [stem, setStem] = useState(initialStem);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const trimmed = stem.trim();
  const maxStemLength = MAX_FILE_NAME_LENGTH - (file.extension ? file.extension.length + 1 : 0);
  const tooLong = trimmed.length > maxStemLength;
  const unchanged = trimmed === initialStem.trim();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || tooLong || unchanged || !writesAllowed) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(file.extension ? `${trimmed}.${file.extension}` : trimmed);
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
        <DialogTitle>{t('Rename file')}</DialogTitle>
        <DialogDescription>{file.name}</DialogDescription>
      </DialogHeader>
      <div className="mt-4 space-y-2">
        <Label htmlFor={inputId}>{t('Name', { context: 'file-name' })}</Label>
        <div className="flex items-stretch">
          <Input
            id={inputId}
            value={stem}
            onChange={event => setStem(event.target.value)}
            maxLength={MAX_FILE_NAME_LENGTH + 20}
            autoFocus
            aria-invalid={tooLong || error !== null}
            aria-describedby={error || tooLong ? `${inputId}-error` : undefined}
            className={file.extension ? 'rounded-r-none' : undefined}
          />
          {file.extension && (
            <span
              title={t('The extension cannot be changed. Upload the file again to change its type.')}
              className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-3 font-mono text-[13px] text-muted-foreground"
            >
              .{file.extension}
            </span>
          )}
        </div>
        {(error || tooLong) && (
          <p id={`${inputId}-error`} className="text-xs text-destructive">
            {tooLong
              ? file.extension
                ? t('At most %max% characters including .%extension%', { replacements: { max: MAX_FILE_NAME_LENGTH, extension: file.extension } })
                : t('At most %max% characters', { replacements: { max: MAX_FILE_NAME_LENGTH } })
              : error}
          </p>
        )}
      </div>
      <DialogFooter className="mt-6">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t('Cancel')}
        </Button>
        <Button type="submit" disabled={!writesAllowed || saving || !trimmed || tooLong || unchanged}>
          {saving ? t('Saving…') : t('Save')}
        </Button>
      </DialogFooter>
    </form>
  );
};

/**
 * Renames a file: one name field, the extension stays as it is; the server's refusal (a name that exists) shows in the
 * dialog. Where a manager has no details drawer (the compact variant), this is how a file gets another name.
 */
export const FileNameDialog = ({ file, onOpenChange, ...props }: FileNameDialogProps) => (
  <Dialog open={file !== null} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md" data-slot="file-name-dialog">
      {file !== null && <FileNameForm key={String(file.id)} file={file} {...props} onOpenChange={onOpenChange} />}
    </DialogContent>
  </Dialog>
);
