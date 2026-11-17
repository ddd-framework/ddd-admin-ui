'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { buildContainsFilter, buildIntEqFilter, combineFilters, sanitizeSearchInput } from '@mgamadeus/ddd-web/query';
import { Ban, Languages, RotateCcw, Sparkles } from 'lucide-react';
import { type ReactNode, useCallback, useMemo, useState } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { IdCell } from '../list/cells.tsx';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { EntityListBody } from '../list/EntityListBody.tsx';
import { EntityListBulkBar } from '../list/EntityListBulkBar.tsx';
import type { EntityListColumn } from '../list/EntityListTable.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { FilterPanel, FilterText } from '../list/filters.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import { notify } from '../logic/pure/notify.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useEntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { useGrowingWindowList } from '../logic/react/useGrowingWindowList.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useRowSelection } from '../logic/react/useRowSelection.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { EntityListPage } from '../page/EntityListPage.tsx';
import { AddEntityButton, PageToolbar } from '../page/PageToolbar.tsx';
import { Button } from '../primitives/button.tsx';
import type { AppTranslationKey, AppTranslationKeysResponse, TranslationsListArg } from './adminTypes.ts';
import { appTranslationValueLocaleKey, sortAppTranslationValues, toLanguageCodeMap } from './adminFormat.ts';
import type { TranslationsApi } from './api.ts';
import { AppTranslationKeyDrawer } from './AppTranslationKeyDrawer.tsx';
import { TranslationCompleteness } from './TranslationCompleteness.tsx';

const PAGE_SIZE = 50;
const FILTER_KEYS = ['id', 'key', 'translation'] as const;
/** The toolbar search (key) is not a panel filter. */
const UNCOUNTED = ['key'] as const;
const LANGUAGES_ARG: TranslationsListArg = { top: 500 };

const extractKeys = (data: AppTranslationKeysResponse): AppTranslationKey[] => data.appTranslationKeys.elements ?? [];
const keyIdOf = (key: AppTranslationKey): string | null => (key.id === null || key.id === undefined || key.id === '' ? null : String(key.id));

export interface AppTranslationsScreenProps {
  /** The hooks of `createTranslationsApi`. */
  api: TranslationsApi;
  /** Where the filters live (`id`, `key`, `translation`); the host's URL adapter, else component state. */
  urlStateAdapter?: UrlStateAdapter;
  /** Where the drawer lives (`edit`, `create`); the host's drawer adapter, else component state. */
  drawerUrlAdapter?: EntityDrawerUrlAdapter;
  title?: ReactNode;
  description?: ReactNode;
  /** Drawn inside another page (a showcase): no full-height page frame (`EntityListPage.asSpecimen`). */
  asSpecimen?: boolean;
}

/**
 * The app translation keys (the `__()` texts stored in the database): completeness per active locale with the
 * generation per locale and style on top, "Generate all missing", the keys table (id, key with hint and flags, every
 * value as `locale::style`), newest first, 50 per page. Key search in the toolbar, id and translation in the filters.
 * Rows can be selected for a bulk delete (one DELETE per key, in order; the first failure stops). A row opens the key
 * in the drawer; Add creates there. Writes follow `WriteAccessProvider`.
 */
