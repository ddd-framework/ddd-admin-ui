'use client';

import { CornerDownLeft, Folder, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Input } from '../primitives/input.tsx';
import { folderPathSuggestions } from './filePaths.ts';
import type { FolderView } from './fileView.ts';

export interface FilePathBarProps {
  /** The open location's path (`/a/b`), the bar's first text. */
  initialPath: string;
  /** The open area's folders, for the completion. */
  folders: readonly FolderView[];
  /**
   * Goes to the typed or pasted location (`/a/b`, `drive/123`, `/workspace/drive/…`); resolves with an error text
   * when it leads nowhere (the bar stays open and shows it), `null` when it went there (the bar closes).
   */
  onSubmit: (input: string) => Promise<string | null>;
  onCancel: () => void;
}

/**
 * The editable path of the file manager: type or paste a path, complete folder names (arrows, Tab), Enter goes there,
 * Escape returns to the crumbs. A location that does not exist keeps the bar open with the reason.
 */
export const FilePathBar = ({ initialPath, folders, onSubmit, onCancel }: FilePathBarProps) => {
  const { t } = useTranslate();
  const [value, setValue] = useState(initialPath === '/' ? '/' : `${initialPath}/`);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const errorId = useId();
  const suggestions = useMemo(() => folderPathSuggestions(folders, value), [folders, value]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const submit = async (input: string) => {
    setBusy(true);
    setError(null);
    try {
      const failure = await onSubmit(input);
      if (failure !== null) setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const accept = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return false;
    setValue(suggestion.path);
    setHighlighted(-1);
    setError(null);
    return true;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    } else if (event.key === 'ArrowDown' && suggestions.length > 0) {
      event.preventDefault();
      setHighlighted(current => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
      event.preventDefault();
      setHighlighted(current => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Tab' && !event.shiftKey && suggestions.length > 0) {
      event.preventDefault();
      accept(highlighted >= 0 ? highlighted : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (highlighted >= 0 && accept(highlighted)) return;
      void submit(value);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={event => {
            setValue(event.target.value);
            setHighlighted(-1);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={event => {
            // A click on a completion or the buttons keeps the bar; leaving it elsewhere returns to the crumbs.
            if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget as Node | null)) onCancel();
          }}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={highlighted >= 0 ? `${listId}-${highlighted}` : undefined}
          aria-autocomplete="list"
          aria-label={t('Path')}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          spellCheck={false}
          autoComplete="off"
          disabled={busy}
          className="h-8 font-mono text-[13px]"
          placeholder={t('/folder/subfolder or drive/123')}
        />
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Go to the path')} disabled={busy} onClick={() => void submit(value)}>
          <CornerDownLeft />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Cancel')} onClick={onCancel}>
          <X />
        </Button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
      {suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('Folders')}
          className="surface absolute top-9 left-0 z-(--layer-popover) max-h-64 w-full max-w-md overflow-y-auto rounded-xl p-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={String(suggestion.folder.id)}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === highlighted}
              tabIndex={-1}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                accept(index);
                inputRef.current?.focus();
              }}
              className={cn('flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px]', index === highlighted ? 'bg-accent' : 'hover:bg-muted')}
            >
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono">{suggestion.path}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
