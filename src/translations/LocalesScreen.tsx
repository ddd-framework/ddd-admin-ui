'use client';

import { buildContainsFilter, buildFieldFilter, buildFulltextFilter, combineFilters, sanitizeSearchInput } from '@mgamadeus/ddd-web/query';
import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Download } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { IdCell } from '../list/cells.tsx';
import { orEmpty } from '../list/EmptyValue.tsx';
import { EntityListBody } from '../list/EntityListBody.tsx';
import type { EntityListColumn } from '../list/EntityListTable.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { YES_NO_FILTER_OPTIONS } from '../list/filterOptions.ts';
import { FilterPanel, FilterSelect, FilterText } from '../list/filters.tsx';
import { notify } from '../logic/pure/notify.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useGrowingWindowList } from '../logic/react/useGrowingWindowList.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useOptimisticRowPatches } from '../logic/react/useOptimisticRowPatches.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { EntityListPage } from '../page/EntityListPage.tsx';
import { PageToolbar } from '../page/PageToolbar.tsx';
import { Button } from '../primitives/button.tsx';
import { Switch } from '../primitives/switch.tsx';
import type { AdminLocale, LocalesResponse, TranslationsListArg } from './adminTypes.ts';
import type { TranslationsApi } from './api.ts';
import { useConfigImport } from './ConfigImportCards.tsx';

const PAGE_SIZE = 100;
const FILTER_KEYS = ['name', 'languageCode', 'countryShortCode', 'isActive', 'isDefaultLocaleForLanguage', 'isDefaultLocaleForCountry'] as const;
const UNCOUNTED = ['name'] as const;

/** The three flags of a locale that toggle in place. */
export type LocaleFlag = 'isActive' | 'isDefaultLocaleForLanguage' | 'isDefaultLocaleForCountry';

const extractLocales = (data: LocalesResponse): AdminLocale[] => data.locales.elements ?? [];
const localeId = (locale: AdminLocale): string => String(locale.id);
const flagFilter = (property: LocaleFlag, value: string) => (value === '1' || value === '0' ? buildFieldFilter(property, value) : undefined);

export interface LocalesScreenProps {
  api: TranslationsApi;
  /** Where the filters live; the host's URL adapter, else component state. */
  urlStateAdapter?: UrlStateAdapter;
  title?: ReactNode;
  description?: ReactNode;
  /** Drawn inside another page (a showcase): no full-height page frame (`EntityListPage.asSpecimen`). */
  asSpecimen?: boolean;
}

/**
 * The locales of the platform. `isActive` decides which locales the translation pickers, the completeness and the
 * generation offer; it and the two default flags toggle in place (the loaded row plus the flag is saved, shown at
 * once, rolled back on an error). Name search (fulltext prefix), code and flag filters, "Import from configuration".
 * Writes follow `WriteAccessProvider`.
 */
