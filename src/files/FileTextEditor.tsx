'use client';

import { useEffect, useId, useState } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { FIELD_FOCUS_CLASS, FIELD_RADIUS_CLASS, FIELD_SURFACE_CLASS } from '../primitives/fieldSurface.ts';
import { SegmentedControl, type SegmentedControlOption } from '../primitives/segmented-control.tsx';
import { FILE_TEXT_EDIT_MAX_BYTES, type FileTextDraftSource, fileTextDraftSourceOf, fileTextForSaving } from './fileTextEditing.ts';
import type { MarkdownFileRenderer } from './MarkdownFilePreview.tsx';
import { TextPreviewSkeleton } from './TextPreview.tsx';
import { useTextHead } from './useTextHead.ts';

type EditorView = 'edit' | 'preview';

const EDITOR_VIEW_OPTIONS: readonly SegmentedControlOption<EditorView>[] = [
  { value: 'edit', label: m('Edit', { context: 'markdown-view' }), context: 'markdown-view' },
  { value: 'preview', label: m('Preview', { context: 'markdown-view' }), context: 'markdown-view' },
];

export interface FileTextEditorProps {
  /** The content of the version the edit starts from (read once, up to 1 MB). */
  url: string;
  fileName: string;
  /** Draws the draft of a Markdown file as markup ("Preview" beside "Edit"); absent for other texts. */
  renderMarkdown?: MarkdownFileRenderer;
  isSaving: boolean;
  /** The text to write (the file's own line ends again). */
  onSave: (text: string) => void;
  /** Leave without saving; `hasChanges` says whether a draft is lost. */
  onCancel: (hasChanges: boolean) => void;
  /** Tells the parent whether the draft differs from the file (a guard before it shows something else). */
  onDirtyChange?: (hasChanges: boolean) => void;
  className?: string;
}

/**
 * A text file's content in a plain text field (no editor library): the text is read as UTF-8, edited, and handed to
 * `onSave` with the file's own line ends. A file that is no UTF-8 text, or longer than what is read, is not offered
 * for editing — saving it would damage it. A Markdown draft can be looked at as markup before it is saved. Fills the
 * flex column it is put in.
 */
export const FileTextEditor = ({ url, fileName, renderMarkdown, isSaving, onSave, onCancel, onDirtyChange, className }: FileTextEditorProps) => {
  const { t } = useTranslate();
  const fieldId = useId();
  const head = useTextHead(url, FILE_TEXT_EDIT_MAX_BYTES);
  const [draft, setDraft] = useState<{ url: string; source: FileTextDraftSource; text: string } | null>(null);
  const [view, setView] = useState<EditorView>('edit');

  const loadedText = head.status === 'ready' && !head.truncated ? head.text : null;
  useEffect(() => {
    if (loadedText === null) return;
    const source = fileTextDraftSourceOf(loadedText);
    setDraft(current => (current !== null && current.url === url ? current : source === null ? null : { url, source, text: source.text }));
  }, [loadedText, url]);

  const current = draft !== null && draft.url === url ? draft : null;
  const hasChanges = current !== null && current.text !== current.source.text;
  useEffect(() => {
    onDirtyChange?.(hasChanges);
  }, [hasChanges, onDirtyChange]);

  // a draft is not lost by closing the tab without a word
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  const refusal =
    head.status === 'failed'
      ? t('This file could not be read. Try again, or download it.')
      : head.status === 'ready' && head.truncated
        ? t('This file is too large to edit here. Download it, edit it and upload it as a new version.')
        : head.status === 'ready' && fileTextDraftSourceOf(head.text) === null
          ? t('This file is not UTF-8 text, so it is not edited here. Download it, edit it and upload it as a new version.')
          : null;

  if (refusal !== null) {
    return (
      <div className={cn('flex flex-col items-center gap-3 rounded-xl bg-tint px-6 py-8 text-center', className)}>
        <p className="max-w-sm text-[13px] text-muted-foreground">{refusal}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onCancel(false)}>
          {t('Back to the file')}
        </Button>
      </div>
    );
  }
  if (current === null) return <TextPreviewSkeleton />;

  const showsPreview = renderMarkdown !== undefined && view === 'preview';
  return (
    <section data-slot="file-text-editor" className={cn('flex min-h-0 flex-1 flex-col gap-2', className)} aria-label={t('Editing %name%', { replacements: { name: fileName } })}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {renderMarkdown ? (
          <SegmentedControl value={view} onValueChange={setView} options={EDITOR_VIEW_OPTIONS} aria-label={t('View of the Markdown file')} height={32} />
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {hasChanges && <span className="text-xs text-muted-foreground">{t('Unsaved changes')}</span>}
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => onCancel(hasChanges)}>
            {t('Cancel')}
          </Button>
          <Button type="button" size="sm" disabled={isSaving || !hasChanges} onClick={() => onSave(fileTextForSaving(current.text, current.source))}>
            {isSaving ? t('Saving…') : t('Save')}
          </Button>
        </div>
      </div>
      {showsPreview ? (
        <div data-slot="markdown-file-preview" className="min-h-0 flex-1 overflow-auto rounded-lg border bg-card p-4 text-sm">
          {renderMarkdown(current.text)}
        </div>
      ) : (
        <>
          <label htmlFor={fieldId} className="sr-only">
            {t('Content of %name%', { replacements: { name: fileName } })}
          </label>
          <textarea
            id={fieldId}
            value={current.text}
            onChange={event => setDraft({ ...current, text: event.target.value })}
            readOnly={isSaving}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className={cn('min-h-56 w-full flex-1 resize-none p-3 font-mono text-[13px] leading-relaxed', FIELD_SURFACE_CLASS, FIELD_RADIUS_CLASS, FIELD_FOCUS_CLASS)}
          />
        </>
      )}
    </section>
  );
};
