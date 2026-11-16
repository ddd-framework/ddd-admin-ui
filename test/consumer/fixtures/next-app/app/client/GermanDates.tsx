'use client';

// T2: a client page sets German translations, then renders a date cell, a translated text and a number.
import { useState } from 'react';
import { setTranslations, useTranslate } from '@mgamadeus/ddd-admin-ui/i18n';
import { ClearFiltersButton, DateCell } from '@mgamadeus/ddd-admin-ui/list';
import { formatUiNumber } from '@mgamadeus/ddd-admin-ui/logic';

setTranslations('de', 'FORMAL', { 'Clear filters': 'Filter zurücksetzen' });

export function GermanDates() {
  const { t } = useTranslate();
  const [isCleared, setCleared] = useState(false);
  return (
    <main>
      <span id="date">
        <DateCell value="2026-03-04T10:05:00Z" timeZone="UTC" />
      </span>
      <span id="text">{t('Clear filters')}</span>
      <span id="number">{formatUiNumber(1234.5)}</span>
      <span id="hydrated">{isCleared ? 'yes' : 'no'}</span>
      <ClearFiltersButton onClear={() => setCleared(true)} />
    </main>
  );
}
