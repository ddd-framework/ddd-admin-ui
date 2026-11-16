'use client';

import { Check, Copy } from 'lucide-react';
import type { MouseEvent } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { notify } from '../logic/pure/notify.ts';
import { useCopyToClipboard } from '../logic/react/useCopyToClipboard.ts';
import { cn } from '../primitives/cn.ts';

export interface CopyButtonProps {
  /** The text written to the clipboard. */
  value: string;
  /** Accessible name and tooltip (`Copy link`); an English UI text, translated by the button. */
  label: string;
  /**
   * `always` (default): always visible. `hover`: shown while the pointer is over the row (`group/row`) or a `group`
   * ancestor, and on keyboard focus — for a copy next to a value in a table or a definition list.
   */
  reveal?: 'hover' | 'always';
  /**
   * A toast after copying (through `notify`): `true` for "Copied", a text for your own message. A refused copy then
   * toasts "Could not copy". Absent: the icon turns into a check, no toast.
   */
  notify?: boolean | string;
  className?: string;
}

/**
 * An icon button that copies a value (`useCopyToClipboard`): the copy icon turns into a check for a moment. Its click
 * never runs the row's action. Use it next to a value outside the ID column (an `IdCell` brings its own).
 */
export const CopyButton = ({ value, label, reveal = 'always', notify: toast, className }: CopyButtonProps) => {
  const { t } = useTranslate();
  const { copy, copied } = useCopyToClipboard();
  const name = t(label);

  const handleCopy = async (event: MouseEvent) => {
    event.stopPropagation();
    const done = await copy(value);
    if (!toast) return;
    if (done) notify.success(typeof toast === 'string' ? t(toast) : t('Copied'));
    else notify.error(t('Could not copy'));
  };

  return (
    <button
      type="button"
      data-row-action-ignore
      onClick={handleCopy}
      aria-label={name}
      title={name}
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-tint hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        reveal === 'hover' && 'opacity-0 group-hover:opacity-100 group-hover/row:opacity-100',
        className
      )}
    >
      {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
    </button>
  );
};
