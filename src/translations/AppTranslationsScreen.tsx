'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Ban, Languages, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { type MouseEvent, type ReactNode, useCallback, useMemo, useState } from 'react';

import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { IdCell } from '../list/cells.tsx';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { EntityListBody } from '../list/EntityListBody.tsx';
import { EntityListBulkBar } from '../list/EntityListBulkBar.tsx';
import type { EntityListColumn } from '../list/EntityListTable.tsx';
import { EntityListToolbar } from '../list/EntityListToolbar.tsx';
import { EntityListViewToggle } from '../list/EntityListViewToggle.tsx';
import { FilterPanel, FilterText } from '../list/filters.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import type { EntityCardRenderer } from '../list/types.ts';
import type { ListDisplayMode } from '../logic/pure/displayMode.ts';
import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import { type EntityListSort, formatListSort, parseListSort } from '../logic/pure/listSort.ts';
import { notify } from '../logic/pure/notify.ts';
import { bulkSummaryText, runSequentialWithSummary, type SequentialSummaryLabels } from '../logic/pure/runSequential.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useEntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { type ListQueryHook, useGrowingWindowList } from '../logic/react/useGrowingWindowList.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { useRowActivation } from '../logic/react/useRowActivation.ts';
import { useRowSelection } from '../logic/react/useRowSelection.ts';
import { useUrlListState } from '../logic/react/useUrlListState.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { EntityListPage } from '../page/EntityListPage.tsx';
import { AddEntityButton, type MoreActionItem, PageToolbar } from '../page/PageToolbar.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { cn } from '../primitives/cn.ts';
import type { AppTranslationKey, AppTranslationKeysResponse, TranslationsListArg } from './adminTypes.ts';
import {
  appTranslationValueCountryCode,
  appTranslationValueLocaleKey,
  type CountryCodeMap,
  type LanguageCodeMap,
  sortAppTranslationValues,
  toCountryCodeMap,
  toLanguageCodeMap,
} from './adminFormat.ts';
import type { TranslationsApi } from './api.ts';
import {
  ACTIVE_LOCALES_WITH_COUNTRIES_ARG,
  APP_TRANSLATION_KEY_FILTER_KEYS,
  APP_TRANSLATION_KEY_SORT_KEYS,
  APP_TRANSLATION_KEYS_PAGE_SIZE,
  APP_TRANSLATIONS_LANGUAGES_ARG,
  buildAppTranslationKeysFilter,
  buildAppTranslationKeysListArgs,
  DEFAULT_APP_TRANSLATION_KEY_SORT,
  renameUrlStateKeys,
} from './appTranslationsList.ts';
import { AppTranslationKeyDrawer } from './AppTranslationKeyDrawer.tsx';
import { TranslationCompleteness } from './TranslationCompleteness.tsx';

/** The toolbar search (key) is not a panel filter. */
const UNCOUNTED = ['key'] as const;
const SORT_KEYS = ['sort'] as const;
/** Values shown per key before "+N" (the rest opens in place). */
const DEFAULT_VALUES_PREVIEW_COUNT = 4;

const extractKeys = (data: AppTranslationKeysResponse): AppTranslationKey[] => data.appTranslationKeys.elements ?? [];
const keyIdOf = (key: AppTranslationKey): string | null => (key.id === null || key.id === undefined || key.id === '' ? null : String(key.id));

/** The URL parameter names of the keys list (`id`, `key`, `translation`, `sort`); an unnamed one keeps its own. */
export type AppTranslationsUrlParamNames = Partial<Record<'id' | 'key' | 'translation' | 'sort', string>>;

interface KeyValuesProps {
  item: AppTranslationKey;
  languageCodes: LanguageCodeMap;
  countryCodes: CountryCodeMap;
  previewCount: number;
}

