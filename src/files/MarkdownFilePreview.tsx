'use client';

import { type ReactNode, useState } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';
import { SegmentedControl, type SegmentedControlOption } from '../primitives/segmented-control.tsx';
import type { CodeHighlighterLoader } from './codeHighlighting.ts';
import { CodeText } from './CodePreview.tsx';
import { TextPreviewSkeleton, TruncatedTextNote } from './TextPreview.tsx';
import { TEXT_PREVIEW_BYTES, useTextHead } from './useTextHead.ts';

export type MarkdownFileView = 'preview' | 'source';

const VIEW_OPTIONS: readonly SegmentedControlOption<MarkdownFileView>[] = [
  { value: 'preview', label: m('Preview', { context: 'markdown-view' }), context: 'markdown-view' },
  { value: 'source', label: m('Source', { context: 'markdown-view' }), context: 'markdown-view' },
];

/**
 * Draws a Markdown text of unknown origin as markup. The host passes it (`MarkdownPreview untrusted` of ./markdown, or
 * its own renderer): the renderer must not parse raw HTML, must not load pictures or other resources and must sanitise
 * its output.
 */
export type MarkdownFileRenderer = (source: string) => ReactNode;

export interface MarkdownFilePreviewProps {
  url: string;
  fileName: string;
  /** Without it the file shows its source only. */
  renderMarkdown?: MarkdownFileRenderer;
  loadCodeHighlighter?: CodeHighlighterLoader;
  layout?: 'drawer' | 'canvas';
  /** How much of the file is read (bytes); default the first 100 KB. */
  maxBytes?: number;
  /** The view shown first; default `preview` (with a renderer). */
  defaultView?: MarkdownFileView;
}

/**
 * The preview of a Markdown file: "Preview" (the host's renderer) and "Source" (the text, coloured by the host's
 * highlighter when there is one). Without a renderer the source alone.
 */
export const MarkdownFilePreview = ({
  url,
  fileName,
  renderMarkdown,
  loadCodeHighlighter,
  layout = 'drawer',
  maxBytes = TEXT_PREVIEW_BYTES,
  defaultView = 'preview',
}: MarkdownFilePreviewProps) => {
  const { t } = useTranslate();
  const head = useTextHead(url, maxBytes);
  const [chosenView, setChosenView] = useState<MarkdownFileView>(defaultView);
  const view: MarkdownFileView = renderMarkdown ? chosenView : 'source';
  const fills = layout === 'canvas';

  if (head.status === 'failed') return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This file could not be shown. Download it to open it.')}</p>;
  if (head.status === 'loading') return <TextPreviewSkeleton />;

  return (
    <section className={cn('space-y-2', fills && 'flex min-h-0 flex-1 flex-col')} aria-label={t('Preview of %name%', { replacements: { name: fileName } })}>
      {renderMarkdown && (
        <div className="flex justify-end">
          <SegmentedControl value={view} onValueChange={setChosenView} options={VIEW_OPTIONS} aria-label={t('View of the Markdown file')} height={32} />
        </div>
      )}
      {view === 'preview' && renderMarkdown ? (
        <div data-slot="markdown-file-preview" className={cn('overflow-auto rounded-lg border bg-card p-4 text-sm', fills ? 'min-h-0 flex-1' : 'max-h-96')}>
          {renderMarkdown(head.text)}
        </div>
      ) : (
        <CodeText code={head.text} language="markdown" loadCodeHighlighter={loadCodeHighlighter} layout={layout} className="break-words whitespace-pre-wrap" />
      )}
      {head.truncated && <TruncatedTextNote maxBytes={maxBytes} />}
    </section>
  );
};
