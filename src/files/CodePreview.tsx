'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';
import type { CodeHighlighterLike, CodeHighlighterLoader, CodeToken } from './codeHighlighting.ts';
import { TextPreviewSkeleton, TruncatedTextNote } from './TextPreview.tsx';
import { TEXT_PREVIEW_BYTES, useTextHead } from './useTextHead.ts';

/** The role colour of a token class (highlight.js names without the prefix); a class not listed keeps the text colour. */
const TOKEN_CLASS_NAMES: Readonly<Record<string, string>> = {
  keyword: 'text-primary-emphasis',
  built_in: 'text-primary-emphasis',
  literal: 'text-primary-emphasis',
  type: 'text-primary-emphasis',
  'selector-tag': 'text-primary-emphasis',
  doctag: 'text-primary-emphasis',
  string: 'text-success',
  regexp: 'text-success',
  addition: 'text-success',
  'template-string': 'text-success',
  number: 'text-warning',
  symbol: 'text-warning',
  bullet: 'text-warning',
  'template-variable': 'text-warning',
  comment: 'text-muted-foreground italic',
  quote: 'text-muted-foreground italic',
  meta: 'text-muted-foreground',
  title: 'text-info',
  section: 'text-info',
  name: 'text-info',
  attr: 'text-info',
  attribute: 'text-info',
  property: 'text-info',
  variable: 'text-info',
  'selector-class': 'text-info',
  'selector-id': 'text-info',
  deletion: 'text-destructive',
};

const tokenClassName = (token: CodeToken): string | undefined => {
  const classNames = token.classNames.map(name => TOKEN_CLASS_NAMES[name]).filter(Boolean);
  // the innermost class decides the colour
  return classNames.length > 0 ? classNames[classNames.length - 1] : undefined;
};

/** The highlighter once the host's loader answered; `null` without a loader, while it loads and when it failed. */
const useCodeHighlighter = (loadCodeHighlighter: CodeHighlighterLoader | undefined): CodeHighlighterLike | null => {
  const loaderRef = useRef(loadCodeHighlighter);
  loaderRef.current = loadCodeHighlighter;
  const [highlighter, setHighlighter] = useState<CodeHighlighterLike | null>(null);
  const hasLoader = loadCodeHighlighter !== undefined;

  useEffect(() => {
    if (!hasLoader) return;
    let cancelled = false;
    loaderRef
      .current?.()
      .then(loaded => {
        if (!cancelled) setHighlighter(loaded);
      })
      // a highlighter that does not load leaves the code plain
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [hasLoader]);

  return highlighter;
};

export interface CodeTextProps {
  code: string;
  /** The language of `codeLanguageOfExtension`; `null` shows the code plain. */
  language: string | null;
  loadCodeHighlighter?: CodeHighlighterLoader;
  /** `canvas`: the code fills the height it is given. Default `drawer` (a box of fixed height). */
  layout?: 'drawer' | 'canvas';
  className?: string;
}

/**
 * Source code as text nodes: plain at once, coloured as soon as the host's highlighter answered. The tokens are data
 * (text and class names); nothing of the file or of the highlighter's output is inserted as HTML.
 */
export const CodeText = ({ code, language, loadCodeHighlighter, layout = 'drawer', className }: CodeTextProps) => {
  const highlighter = useCodeHighlighter(language === null ? undefined : loadCodeHighlighter);
  const [tokens, setTokens] = useState<{ key: string; tokens: readonly CodeToken[] | null }>({ key: '', tokens: null });
  const key = `${language ?? ''}:${code.length}:${code.slice(0, 64)}`;

  useEffect(() => {
    if (highlighter === null || language === null) return;
    let cancelled = false;
    // after the plain code is on screen
    const timer = setTimeout(() => {
      if (!cancelled) setTokens({ key, tokens: highlighter.highlight(code, language) });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [highlighter, language, code, key]);

  const shown = tokens.key === key ? tokens.tokens : null;
  return (
    <pre
      data-slot="code-text"
      data-language={language ?? undefined}
      className={cn(
        'overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre',
        layout === 'canvas' ? 'min-h-0 flex-1' : 'max-h-96',
        className
      )}
    >
      <code>
        {shown === null
          ? code
          : shown.map((token, index) => {
              const tokenClass = tokenClassName(token);
              // biome-ignore lint/suspicious/noArrayIndexKey: the tokens of one text never reorder
              return tokenClass ? <span key={index} className={tokenClass}>{token.text}</span> : token.text;
            })}
      </code>
    </pre>
  );
};

export interface CodePreviewProps {
  url: string;
  fileName: string;
  language: string | null;
  loadCodeHighlighter?: CodeHighlighterLoader;
  layout?: 'drawer' | 'canvas';
  /** How much of the file is read (bytes); default the first 100 KB. */
  maxBytes?: number;
}

/** The preview of a source file: its head as text, coloured by the host's highlighter when there is one. */
export const CodePreview = ({ url, fileName, language, loadCodeHighlighter, layout = 'drawer', maxBytes = TEXT_PREVIEW_BYTES }: CodePreviewProps) => {
  const { t } = useTranslate();
  const head = useTextHead(url, maxBytes);
  if (head.status === 'failed') return <p className="py-6 text-center text-[13px] text-muted-foreground">{t('This file could not be shown. Download it to open it.')}</p>;
  if (head.status === 'loading') return <TextPreviewSkeleton />;
  return (
    <section
      className={cn('space-y-2', layout === 'canvas' && 'flex min-h-0 flex-1 flex-col')}
      aria-label={t('Preview of %name%', { replacements: { name: fileName } })}
    >
      <CodeText code={head.text} language={language} loadCodeHighlighter={loadCodeHighlighter} layout={layout} />
      {head.truncated && <TruncatedTextNote maxBytes={maxBytes} />}
    </section>
  );
};
