'use client';

import { useRef } from 'react';

import { cn, Skeleton } from '../primitives/index.ts';
import { type MarkdownColorMode, useMarkdownColorMode, useMarkdownLibrary } from './useMarkdownLibrary.ts';

export interface MarkdownPreviewProps {
  /** The markdown text. */
  source: string;
  /** The library's own colours: from the nearest `.dark` ancestor (`auto`, default) or fixed. */
  colorMode?: MarkdownColorMode;
  className?: string;
}

/**
 * Read-only markdown with the editor's pipeline: raw HTML parsed, then sanitised (GitHub's rules plus images), a single
 * newline is a line break; inherits text colour and size. Loads after hydration (a one-line skeleton until then);
 * when the library cannot be loaded it shows the source as plain text (escaped by React, never as HTML).
 */
export const MarkdownPreview = ({ source, colorMode = 'auto', className }: MarkdownPreviewProps) => {
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
      {state.status === 'ready' && (
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
