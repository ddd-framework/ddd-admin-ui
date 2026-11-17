'use client';

import { useTranslate } from '../i18n/index.ts';

/** The header of an actions column: a label for screen readers only (the column holds buttons). */
export const ActionsHeaderText = ({ label }: { label: string }) => {
  const { t } = useTranslate();
  return <span className="sr-only">{label === 'Actions' ? t('Actions', { context: 'table-column' }) : t(label)}</span>;
};
