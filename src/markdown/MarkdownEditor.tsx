'use client';

import { type DragEvent, type KeyboardEvent, useRef } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn, FIELD_FOCUS_WITHIN_CLASS, Skeleton, Textarea } from '../primitives/index.ts';
import { type MarkdownColorMode, useMarkdownColorMode, useMarkdownLibrary } from './useMarkdownLibrary.ts';

/** Height of one text row in px: `rows × 24` gives the editor height of a content field. */
export const MARKDOWN_ROW_HEIGHT = 24;

export interface MarkdownEditorProps {
  /** Id of the textarea (a `<label for>` names it). */
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Editor height in px (default 192, eight rows). */
  height?: number;
  placeholder?: string;
  disabled?: boolean;
  /** Accessible name when no `<label for={id}>` names the textarea. */
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  /** `full` (default): content fields; `minimal`: short messages (no headings, images, quotes; edit ↔ preview only). */
  toolbar?: 'full' | 'minimal';
  /** Swallow file drops (the surrounding block uploads them); without it the editor inserts nothing either way. */
  ignoreDrops?: boolean;
  /** Key handler of the textarea (for example ⌘ / Ctrl + Enter to send). */
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  /** The editor's own colours: from the nearest `.dark` ancestor (`auto`, default) or fixed. */
  colorMode?: MarkdownColorMode;
  className?: string;
}

const preventDrop = (event: DragEvent<HTMLDivElement>) => event.preventDefault();

const FRAME_CLASS =
  'overflow-hidden rounded-xl border border-field-edge bg-card transition-colors hover:border-field-edge-strong';

/**
 * A markdown field: `@uiw/react-md-editor` (optional peer) in edit mode with a preview toggle, its preview sanitised
 * (raw HTML parsed, then GitHub's rules plus images; a single newline is a line break). The library loads after
 * hydration through a dynamic import: the server and the hydration render draw a skeleton of the same height, and a
 * host that never renders this block never loads the library. When the load fails (the peer is missing at run time,
 * a chunk did not arrive) the field falls back to a plain textarea on the same value, so editing never stops.
 */
export const MarkdownEditor = ({
  id,
  value,
  onChange,
  height = 8 * MARKDOWN_ROW_HEIGHT,
  placeholder,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  toolbar = 'full',
  ignoreDrops = false,
  onKeyDown,
  colorMode = 'auto',
  className,
}: MarkdownEditorProps) => {
  const { t } = useTranslate();
  const frameRef = useRef<HTMLDivElement>(null);
  const resolvedColorMode = useMarkdownColorMode(frameRef, colorMode);
  const state = useMarkdownLibrary();

  if (state.status === 'failed') {
    return (
      <div data-slot="markdown-editor" data-markdown-fallback="" className={cn('space-y-1', className)}>
        <Textarea
          id={id}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid || undefined}
          onKeyDown={onKeyDown}
          className="font-mono"
          style={{ minHeight: height }}
        />
        <p className="text-xs text-muted-foreground">{t('The editor could not be loaded; edit the Markdown text directly.')}</p>
      </div>
    );
  }

  return (
    <div
      ref={frameRef}
      data-slot="markdown-editor"
      data-color-mode={resolvedColorMode}
      aria-busy={state.status === 'loading' || undefined}
      className={cn(
        FRAME_CLASS,
        FIELD_FOCUS_WITHIN_CLASS,
        ariaInvalid && 'border-destructive hover:border-destructive',
        disabled && 'pointer-events-none opacity-60',
        className
      )}
    >
      {state.status === 'loading' ? (
        <Skeleton className="w-full rounded-none" style={{ height }} />
      ) : (
        <state.library.Editor
          value={value}
          onChange={(next: string | undefined) => onChange(next ?? '')}
          height={height}
          preview="edit"
          commands={toolbar === 'minimal' ? state.library.toolbars.minimal : state.library.toolbars.full}
          extraCommands={toolbar === 'minimal' ? state.library.toolbars.minimalExtra : state.library.toolbars.fullExtra}
          previewOptions={{ rehypePlugins: state.library.rehypePlugins, remarkPlugins: state.library.remarkPlugins }}
          textareaProps={{
            id,
            placeholder,
            disabled,
            onKeyDown,
            'aria-label': ariaLabel,
            'aria-describedby': ariaDescribedBy,
            'aria-invalid': ariaInvalid || undefined,
          }}
          visibleDragbar={false}
          onDrop={ignoreDrops ? preventDrop : undefined}
        />
      )}
    </div>
  );
};
