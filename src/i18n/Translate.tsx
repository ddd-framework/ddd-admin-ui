'use client';

import { useTranslate } from './useTranslate.ts';

export interface TranslateProps {
  children: string;
  context?: string;
}

/** Renders its text child translated; `context` tells equal texts with different meanings apart. */
export const Translate = ({ children, context }: TranslateProps) => {
  const { t } = useTranslate();
  return <>{t(children, context ? { context } : {})}</>;
};
