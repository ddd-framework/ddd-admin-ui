'use client';

import { useRef } from 'react';

import { cn, Skeleton } from '../primitives/index.ts';
import { type MarkdownColorMode, useMarkdownColorMode, useMarkdownLibrary } from './useMarkdownLibrary.ts';

export interface MarkdownPreviewProps {
  /** The markdown text. */
  source: string;
  /** The library's own colours: from the nearest `.dark` ancestor (`auto`, default) or fixed. */
  colorMode?: MarkdownColorMode;
  /**
   * The text is of unknown origin (a file somebody uploaded): raw HTML stays text, pictures are not loaded (their
   * description is shown), links keep `http(s):` / `mailto:` only and open in a new tab, and a newline is not a line
   * break (the text is a document, not a content field). Drawing it never contacts another host.
   */
  untrusted?: boolean;
  className?: string;
}

/**
 * Read-only markdown with the editor's pipeline: raw HTML parsed, then sanitised (GitHub's rules plus images), a single
 * newline is a line break; inherits text colour and size. Loads after hydration (a one-line skeleton until then);
 * when the library cannot be loaded it shows the source as plain text (escaped by React, never as HTML). `untrusted`
 * is the pipeline for a text of unknown origin (see the prop).
 */
export const MarkdownPreview = ({ source, colorMode = 'auto', untrusted = false, className }: MarkdownPreviewProps) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const resolvedColorMode = useMarkdownColorMode(frameRef, colorMode);
  const state = useMarkdownLibrary();
  return (
    <div
      ref={frameRef}
      data-slot="markdown-preview"
      data-color-mode={resolvedColorMode}
      aria-busy={state.status === 'loading' || undefined}
      className={cn('min-w-0 break-words', className)}
    >
      {state.status === 'loading' && <Skeleton className="h-4 w-2/3" />}
      {state.status === 'failed' && <p className="whitespace-pre-wrap">{source}</p>}
      {state.status === 'ready' && untrusted && (
        <state.library.Preview
          source={source}
          rehypePlugins={state.library.untrusted.rehypePlugins}
          remarkPlugins={state.library.untrusted.remarkPlugins}
          urlTransform={state.library.untrusted.urlTransform}
          style={{ background: 'transparent', color: 'inherit', fontSize: 'inherit' }}
        />
      )}
      {state.status === 'ready' && !untrusted && (
        <state.library.Preview
          source={source}
          rehypePlugins={state.library.rehypePlugins}
          remarkPlugins={state.library.remarkPlugins}
          style={{ background: 'transparent', color: 'inherit', fontSize: 'inherit' }}
        />
      )}
    </div>
  );
};
