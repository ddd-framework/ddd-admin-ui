'use client';

import { Fragment, type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { Button } from './button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog.tsx';
import { isInlineDescription } from './descriptionContent.ts';
import { Input } from './input.tsx';
import { Label } from './label.tsx';

/** What the confirmation shows; the same shape as `ConfirmOptions` of `./logic` (primitives import no logic). */
export interface ConfirmDialogViewOptions {
  title: string;
  /** Text or block content: a string or number renders in a `<p>`, anything else in a `<div>`. */
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  requirePhrase?: string;
  requirePhraseLabel?: string;
}

export interface ConfirmDialogViewEntry {
  id: number;
  options: ConfirmDialogViewOptions;
}

export interface ConfirmDialogViewProps {
  /** The confirmation to show; `null` closes the dialog. A new id with the dialog open shows the next one in place. */
  entry: ConfirmDialogViewEntry | null;
  /** Called once per user answer: confirm → `true`; cancel, Escape, the backdrop → `false`. */
  onSettle: (id: number, confirmed: boolean) => void;
}

const phraseMatches = (phrase: string | undefined, typed: string) => phrase === undefined || typed.trim() === phrase.trim();

interface ConfirmBodyProps {
  entry: ConfirmDialogViewEntry;
  /** Moves the focus to the first control on mount (a queued confirmation shown in an open dialog). */
  focusOnMount: boolean;
  answer: (confirmed: boolean) => void;
}

const ConfirmBody = ({ entry, focusOnMount, answer }: ConfirmBodyProps) => {
  const { t } = useTranslate();
  const { options } = entry;
  const phraseId = useId();
  const [typed, setTyped] = useState('');
  const firstControl = useRef<HTMLElement | null>(null);
  const unlocked = phraseMatches(options.requirePhrase, typed);

  useEffect(() => {
    if (focusOnMount) firstControl.current?.focus();
  }, [focusOnMount]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{options.title}</DialogTitle>
        {options.description &&
          (isInlineDescription(options.description) ? (
            <DialogDescription>{options.description}</DialogDescription>
          ) : (
            <DialogDescription asChild>
              <div>{options.description}</div>
            </DialogDescription>
          ))}
      </DialogHeader>
      {options.requirePhrase !== undefined && (
        <div className="grid gap-2" data-confirm-phrase="">
          <Label htmlFor={phraseId}>
            {options.requirePhraseLabel ?? t('Type “%phrase%” to confirm', { replacements: { phrase: options.requirePhrase } })}
          </Label>
          <Input
            id={phraseId}
            ref={element => {
              firstControl.current = element;
            }}
            value={typed}
            autoComplete="off"
            spellCheck={false}
            onChange={event => setTyped(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (unlocked) answer(true);
              }
            }}
          />
        </div>
      )}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          ref={element => {
            if (options.requirePhrase === undefined) firstControl.current = element;
          }}
          onClick={() => answer(false)}
        >
          {options.cancelLabel ?? t('Cancel', { context: 'confirm-dialog' })}
        </Button>
        <Button
          type="button"
          variant={options.confirmVariant === 'destructive' ? 'destructive' : 'default'}
          disabled={!unlocked}
          onClick={() => answer(true)}
        >
          {options.confirmLabel ?? t('Confirm', { context: 'confirm-dialog' })}
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * The package's confirmation dialog, drawn by `useConfirmDialog` (`./form`) and by `AdminUiProvider` for `useConfirm`.
 * Keeps the last confirmation on screen while the dialog closes, and returns the focus to the element that had it when
 * the dialog opened (it opens without a Radix trigger). A confirmation opened while the previous one still animates
 * out starts a fresh dialog.
 */
export const ConfirmDialogView = ({ entry, onSettle }: ConfirmDialogViewProps) => {
  const lastEntry = useRef<ConfirmDialogViewEntry | null>(null);
  const openedWith = useRef<number | null>(null);
  const session = useRef(0);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (entry) lastEntry.current = entry;
  if (!entry) openedWith.current = null;
  else if (openedWith.current === null) {
    openedWith.current = entry.id;
    session.current += 1;
    returnFocus.current = typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  const shown = entry ?? lastEntry.current;
  // this session's element: a dialog cut short by the next session still returns the focus it took
  const focusTarget = returnFocus.current;

  return (
    <Dialog key={session.current} open={entry !== null} onOpenChange={open => !open && entry && onSettle(entry.id, false)}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (focusTarget?.isConnected) focusTarget.focus();
        }}
      >
        {shown && (
          <Fragment key={shown.id}>
            <ConfirmBody
              entry={shown}
              focusOnMount={entry !== null && shown.id !== openedWith.current}
              answer={confirmed => entry && onSettle(entry.id, confirmed)}
            />
          </Fragment>
        )}
      </DialogContent>
    </Dialog>
  );
};
