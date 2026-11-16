'use client';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';

export interface ClearFiltersButtonProps {
  onClear: () => void;
  disabled?: boolean;
}

/** Resets the filters of a list. */
export const ClearFiltersButton = ({ onClear, disabled }: ClearFiltersButtonProps) => {
  const { t } = useTranslate();
  return (
    <Button variant="ghost" size="sm" data-list-toolbar="" onClick={onClear} disabled={disabled}>
      {t('Clear filters')}
    </Button>
  );
};