export const AppTranslationsScreen = ({ api, urlStateAdapter, drawerUrlAdapter, title, description, asSpecimen }: AppTranslationsScreenProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const memory = useMemoryUrlState();
  const drawer = useEntityDrawer({ adapter: drawerUrlAdapter ?? memory.drawerUrlAdapter });
  const listState = useUrlListState(FILTER_KEYS, { adapter: urlStateAdapter ?? memory.urlStateAdapter, uncounted: UNCOUNTED });
  const { values, debounced, setValue } = listState;

  const filterString = combineFilters(
    buildIntEqFilter(debounced.id.trim(), 'id'),
    buildContainsFilter('key', sanitizeSearchInput(debounced.key)),
    buildContainsFilter('appTranslationValues.translation', sanitizeSearchInput(debounced.translation))
  );
  const listArgs = useMemo<Omit<TranslationsListArg, 'top' | 'skip'>>(
    () => ({ expand: 'appTranslationValues', orderBy: 'id DESC', ...(filterString ? { filters: filterString } : {}) }),
    [filterString]
  );
  const list = useGrowingWindowList({
    useListQuery: api.useAppTranslationKeysQuery,
    args: listArgs,
    extractItems: extractKeys,
    pageSize: PAGE_SIZE,
    resetKey: filterString ?? '',
  });
  const languagesQuery = api.useLanguagesQuery(LANGUAGES_ARG);
  const languageCodes = useMemo(() => toLanguageCodeMap(languagesQuery.data?.languages.elements ?? []), [languagesQuery.data]);

  const [generateAll, generateAllState] = api.useGenerateAllAppTranslationsMutation();
  const [deleteKey] = api.useDeleteAppTranslationKeyMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  const confirm = useConfirm();

  const selection = useRowSelection({
    items: list.items,
    getKey: keyIdOf,
    resetKey: filterString ?? '',
    disabled: isDeleting,
    rowLabel: key => t('Select key %id%', { replacements: { id: String(key.id) } }),
  });

  const deleteSelected = async () => {
    const ids = selection.selectedKeys;
    if (!writeAccess.allowed || ids.length === 0) return;
    const confirmed = await confirm({
      title: t('{count, plural, one {Delete # key?} other {Delete # keys?}}', { count: ids.length }),
      description: t('The selected translation keys and all their values are deleted. This cannot be undone.'),
      confirmLabel: t('Delete', { context: 'action' }),
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      for (const id of ids) await deleteKey({ appTranslationKeyId: id }).unwrap();
      notify.success(t('{count, plural, one {# key deleted} other {# keys deleted}}', { count: ids.length }));
      selection.clear();
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to delete keys')).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const runGenerateAll = async () => {
    if (!writeAccess.allowed) return;
    try {
      const data = await generateAll().unwrap();
      const results = data.appTranslationsResults.elements ?? [];
      const keys = results.reduce((sum, result) => sum + (result.translatedKeysCount ?? 0), 0);
      notify.success(t('Generation started for %combinations% locale and style combinations, %keys% keys', { replacements: { combinations: results.length, keys } }));
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to generate translations')).message);
    }
  };

  const { openEdit } = drawer;
  const rowAction = useCallback((key: AppTranslationKey) => {
    const id = keyIdOf(key);
    return id === null ? null : () => openEdit(id);
  }, [openEdit]);

  const columns: EntityListColumn<AppTranslationKey>[] = [
    { id: 'id', header: m('ID'), cell: key => <IdCell id={key.id} copyable />, className: 'w-20' },
    {
      id: 'key',
      header: m('Key'),
      cell: key => (
        <div className="min-w-0">
          <span className="font-mono text-sm font-medium break-all">{key.key}</span>
          {key.translationHint && <div className="mt-0.5 text-xs text-muted-foreground">{t('Hint: %hint%', { replacements: { hint: key.translationHint } })}</div>}
          {(key.reTranslate || key.doNotTranslateAutomatically || key.requiresContext) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {key.reTranslate && <StatusBadge tone="warning" icon={RotateCcw} label={t('translate again')} />}
              {key.doNotTranslateAutomatically && <StatusBadge tone="danger" icon={Ban} label={t('no automatic translation')} />}
              {key.requiresContext && <StatusBadge tone="info" icon={Languages} label={t('context required')} />}
            </div>
          )}
        </div>
      ),
      className: 'min-w-64 max-w-md whitespace-normal',
    },
    {
      id: 'translations',
      header: m('Translations'),
      cell: key => {
        const keyValues = key.appTranslationValues?.elements ?? [];
        if (keyValues.length === 0) return <EmptyValue className="text-sm">{t('No translations')}</EmptyValue>;
        return (
          <ul className="space-y-1">
            {sortAppTranslationValues(keyValues, languageCodes).map(value => (
              <li key={String(value.id)} className="flex items-start gap-2 text-sm">
                <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 font-mono text-xs font-semibold">{appTranslationValueLocaleKey(value, languageCodes)}</code>
                <span className="min-w-0 break-words">
                  {value.translation}
                  {value.context === 'MANY' && <span className="ml-1 text-[10px] text-muted-foreground">{t('(plural)')}</span>}
                </span>
              </li>
            ))}
          </ul>
        );
      },
      className: 'min-w-72',
    },
  ];

  return (
    <EntityListPage
      asSpecimen={asSpecimen}
      title={title ?? t('App translations')}
      description={description ?? t('Translation keys of the apps and the backend, stored in the database, with their values per locale and writing style.')}
      headerActions={
        <PageToolbar primaryAction={<AddEntityButton entity={m('Translation key')} onClick={drawer.openCreate} />}>
          <Button
            type="button"
            variant="outline"
            onClick={() => void runGenerateAll()}
            disabled={!writeAccess.allowed || generateAllState.isLoading}
            title={writeAccess.allowed ? t('Generate every missing value for every active locale and writing style') : writeAccess.reason}
          >
            <Sparkles aria-hidden />
            {generateAllState.isLoading ? t('Generating…') : t('Generate all missing')}
          </Button>
        </PageToolbar>
      }
      belowHeader={<TranslationCompleteness api={api} />}
      toolbar={
        <EntityListToolbar
          search={{ value: values.key, onChange: value => setValue('key', value), placeholder: t('Search keys…'), 'aria-label': t('Filter by key') }}
          filters={
            <FilterPanel>
              <FilterText label={t('ID')} inputMode="numeric" value={values.id} onChange={value => setValue('id', value)} />
              <FilterText label={t('Translation')} value={values.translation} onChange={value => setValue('translation', value)} placeholder={t('Search translations…')} />
            </FilterPanel>
          }
          activeFilterCount={listState.activeFilterCount}
          onClearFilters={listState.clear}
          bulkBar={
            <EntityListBulkBar selection={selection} onDelete={() => void deleteSelected()} deleteBusy={isDeleting} busy={isDeleting} />
          }
        />
      }
    >
      <EntityListBody
        displayMode="table"
        columns={columns}
        items={list.items}
        getRowKey={key => String(key.id)}
        rowAction={rowAction}
        selection={selection}
        isLoading={list.isLoading}
        isFetchingMore={list.isFetchingMore}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
        emptyMessage={t('No translation keys found')}
        noResultsMessage={t('No translation keys found')}
        isSearchActive={listState.isActive}
        onClearSearch={listState.clear}
        loadingMessage={t('Loading translation keys')}
        error={list.isError ? t('The translation keys could not be loaded.') : undefined}
      />
      <AppTranslationKeyDrawer api={api} drawer={drawer} />
    </EntityListPage>
  );
};
