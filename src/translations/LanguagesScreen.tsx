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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { Switch } from '../primitives/switch.tsx';
import type { AdminLanguage, LanguagesResponse, TranslationsListArg } from './adminTypes.ts';
import { LANGUAGE_WRITING_STYLES_OPTIONS, TEXT_DIRECTION_OPTIONS } from './adminFormat.ts';
import type { TranslationsApi } from './api.ts';
import { useConfigImport } from './ConfigImportCards.tsx';

const PAGE_SIZE = 100;
const FILTER_KEYS = ['name', 'languageCode', 'iso3Code', 'nativeName', 'textDirection', 'supportedWritingStyles', 'isActive'] as const;
const UNCOUNTED = ['name'] as const;

const extractLanguages = (data: LanguagesResponse): AdminLanguage[] => data.languages.elements ?? [];
const languageId = (language: AdminLanguage): string => String(language.id);
const isOneOf = (value: string, options: readonly { value: string }[]): boolean => options.some(option => option.value === value);

export interface LanguagesScreenProps {
  api: TranslationsApi;
  /** Where the filters live; the host's URL adapter, else component state. */
  urlStateAdapter?: UrlStateAdapter;
  title?: ReactNode;
  description?: ReactNode;
  /** Drawn inside another page (a showcase): no full-height page frame (`EntityListPage.asSpecimen`). */
  asSpecimen?: boolean;
}

/**
 * The languages of the platform: `isActive` decides which languages take part in the app translation generation,
 * `supportedWritingStyles` which styles are generated; both change in place (the loaded row plus the change is saved,
 * shown at once, rolled back on an error). Name search (fulltext prefix, relevance order while active), the other
 * filters in the panel, "Import from configuration" in the header. Writes follow `WriteAccessProvider`.
 */