/** The values of a key as `locale::style` (country and plural marked), the first few with "+N" opening the rest. */
const KeyValues = ({ item, languageCodes, countryCodes, previewCount }: KeyValuesProps) => {
  const { t } = useTranslate();
  const [expanded, setExpanded] = useState(false);
  const keyValues = item.appTranslationValues?.elements ?? [];
  if (keyValues.length === 0) return <EmptyValue className="text-sm">{t('No translations')}</EmptyValue>;
  const sorted = sortAppTranslationValues(keyValues, languageCodes);
  const limit = previewCount > 0 && !expanded ? previewCount : sorted.length;
  const hidden = sorted.length - Math.min(limit, sorted.length);
  return (
    <ul className="space-y-1">
      {sorted.slice(0, limit).map(value => {
        const country = appTranslationValueCountryCode(value, countryCodes);
        return (
          <li key={String(value.id)} className="flex items-start gap-2 text-sm">
            <code className="mt-0.5 shrink-0 rounded bg-muted px-1.5 font-mono text-xs font-semibold">{appTranslationValueLocaleKey(value, languageCodes)}</code>
            {country && <code className="mt-0.5 shrink-0 rounded bg-tint px-1.5 font-mono text-xs">{country}</code>}
            <span className={cn('min-w-0 break-words', !expanded && previewCount > 0 && 'line-clamp-2')}>
              {value.translation}
              {value.context === 'MANY' && <span className="ml-1 text-[10px] text-muted-foreground">{t('(plural)')}</span>}
            </span>
          </li>
        );
      })}
      {(hidden > 0 || (expanded && sorted.length > previewCount)) && (
        <li>
          <button
            type="button"
            className="rounded-sm text-xs font-semibold text-primary-emphasis hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-expanded={expanded}
            onClick={() => setExpanded(current => !current)}
          >
            {expanded ? t('Show fewer') : t('+%count% more', { replacements: { count: hidden } })}
          </button>
        </li>
      )}
    </ul>
  );
};

interface KeyFlagsProps {
  item: AppTranslationKey;
}

const KeyFlags = ({ item }: KeyFlagsProps) => {
  const { t } = useTranslate();
  if (!item.reTranslate && !item.doNotTranslateAutomatically && !item.requiresContext) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {item.reTranslate && <StatusBadge tone="warning" icon={RotateCcw} label={t('translate again')} />}
      {item.doNotTranslateAutomatically && <StatusBadge tone="danger" icon={Ban} label={t('no automatic translation')} />}
      {item.requiresContext && <StatusBadge tone="info" icon={Languages} label={t('context required')} />}
    </div>
  );
};

interface KeyLinkProps {
  item: AppTranslationKey;
  href: string | null;
  onClick: ((event: MouseEvent<HTMLElement>) => void) | undefined;
}

const KeyLink = ({ item, href, onClick }: KeyLinkProps) =>
  href === null ? (
    <span className="font-mono text-sm font-medium break-all">{item.key}</span>
  ) : (
    <a
      href={href}
      onClick={onClick}
      className="rounded-sm font-mono text-sm font-medium break-all hover:text-brand-emphasis hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      data-slot="app-translation-key-link"
    >
      {item.key}
    </a>
  );

interface KeyCardProps {
  item: AppTranslationKey;
  onActivate?: (() => void) | null;
  keyLink: ReactNode;
  values: ReactNode;
  actions: ReactNode;
}

/** The card of a key (below `md`, and in the card view): id, key with hint and flags, the values, the row actions. */
const KeyCard = ({ item, onActivate, keyLink, values, actions }: KeyCardProps) => {
  const { t } = useTranslate();
  const activation = useRowActivation(onActivate);
  return (
    <Card className={cn('h-full gap-0 py-0', onActivate && 'cursor-pointer')} data-slot="app-translation-key-card" {...activation}>
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground tabular-nums">#{String(item.id ?? '')}</span>
            <div>{keyLink}</div>
            {item.translationHint && <div className="mt-0.5 text-xs text-muted-foreground">{t('Hint: %hint%', { replacements: { hint: item.translationHint } })}</div>}
            <KeyFlags item={item} />
          </div>
          <div className="shrink-0">{actions}</div>
        </div>
        {values}
      </CardContent>
    </Card>
  );
};

