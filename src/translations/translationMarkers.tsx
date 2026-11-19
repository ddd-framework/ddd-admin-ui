'use client';

import { History } from 'lucide-react';

import type { TranslatableLocale } from '../logic/pure/locales.ts';
import { translationLanguageCodeOf } from '../logic/pure/backgroundTranslation.ts';
import { useTranslate } from '../i18n/index.ts';

// The per-locale markers of the translation controls (`TranslationControls`, `BackgroundTranslationControls`): a count
// per locale key or language (e.g. texts whose source changed after their translation), drawn on the chip and listed
// in one summary line. Not exported: the controls' `localeMarkers`, `markerLabel` and `markerSummaryLabel` are the API.

/** The marker count of a chip: by its full key, else by its bare language; `0` without one. */
export const markerCountOf = (markers: Readonly<Record<string, number>> | undefined, localeKey: string): number => {
  if (!markers) return 0;
  const count = markers[localeKey] ?? markers[translationLanguageCodeOf(localeKey)] ?? 0;
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

/** The marker inside a chip: icon and count, with the meaning as screen-reader text. */
export const TranslationChipMarker = ({ count, label }: { count: number; label: string }) => {
  const { t } = useTranslate();
  return (
    <span data-translation-marker={count} className="inline-flex items-center gap-0.5 text-warning">
      <History className="size-3" aria-hidden />
      <span aria-hidden>{count}</span>
      <span className="sr-only">
        {`${label}: ${t('{count, plural, one {# text} other {# texts}}', { count })}`}
      </span>
    </span>
  );
};

/** The summary line under the chips: "<label> FR (1 text), DE (2 texts)"; nothing without a marked target. */
export const TranslationMarkerSummary = ({
  targets,
  markers,
  label,
}: {
  targets: readonly TranslatableLocale[];
  markers: Readonly<Record<string, number>> | undefined;
  label: string;
}) => {
  const { t } = useTranslate();
  const marked = targets.filter(locale => markerCountOf(markers, locale.key) > 0);
  if (marked.length === 0) return null;
  return (
    <p data-translation-marker-summary="" className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <History className="mt-0.5 size-3 shrink-0 text-warning" aria-hidden />
      <span>
        {label}{' '}
        {marked
          .map(locale =>
            t('%language% ({count, plural, one {# text} other {# texts}})', {
              count: markerCountOf(markers, locale.key),
              replacements: { language: locale.label },
            })
          )
          .join(', ')}
      </span>
    </p>
  );
};