export const LanguagesScreen = ({ api, urlStateAdapter, title, description, asSpecimen }: LanguagesScreenProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const memory = useMemoryUrlState();
  const listState = useUrlListState(FILTER_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: UNCOUNTED });
  const { values, debounced, setValue } = listState;

  const nameTerm = sanitizeSearchInput(debounced.name);
  const filterString = combineFilters(
    buildFulltextFilter('name', nameTerm, { mode: 'fb', prefix: true }),
    buildContainsFilter('languageCode', sanitizeSearchInput(debounced.languageCode)),
    buildContainsFilter('iso3Code', sanitizeSearchInput(debounced.iso3Code)),
    buildContainsFilter('nativeName', sanitizeSearchInput(debounced.nativeName)),
    isOneOf(debounced.textDirection, TEXT_DIRECTION_OPTIONS) ? buildFieldFilter('textDirection', debounced.textDirection) : undefined,
    isOneOf(debounced.supportedWritingStyles, LANGUAGE_WRITING_STYLES_OPTIONS) ? buildFieldFilter('supportedWritingStyles', debounced.supportedWritingStyles) : undefined,
    debounced.isActive === '1' || debounced.isActive === '0' ? buildFieldFilter('isActive', debounced.isActive) : undefined
  );
  const orderBy = nameTerm ? 'nameScore DESC' : 'languageCode ASC';
  const listArgs = useMemo<Omit<TranslationsListArg, 'top' | 'skip'>>(() => ({ orderBy, ...(filterString ? { filters: filterString } : {}) }), [filterString, orderBy]);
  const list = useGrowingWindowList({
    useListQuery: api.useLanguagesQuery,
    args: listArgs,
    extractItems: extractLanguages,
    pageSize: PAGE_SIZE,
    resetKey: `${filterString ?? ''}|${orderBy}`,
  });

  const { displayed, begin, succeed, rollback } = useOptimisticRowPatches(list.items, languageId);
  const [updateLanguage] = api.useUpdateLanguageMutation();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const configImport = useConfigImport(api, 'languages');

  const save = async (language: AdminLanguage, patch: Partial<AdminLanguage>) => {
    if (!writeAccess.allowed || updatingId !== null) return;
    const id = languageId(language);
    begin(id, patch);
    setUpdatingId(id);
    try {
      await updateLanguage({ language: { ...language, ...patch } }).unwrap();
      succeed(id);
      notify.success(t('Language updated'));
    } catch (error) {
      rollback(id);
      notify.error(normalizeDddError(error, t('Failed to update the language')).message);
    } finally {
      setUpdatingId(null);
    }
  };

  const writeDisabled = !writeAccess.allowed || updatingId !== null;
  const columns: EntityListColumn<AdminLanguage>[] = [
    { id: 'id', header: m('ID'), cell: language => <IdCell id={language.id} />, className: 'w-16' },
    { id: 'name', header: m('Name'), cell: language => <span className="font-medium">{orEmpty(language.name)}</span>, className: 'min-w-40' },
    { id: 'nativeName', header: m('Native name'), cell: language => orEmpty(language.nativeName) },
    { id: 'languageCode', header: m('Code'), cell: language => orEmpty(language.languageCode ? <code className="font-mono text-xs">{language.languageCode}</code> : null) },
    { id: 'iso3Code', header: m('ISO 639-3'), cell: language => orEmpty(language.iso3Code ? <code className="font-mono text-xs">{language.iso3Code}</code> : null) },
    {
      id: 'textDirection',
      header: m('Text direction'),
      cell: language => {
        const option = TEXT_DIRECTION_OPTIONS.find(entry => entry.value === (language.textDirection || 'LTR'));
        return <span className="text-sm">{option ? t(option.label) : language.textDirection}</span>;
      },
    },
    {
      id: 'supportedWritingStyles',
      header: m('Writing styles'),
      cell: language => (
        <Select
          value={language.supportedWritingStyles ?? 'INFORMAL'}
          onValueChange={value => isOneOf(value, LANGUAGE_WRITING_STYLES_OPTIONS) && void save(language, { supportedWritingStyles: value })}
          disabled={writeDisabled}
        >
          <SelectTrigger
            size="sm"
            className="w-44 text-xs"
            title={writeAccess.allowed ? undefined : writeAccess.reason}
            aria-label={t('Writing styles of %name%', { replacements: { name: language.name ?? String(language.id) } })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGE_WRITING_STYLES_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      className: 'w-48',
    },
    {
      id: 'isActive',
      header: m('Active'),
      cell: language => (
        <Switch
          checked={Boolean(language.isActive)}
          onCheckedChange={checked => void save(language, { isActive: checked })}
          disabled={writeDisabled}
          title={writeAccess.allowed ? undefined : writeAccess.reason}
          aria-label={t('Active: %name%', { replacements: { name: language.name ?? String(language.id) } })}
        />
      ),
      className: 'w-20',
    },
  ];

  return (
    <EntityListPage
      asSpecimen={asSpecimen}
      title={title ?? t('Languages')}
      description={description ?? t('The languages of the platform. Active languages take part in the app translation generation, in the styles they support.')}
      headerActions={
        <PageToolbar>
          <Button
            type="button"
            variant="outline"
            onClick={() => void configImport.run()}
            disabled={!writeAccess.allowed || configImport.isRunning}
            title={writeAccess.allowed ? t('Creates or updates every language of the configuration, matched by language code.') : writeAccess.reason}
          >
            <Download aria-hidden />
            {configImport.isRunning ? t('Importing…') : t('Import from configuration')}
          </Button>
        </PageToolbar>
      }
      toolbar={
        <EntityListToolbar
          search={{ value: values.name, onChange: value => setValue('name', value), placeholder: t('Search languages by name…'), 'aria-label': t('Filter by name') }}
          filters={
            <FilterPanel>
              <FilterText label={t('Code')} value={values.languageCode} onChange={value => setValue('languageCode', value)} placeholder={t('e.g. de')} />
              <FilterText label={t('ISO 639-3')} value={values.iso3Code} onChange={value => setValue('iso3Code', value)} placeholder={t('e.g. deu')} />
              <FilterText label={t('Native name')} value={values.nativeName} onChange={value => setValue('nativeName', value)} />
              <FilterSelect label={t('Text direction')} options={TEXT_DIRECTION_OPTIONS} value={values.textDirection} onChange={value => setValue('textDirection', value)} />
              <FilterSelect label={t('Writing styles')} options={LANGUAGE_WRITING_STYLES_OPTIONS} value={values.supportedWritingStyles} onChange={value => setValue('supportedWritingStyles', value)} />
              <FilterSelect label={t('Active')} options={YES_NO_FILTER_OPTIONS} value={values.isActive} onChange={value => setValue('isActive', value)} />
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
        getRowKey={languageId}
        isLoading={list.isLoading}
        isFetchingMore={list.isFetchingMore}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
        emptyMessage={t('No languages found')}
        noResultsMessage={t('No languages found')}
        isSearchActive={listState.isActive}
        onClearSearch={listState.clear}
        loadingMessage={t('Loading languages')}
        error={list.isError ? t('The languages could not be loaded.') : undefined}
      />
    </EntityListPage>
  );
};