export interface AppTranslationsScreenProps {
  /** The hooks of `createTranslationsApi`. */
  api: TranslationsApi;
  /** Where the filters and the sort live (`id`, `key`, `translation`, `sort`); the host's URL adapter, else component state. */
  urlStateAdapter?: UrlStateAdapter;
  /** Where the drawer lives (`edit`, `create`); the host's drawer adapter, else component state. */
  drawerUrlAdapter?: EntityDrawerUrlAdapter;
  title?: ReactNode;
  description?: ReactNode;
  /** Drawn inside another page (a showcase): no full-height page frame (`EntityListPage.asSpecimen`). */
  asSpecimen?: boolean;
  /**
   * The link of a key (its own route, e.g. one that redirects to `?edit=<id>`), as the browser's URL. The key is a
   * link either way: a plain click opens the drawer in place, a modified or middle click follows the link (a new tab).
   * Default: `?<edit parameter>=<id>`.
   */
  keyHref?: (key: AppTranslationKey) => string;
  /** The host's buttons in the header, after "Generate all missing" (outline buttons). */
  headerActions?: ReactNode;
  /** Items of the header's overflow menu (`MoreActionsMenu`). */
  moreActions?: readonly MoreActionItem[];
  /** Content at the end of the list toolbar (scope pickers, a toggle). */
  toolbarTrailing?: ReactNode;
  /** The columns of the table from the package's (`id`, `key`, `translations`, `actions`): add, reorder or replace. */
  columns?: (defaultColumns: EntityListColumn<AppTranslationKey>[]) => EntityListColumn<AppTranslationKey>[];
  /** The host's own fields in the filter panel, after ID and Translation (their state is the host's). */
  extraFilters?: ReactNode;
  /** How many of the host's filters are set (adds to the Filters badge). */
  extraActiveFilterCount?: number;
  /** Clears the host's filters with "Clear filters" (which keeps the toolbar search). */
  onClearExtraFilters?: () => void;
  /** Draws a key's card (below `md` and in the card view) instead of the package's. */
  renderCard?: EntityCardRenderer<AppTranslationKey>;
  /** The view (`table` / `grid`): controlled with `onDisplayModeChange` (e.g. `useListViewParam`), else component state. */
  displayMode?: ListDisplayMode;
  onDisplayModeChange?: (mode: ListDisplayMode) => void;
  /**
   * The list query instead of `api.useAppTranslationKeysQuery` (wrap it: another order, rows narrowed or enriched).
   * It gets the arguments `buildAppTranslationKeysListArgs` builds plus `top` / `skip`.
   */
  useListQuery?: ListQueryHook<TranslationsListArg, AppTranslationKeysResponse>;
  /** Values shown per key before "+N" (default 4; 0 shows all). */
  valuesPreviewCount?: number;
  /** A leading `#` column (default true). */
  showRowIndex?: boolean;
  /** URL parameter of the edited key (default `edit`). */
  drawerEditKey?: string;
  /** URL parameter of the create form (default `create`). */
  drawerCreateKey?: string;
  /** Other URL parameter names of the list (`{ id: 'keyId' }` keeps the id filter apart from a host's `id`). */
  urlParamNames?: AppTranslationsUrlParamNames;
}

