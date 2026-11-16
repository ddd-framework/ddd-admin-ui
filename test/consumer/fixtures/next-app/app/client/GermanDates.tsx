'use client';

// T2: a client page sets German translations, then renders a date cell, a translated text, a number and a list block.
import { useState } from 'react';
import { formatUiNumber, setTranslations, useTranslate } from '@mgamadeus/ddd-admin-ui/i18n';
import { DateCell, EntityListEmpty } from '@mgamadeus/ddd-admin-ui/list';

setTranslations('de', 'FORMAL', { 'Clear search': 'Suche zurücksetzen' });

export function GermanDates() {
  const { t } = useTranslate();
  const [isCleared, setCleared] = useState(false);
  return (
    <main>
      <span id="date">
        <DateCell value="2026-03-04" />
      </span>
      <span id="text">{t('Clear search')}</span>
      <span id="number">{formatUiNumber(1234.5)}</span>
      <span id="hydrated">{isCleared ? 'yes' : 'no'}</span>
      <EntityListEmpty message="Keine Treffer" onClearSearch={() => setCleared(true)} />
    </main>
  );
}
