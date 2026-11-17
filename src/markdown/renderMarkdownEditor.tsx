import type { ReactNode } from 'react';

import type { MarkdownEditorRenderArgs } from '../translations/TranslatableMarkdown.tsx';
import { MARKDOWN_ROW_HEIGHT, MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor.tsx';

export interface RenderMarkdownEditorOptions
  extends Pick<MarkdownEditorProps, 'placeholder' | 'toolbar' | 'colorMode' | 'className' | 'ignoreDrops'> {
  /** Height in text rows (24 px each; default 8). `height` wins. */
  rows?: number;
  /** Height in px. */
  height?: number;
}

/**
 * The editor for the `renderEditor` slot of `TranslatableMarkdown` / `FormTranslatableMarkdown` and for
 * `AdminUiProvider.renderMarkdownEditor`: one editor per active locale, remounted when the locale changes
 * (`editorKey`), because the editor keeps its own undo history.
 *
 * @example <FormTranslatableMarkdown … renderEditor={renderMarkdownEditor({ rows: 12 })} />
 */
export const renderMarkdownEditor =
  (options: RenderMarkdownEditorOptions = {}) =>
  ({ id, value, onChange, editorKey, disabled, invalid }: MarkdownEditorRenderArgs): ReactNode => {
    const { rows = 8, height, ...rest } = options;
    return (
      <MarkdownEditor
        key={editorKey}
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        height={height ?? rows * MARKDOWN_ROW_HEIGHT}
        {...rest}
      />
    );
  };
