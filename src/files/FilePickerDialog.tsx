'use client';

import type { ReactNode } from 'react';

import { isInlineDescription } from '../primitives/descriptionContent.ts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { FilePicker, type FilePickerProps } from './FilePicker.tsx';

export interface FilePickerDialogProps extends Omit<FilePickerProps, 'onCancel' | 'className'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Text or block content: a string or number renders in a `<p>`, anything else in a `<div>`. */
  description?: ReactNode;
}

/**
 * `FilePicker` in a dialog: pick one or several files of an adapter (a drive picture for a picture field, files to
 * copy elsewhere). The dialog does not close by itself on confirm; the host closes it when its work is done.
 */
export const FilePickerDialog = ({ open, onOpenChange, title, description, ...pickerProps }: FilePickerDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex h-[min(90dvh,860px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-5xl">
      <DialogHeader className="shrink-0 border-b px-6 py-4">
        <DialogTitle>{title}</DialogTitle>
        {description &&
          (isInlineDescription(description) ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription asChild>
              <div>{description}</div>
            </DialogDescription>
          ))}
      </DialogHeader>
      {open && <FilePicker {...pickerProps} onCancel={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>
);