/**
 * The app translation keys (the `__()` texts stored in the database): completeness per active locale with the
 * generation per locale and style on top, "Generate all missing", the keys table (row number, id, key with hint and
 * flags, the values as `locale::style`, the first four with "+N", a delete per row), newest first or sorted by id or
 * key, 50 per page; cards below `md` and in the card view. Key search in the toolbar, id and translation in the filters
 * ("Clear filters" keeps the search). Rows can be selected for a bulk delete (the application's bulk endpoint when the
 * api has it, else one DELETE per key; failures are skipped and summarised). A row opens the key in the drawer (by
 * pointer, or Enter / Space on the focused row); the key itself is a link to it (`keyHref`). Add creates there.
 * Writes follow `WriteAccessProvider`. Host slots: `headerActions`, `moreActions`, `toolbarTrailing`, `columns`,
 * `extraFilters`, `renderCard`, `useListQuery`.
 */
export const AppTranslationsScreen = ({
  api,
  urlStateAdapter,
  drawerUrlAdapter,
  title,
  description,
  asSpecimen,
  keyHref,
  headerActions,
  moreActions,
  toolbarTrailing,
  columns: transformColumns,
  extraFilters,
  extraActiveFilterCount = 0,
  onClearExtraFilters,
  renderCard,
  displayMode: displayModeProp,
  onDisplayModeChange,
  useListQuery,
  valuesPreviewCount = DEFAULT_VALUES_PREVIEW_COUNT,
  showRowIndex = true,
  drawerEditKey = 'edit',
  drawerCreateKey = 'create',
  urlParamNames,
}: AppTranslationsScreenProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const memory = useMemoryUrlState();
  const drawer = useEntityDrawer({ adapter: drawerUrlAdapter ?? memory.drawerUrlAdapter, editKey: drawerEditKey, createKey: drawerCreateKey });
  const baseAdapter = urlStateAdapter ?? memory.urlStateAdapter;
  const paramNamesKey = JSON.stringify(urlParamNames ?? {});
  // biome-ignore lint/correctness/useExhaustiveDependencies: the names are compared by value (an inline object each render)
  const listAdapter = useMemo(() => (urlParamNames ? renameUrlStateKeys(baseAdapter, urlParamNames) : baseAdapter), [baseAdapter, paramNamesKey]);
  const listState = useUrlListState(APP_TRANSLATION_KEY_FILTER_KEYS, { adapter: listAdapter, uncounted: UNCOUNTED });
  const sortState = useUrlListState(SORT_KEYS, { adapter: listAdapter, uncounted: SORT_KEYS });
  const { values, debounced, setValue, setValues } = listState;
  const sort = parseListSort(sortState.values.sort, APP_TRANSLATION_KEY_SORT_KEYS) ?? DEFAULT_APP_TRANSLATION_KEY_SORT;
  const debouncedSort = parseListSort(sortState.debounced.sort, APP_TRANSLATION_KEY_SORT_KEYS);
  const setSort = (next: EntityListSort | null) => {
    const isDefault = !next || (next.key === DEFAULT_APP_TRANSLATION_KEY_SORT.key && next.direction === DEFAULT_APP_TRANSLATION_KEY_SORT.direction);
    sortState.setValue('sort', isDefault ? '' : formatListSort(next));
  };

  const [ownDisplayMode, setOwnDisplayMode] = useState<ListDisplayMode>('table');
  const displayMode = displayModeProp ?? ownDisplayMode;
  const setDisplayMode = onDisplayModeChange ?? setOwnDisplayMode;

  const filterString = buildAppTranslationKeysFilter(debounced);
  const sortText = formatListSort(debouncedSort);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the filter string and the sort text carry the arguments
  const listArgs = useMemo(() => buildAppTranslationKeysListArgs(debounced, debouncedSort), [filterString, sortText]);
  const list = useGrowingWindowList({
    useListQuery: useListQuery ?? api.useAppTranslationKeysQuery,
    args: listArgs,
    extractItems: extractKeys,
    pageSize: APP_TRANSLATION_KEYS_PAGE_SIZE,
    resetKey: `${filterString ?? ''}|${sortText}`,
  });
  const languagesQuery = api.useLanguagesQuery(APP_TRANSLATIONS_LANGUAGES_ARG);
  const languageCodes = useMemo(() => toLanguageCodeMap(languagesQuery.data?.languages.elements ?? []), [languagesQuery.data]);
  const localesQuery = api.useLocalesQuery(ACTIVE_LOCALES_WITH_COUNTRIES_ARG);
  const countryCodes = useMemo(() => toCountryCodeMap(localesQuery.data?.locales.elements ?? []), [localesQuery.data]);

  const [generateAll, generateAllState] = api.useGenerateAllAppTranslationsMutation();
  const [deleteKey] = api.useDeleteAppTranslationKeyMutation();
  const useBulkDelete = api.useBulkDeleteAppTranslationKeysMutation;
  const bulkDelete = useBulkDelete?.()[0];
  const [isDeleting, setIsDeleting] = useState(false);
  const confirm = useConfirm();

  const selection = useRowSelection({
    items: list.items,
    getKey: keyIdOf,
    resetKey: `${filterString ?? ''}|${sortText}`,
    disabled: isDeleting,
    rowLabel: key => t('Select key %id%', { replacements: { id: String(key.id) } }),
  });

  const deleteLabels: SequentialSummaryLabels = {
    progress: t('Deleting', { context: 'bulk-progress' }),
    done: t('Deleted', { context: 'bulk-done' }),
    noun: t('key', { context: 'translation-key-noun' }),
    nounPlural: t('keys', { context: 'translation-key-noun' }),
  };

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
      if (bulkDelete) {
        const response = await bulkDelete({ appTranslationKeyIds: ids }).unwrap();
        const deleted = Math.min(response.deletedCount ?? ids.length, ids.length);
        const skipped = Math.max(response.skippedCount ?? ids.length - deleted, 0);
        notify.success(bulkSummaryText({ succeeded: deleted, failed: 0, skipped, total: ids.length }, deleteLabels));
      } else {
        await runSequentialWithSummary(ids, id => deleteKey({ appTranslationKeyId: id }).unwrap(), deleteLabels);
      }
      selection.clear();
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to delete keys')).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteOne = async (key: AppTranslationKey) => {
    const id = keyIdOf(key);
    if (!writeAccess.allowed || id === null) return;
    const confirmed = await confirm({
      title: t('Delete the key “%key%”?', { replacements: { key: key.key ?? id } }),
      description: t('The key and all its values are deleted. This cannot be undone.'),
      confirmLabel: t('Delete', { context: 'action' }),
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteKey({ appTranslationKeyId: id }).unwrap();
      notify.success(t('Key deleted'));
      if (drawer.editId === id) drawer.close();
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to delete key')).message);
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

  const { openEdit, editLinkClick } = drawer;
  const rowAction = useCallback(
    (key: AppTranslationKey) => {
      const id = keyIdOf(key);
      return id === null ? null : () => openEdit(id);
    },
    [openEdit]
  );
  const hrefOf = (key: AppTranslationKey): string | null => {
    const id = keyIdOf(key);
    if (id === null) return null;
    return keyHref ? keyHref(key) : `?${encodeURIComponent(drawerEditKey)}=${encodeURIComponent(id)}`;
  };
  const keyLinkOf = (key: AppTranslationKey) => {
    const id = keyIdOf(key);
    return <KeyLink item={key} href={hrefOf(key)} onClick={id === null ? undefined : editLinkClick(id)} />;
  };
  const valuesOf = (key: AppTranslationKey) => (
    <KeyValues item={key} languageCodes={languageCodes} countryCodes={countryCodes} previewCount={valuesPreviewCount} />
  );
  const actionsOf = (key: AppTranslationKey) =>
    keyIdOf(key) === null ? null : (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('Delete the key %key%', { replacements: { key: key.key ?? String(key.id) } })}
        title={writeAccess.allowed ? undefined : writeAccess.reason}
        disabled={!writeAccess.allowed || isDeleting}
        onClick={() => void deleteOne(key)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 aria-hidden />
      </Button>
    );

  const defaultColumns: EntityListColumn<AppTranslationKey>[] = [
    { id: 'id', header: m('ID'), cell: key => <IdCell id={key.id} copyable />, className: 'w-20', sortKey: 'id', sortStart: 'desc' },
    {
      id: 'key',
      header: m('Key'),
      cell: key => (
        <div className="min-w-0">
          {keyLinkOf(key)}
          {key.translationHint && <div className="mt-0.5 text-xs text-muted-foreground">{t('Hint: %hint%', { replacements: { hint: key.translationHint } })}</div>}
          <KeyFlags item={key} />
        </div>
      ),
      className: 'min-w-64 max-w-md whitespace-normal',
      sortKey: 'key',
    },
    { id: 'translations', header: m('Translations'), cell: valuesOf, className: 'min-w-72' },
    {
      id: 'actions',
      header: <span className="sr-only">{t('Actions', { context: 'table-column' })}</span>,
      cell: actionsOf,
      className: 'w-14',
    },
  ];
  const columns = transformColumns ? transformColumns(defaultColumns) : defaultColumns;

  const cardRenderer: EntityCardRenderer<AppTranslationKey> =
    renderCard ??
    (({ item, onActivate }) => <KeyCard item={item} onActivate={onActivate} keyLink={keyLinkOf(item)} values={valuesOf(item)} actions={actionsOf(item)} />);

  const clearFilters = () => {
    setValues({ id: '', translation: '' });
    onClearExtraFilters?.();
  };
  const isFiltered = listState.isActive || extraActiveFilterCount > 0;
  const addAction = (
    <AddEntityButton entity={m('Translation key')} onClick={drawer.openCreate} />
  );
  const emptyAddAction = (
    <Button type="button" variant="outline" size="sm" onClick={drawer.openCreate} disabled={!writeAccess.allowed} title={writeAccess.allowed ? undefined : writeAccess.reason}>
      {t('Add key')}
    </Button>
  );

  return (
    <EntityListPage
      asSpecimen={asSpecimen}
      title={title ?? t('App translations')}
      description={description ?? t('Translation keys of the apps and the backend, stored in the database, with their values per locale and writing style.')}
      headerActions={
        <PageToolbar moreActions={moreActions} primaryAction={addAction}>
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
          {headerActions}
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
              {extraFilters}
            </FilterPanel>
          }
          activeFilterCount={listState.activeFilterCount + extraActiveFilterCount}
          onClearFilters={clearFilters}
          trailing={toolbarTrailing}
          viewToggle={<EntityListViewToggle displayMode={displayMode} onDisplayModeChange={setDisplayMode} />}
          bulkBar={
            <EntityListBulkBar selection={selection} onDelete={() => void deleteSelected()} deleteBusy={isDeleting} busy={isDeleting} />
          }
        />
      }
    >
      <EntityListBody
        displayMode={displayMode}
        columns={columns}
        renderCard={cardRenderer}
        items={list.items}
        getRowKey={key => String(key.id)}
        rowAction={rowAction}
        rowKeyboardActivation
        selection={selection}
        sort={sort}
        onSortChange={setSort}
        showRowIndex={showRowIndex}
        isLoading={list.isLoading}
        isFetchingMore={list.isFetchingMore}
        hasMore={list.hasMore}
        onLoadMore={list.loadMore}
        emptyMessage={t('No translation keys found')}
        noResultsMessage={t('No keys match your search')}
        emptyAction={emptyAddAction}
        isSearchActive={isFiltered}
        onClearSearch={() => {
          listState.clear();
          onClearExtraFilters?.();
        }}
        loadingMessage={t('Loading translation keys')}
        error={list.isError ? t('The translation keys could not be loaded.') : undefined}
      />
      <AppTranslationKeyDrawer api={api} drawer={drawer} />
    </EntityListPage>
  );
};