export const LocalesScreen = ({ api, urlStateAdapter, title, description, asSpecimen }: LocalesScreenProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const memory = useMemoryUrlState();
  const listState = useUrlListState(FILTER_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: UNCOUNTED });
  const { values, debounced, setValue } = listState;

  const nameTerm = sanitizeSearchInput(debounced.name);
  const filterString = combineFilters(
    buildFulltextFilter('name', nameTerm, { mode: 'fb', prefix: true }),
    buildContainsFilter('languageCode', sanitizeSearchInput(debounced.languageCode)),
    buildContainsFilter('countryShortCode', sanitizeSearchInput(debounced.countryShortCode)),
    flagFilter('isActive', debounced.isActive),
    flagFilter('isDefaultLocaleForLanguage', debounced.isDefaultLocaleForLanguage),
    flagFilter('isDefaultLocaleForCountry', debounced.isDefaultLocaleForCountry)
  );
  const orderBy = nameTerm ? 'nameScore DESC' : 'languageCode ASC, countryShortCode ASC';
  const listArgs = useMemo<Omit<TranslationsListArg, 'top' | 'skip'>>(() => ({ orderBy, ...(filterString ? { filters: filterString } : {}) }), [filterString, orderBy]);
  const list = useGrowingWindowList({
    useListQuery: api.useLocalesQuery,
    args: listArgs,
    extractItems: extractLocales,
    pageSize: PAGE_SIZE,
    resetKey: `${filterString ?? ''}|${orderBy}`,
  });

  const { displayed, begin, succeed, rollback } = useOptimisticRowPatches(list.items, localeId);
  const [updateLocale] = api.useUpdateLocaleMutation();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const configImport = useConfigImport(api, 'locales');

  const toggle = async (locale: AdminLocale, flag: LocaleFlag, value: boolean) => {
    if (!writeAccess.allowed || updatingId !== null) return;
    const id = localeId(locale);
    const patch: Partial<AdminLocale> = { [flag]: value };
    begin(id, patch);
    setUpdatingId(id);
    try {
      await updateLocale({ locale: { ...locale, ...patch } }).unwrap();
      succeed(id);
      notify.success(t('Locale updated'));
    } catch (error) {
      rollback(id);
      notify.error(normalizeDddError(error, t('Failed to update the locale')).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const flagCell = (locale: AdminLocale, flag: LocaleFlag, label: string) => (
    <Switch
      checked={Boolean(locale[flag])}
      onCheckedChange={checked => void toggle(locale, flag, checked)}
      disabled={!writeAccess.allowed || updatingId !== null}
      title={writeAccess.allowed ? undefined : writeAccess.reason}
      aria-label={`${label}: ${locale.name ?? locale.id}`}
      data-locale-flag={flag}
    />
  );
  const codeCell = (value: string | null | undefined) => orEmpty(value ? <code className="font-mono text-xs">{value}</code> : null);

  const columns: EntityListColumn<AdminLocale>[] = [
    { id: 'id', header: m('ID'), cell: locale => <IdCell id={locale.id} />, className: 'w-16' },
    { id: 'name', header: m('Name'), cell: locale => <span className="font-medium">{orEmpty(locale.name)}</span>, className: 'min-w-48' },
    { id: 'language', header: m('Language'), cell: locale => codeCell(locale.languageCode) },
    { id: 'country', header: m('Country'), cell: locale => codeCell(locale.countryShortCode) },
    { id: 'isActive', header: m('Active'), cell: locale => flagCell(locale, 'isActive', t('Active')) },
    { id: 'isDefaultLocaleForLanguage', header: m('Default for the language'), cell: locale => flagCell(locale, 'isDefaultLocaleForLanguage', t('Default for the language')) },
    { id: 'isDefaultLocaleForCountry', header: m('Default for the country'), cell: locale => flagCell(locale, 'isDefaultLocaleForCountry', t('Default for the country')) },
  ];

  return (
    <EntityListPage
      asSpecimen={asSpecimen}
      title={title ?? t('Locales')}
      description={description ?? t('The locales of the platform. Active locales are offered in the translation pickers and counted in the translation completeness.')}
      headerActions={
        <PageToolbar>
          <Button
            type="button"
            variant="outline"
            onClick={() => void configImport.run()}
            disabled={!writeAccess.allowed || configImport.isRunning}
            title={writeAccess.allowed ? t('Creates or updates every locale of the configuration, matched by language and country code.') : writeAccess.reason}
          >
            <Download aria-hidden />
            {configImport.isRunning ? t('Importing…') : t('Import from configuration')}
          </Button>
        </PageToolbar>
      }
      toolbar={
        <EntityListToolbar
          search={{ value: values.name, onChange: value => setValue('name', value), placeholder: t('Search locales by name…'), 'aria-label': t('Filter by name') }}
          filters={
            <FilterPanel>
              <FilterText label={t('Language')} value={values.languageCode} onChange={value => setValue('languageCode', value)} placeholder={t('e.g. de')} />
              <FilterText label={t('Country')} value={values.countryShortCode} onChange={value => setValue('countryShortCode', value)} placeholder={t('e.g. DE')} />
              <FilterSelect label={t('Active')} options={YES_NO_FILTER_OPTIONS} value={values.isActive} onChange={value => setValue('isActive', value)} />
              <FilterSelect label={t('Default for the language')} options={YES_NO_FILTER_OPTIONS} value={values.isDefaultLocaleForLanguage} onChange={value => setValue('isDefaultLocaleForLanguage', value)} />
              <FilterSelect label={t('Default for the country')} options={YES_NO_FILTER_OPTIONS} value={values.isDefaultLocaleForCountry} onChange={value => setValue('isDefaultLocaleForCountry', value)} />
            </FilterPanel>
          }
          activeFilterCount={listState.activeFilterCount}
          onClearFilters={listState.clear}
        />
      }
    >
      <EntityListBody
        displayMode="table"
        columns={columns}
        items={displayed}
        getRowKey={localeId}
        isLoading={list.isLoading}
        isFetchingMore={list.isFetchingMore}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
        emptyMessage={t('No locales found')}
        noResultsMessage={t('No locales found')}
        isSearchActive={listState.isActive}
        onClearSearch={listState.clear}
        loadingMessage={t('Loading locales')}
        error={list.isError ? t('The locales could not be loaded.') : undefined}
      />
    </EntityListPage>
  );
};
