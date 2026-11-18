'use client';

import type { ReactNode } from 'react';

import { useTextLimits } from '../logic/react/textLimits.ts';
import { TranslatableField, type TranslatableFieldBaseProps } from './TranslatableField.tsx';

/** What the injected markdown editor receives for the active locale. */
export interface MarkdownEditorRenderArgs {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Remounting key: the editor shows another locale's text (some editors keep internal state). */
  editorKey: string;
  disabled?: boolean;
  /** An error on the field or the text over its limit: the editor sets `aria-invalid`. */
  invalid?: boolean;
  /** The id of the visible counter: the editor sets it as `aria-describedby` (absent while no counter shows). */
  describedBy?: string;
}

export interface TranslatableMarkdownProps extends TranslatableFieldBaseProps {
  /**
   * The markdown editor. An editor typically touches `window` at import, so
   * the app passes a `next/dynamic(…, { ssr: false })` editor in; this block never imports one.
   */
  renderEditor: (args: MarkdownEditorRenderArgs) => ReactNode;
}

/** A markdown field with one text per content locale; same tabs and payload rules as `TranslatableInput`. */
export const TranslatableMarkdown = ({ renderEditor, ...fieldProps }: TranslatableMarkdownProps) => {
  const limits = useTextLimits();
  return (
    <TranslatableField {...fieldProps} maxLength={fieldProps.maxLength ?? limits.multiline}>
      {({ id, text, setText, invalid, describedBy }) =>
        renderEditor({
          id,
          value: text,
          onChange: setText,
          editorKey: fieldProps.activeLocale,
          disabled: fieldProps.disabled,
          invalid,
          describedBy,
        })
      }
    </TranslatableField>
  );
};
