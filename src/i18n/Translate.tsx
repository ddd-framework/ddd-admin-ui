'use client';

import type { TranslateOptions } from './store.ts';
import { useTranslate } from './useTranslate.ts';

export interface TranslateProps extends TranslateOptions {
  /** The English text (the key), a string literal. */
  children: string;
}

/** `t(children)` as an element, for JSX text: `<Translate>Save changes</Translate>`. */
export const Translate = ({ children, ...options }: TranslateProps) => {
  const { t } = useTranslate();
  return <>{t(children, options)}</>;
};
