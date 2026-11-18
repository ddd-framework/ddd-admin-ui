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
import { FilterMultiSelect, FilterPanel, FilterSelect, FilterText } from '../list/filters.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import type { EntityCardProps, EntityCardRenderer } from '../list/types.ts';
import type { ListDisplayMode } from '../logic/pure/displayMode.ts';
import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import { type EntityListSort, formatListSort, parseListSort } from '../logic/pure/listSort.ts';
import { ENTITY_DRAWER_CREATE_VALUE } from '../logic/react/useEntityDrawer.ts';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { cn } from '../primitives/cn.ts';
import type { AppTranslationKey, AppTranslationKeysResponse, AppTranslationValue, TranslationsListArg } from './adminTypes.ts';
import {
  appTranslationValueCountryCode,
  appTranslationValueLocaleKey,
  type CountryCodeMap,
  type LanguageCodeMap,
  sortAppTranslationValues,
  toCountryCodeMap,
  toLanguageCodeMap,
} from './adminFormat.ts';
import type { AppTranslationKeysBulkDeleteCounts, AppTranslationKeysBulkDeleteResponse, TranslationsApi } from './api.ts';
import {
  ACTIVE_LOCALES_WITH_COUNTRIES_ARG,
  APP_TRANSLATION_KEY_FILTER_KEYS,
  APP_TRANSLATION_KEY_LANGUAGE_FILTER_KEYS,
  APP_TRANSLATION_KEY_SORT_KEYS,
  APP_TRANSLATION_KEYS_PAGE_SIZE,
  APP_TRANSLATIONS_LANGUAGES_ARG,
  appTranslationKeysLanguageIds,
  buildAppTranslationKeysFilter,
  buildAppTranslationKeysListArgs,
  DEFAULT_APP_TRANSLATION_KEY_SORT,
  renameUrlStateKeys,
} from './appTranslationsList.ts';
import { AppTranslationKeyDrawer } from './AppTranslationKeyDrawer.tsx';
import {
  type AppTranslationsGenerationEstimateRenderer,
  type AppTranslationsGenerationPreviewLoader,
  type AppTranslationsGenerationScope,
  GenerationEstimate,
  startGenerationPreview,
} from './GenerationEstimate.tsx';
import { TranslationCompleteness } from './TranslationCompleteness.tsx';

/** The toolbar search (key) is not a panel filter. */
const UNCOUNTED = ['key'] as const;
const SORT_KEYS = ['sort'] as const;
/** Values shown per key before "+N" (the rest opens in place). */
const DEFAULT_VALUES_PREVIEW_COUNT = 4;

/** The package columns' ids and sort keys without cells: what the host's `columns` transform is asked for its sort keys. */
const SORT_PROBE_COLUMNS: EntityListColumn<AppTranslationKey>[] = [
  { id: 'id', header: 'ID', cell: () => null, sortKey: 'id', sortStart: 'desc' },
  { id: 'key', header: 'Key', cell: () => null, sortKey: 'key' },
  { id: 'translations', header: 'Translations', cell: () => null },
  { id: 'actions', header: '', cell: () => null },
];

const extractKeys = (data: AppTranslationKeysResponse): AppTranslationKey[] => data.appTranslationKeys.elements ?? [];
const keyIdOf = (key: AppTranslationKey): string | null => (key.id === null || key.id === undefined || key.id === '' ? null : String(key.id));

/** The URL parameter names of the keys list (`id`, `key`, `translation`, `language`, `sort`); an unnamed one keeps its own. */
export type AppTranslationsUrlParamNames = Partial<Record<'id' | 'key' | 'translation' | 'language' | 'sort', string>>;

/** The package's parts of a key's card (`AppTranslationsScreen.renderCard` gets them to reuse). */
export interface AppTranslationKeyCardParts {
  /** The key as a link to its drawer (or text without an id). */
  keyLink: ReactNode;
  /** The values as `locale::style`, the first few with "+N". */
  values: ReactNode;
  /** The row actions (`rowActions` applied). */
  actions: ReactNode;
  /** The package's whole card with these parts (and `cardFooter`). */
  card: ReactNode;
}

/** `AppTranslationsScreen.renderCard`: the card props plus the package's parts (an `EntityCardRenderer` fits too). */
export type AppTranslationKeyCardRenderer = (props: EntityCardProps<AppTranslationKey> & { parts: AppTranslationKeyCardParts }) => ReactNode;

/**
 * The sort select of the card view (`AppTranslationsScreen.cardSort`): labels of sort keys (a host column's
 * `sortKey` → its name); without one a key's label is its column's text header, else the key itself.
 */
export interface AppTranslationKeysCardSortOptions {
  labels?: Readonly<Record<string, string>>;
}

/** The list arguments as the screen builds them (filters, expand, order), before `transformListArgs`. */
export type AppTranslationKeysListArgs = Omit<TranslationsListArg, 'top' | 'skip'>;

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
  footer?: ReactNode;
}

/** The card of a key (below `md`, and in the card view): id, key with hint and flags, the values, the row actions. */
const KeyCard = ({ item, onActivate, keyLink, values, actions, footer }: KeyCardProps) => {
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
        {footer !== undefined && footer !== null && <div data-slot="app-translation-key-card-footer">{footer}</div>}
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
  /**
   * Draws a key's card (below `md` and in the card view) instead of the package's; it also gets the package's parts
   * (`parts.keyLink`, `parts.values`, `parts.actions`, `parts.card`) to reuse.
   */
  renderCard?: AppTranslationKeyCardRenderer;
  /** Content at the bottom of the package's card (a status line, links). */
  cardFooter?: (key: AppTranslationKey) => ReactNode;
  /** The row actions of a key (table column and card) from the package's (its delete button): add, wrap or replace. */
  rowActions?: (key: AppTranslationKey, defaultActions: ReactNode) => ReactNode;
  /**
   * Changes the list request (filters joined, another expand, a scope) before it is sent; keep it stable
   * (`useCallback`). Gets the arguments the screen builds (filters, expand, order) without `top` / `skip`.
   */
  transformListArgs?: (args: AppTranslationKeysListArgs) => AppTranslationKeysListArgs;
  /**
   * A "Has a value in" filter in the panel (default `false`): keys with a value in the chosen language (a root filter on
   * the values), each row showing that language's values only (the same filter on the expand). URL key `language`.
   * `"multiple"`: a multi-select, "Has a value in any of these languages" (`in` on the root filter and the expand; the
   * URL key holds the ids comma-separated, one id filters as the single variant).
   */
  languageFilter?: boolean | 'multiple';
  /**
   * A sort select in the toolbar while the keys show as cards (the card view, and the cards below `md`): the package's
   * sort keys (ID, Key) and the `sortKey`s of the host's columns, each ascending and descending. Default `false`.
   */
  cardSort?: boolean | AppTranslationKeysCardSortOptions;
  /**
   * Loads the host's estimate when a generation's confirmation opens (`AppTranslationsGenerationScope`: one locale and
   * style from the completeness block, or `{ kind: 'all' }`); the answer goes to `renderGenerationEstimate`.
   */
  loadGenerationPreview?: AppTranslationsGenerationPreviewLoader;
  /**
   * Host content in the confirmation before a generation (completeness block and "Generate all missing"), with a
   * skeleton while `loadGenerationPreview` loads and the error when it fails. With it "Generate all missing" asks
   * first too (without it, it starts on the click as before).
   */
  renderGenerationEstimate?: AppTranslationsGenerationEstimateRenderer;
  /** Changes with the host's own filters (`extraFilters`): the list window and the selection start over. */
  extraResetKey?: string;
  /** "Generate all missing" in the header (default `true`). */
  showGenerateAll?: boolean;
  /** The completeness per locale above the list (default `true`). */
  showCompleteness?: boolean;
  /** The bulk delete's counts from its answer; default the api's `mapBulkDeleteResponse`, else the top-level counts. */
  mapBulkDeleteResponse?: (response: AppTranslationKeysBulkDeleteResponse) => AppTranslationKeysBulkDeleteCounts;
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
  /** Value of the create parameter that opens the create form (default `ENTITY_DRAWER_CREATE_VALUE`, `1`). */
  drawerCreateValue?: string;
  /** The drawer's value rows edit their language and country too (`AppTranslationKeyDrawer.editableValueLocale`). */
  editableValueLocale?: boolean;
  /** The host's actions of one stored value in the drawer (`AppTranslationKeyDrawer.valueActions`). */
  valueActions?: (value: AppTranslationValue, key: AppTranslationKey) => ReactNode;
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
  drawerCreateValue = ENTITY_DRAWER_CREATE_VALUE,
  urlParamNames,
  cardFooter,
  rowActions,
  transformListArgs,
  languageFilter = false,
  cardSort = false,
  loadGenerationPreview,
  renderGenerationEstimate,
  extraResetKey = '',
  showGenerateAll = true,
  showCompleteness = true,
  mapBulkDeleteResponse,
  editableValueLocale,
  valueActions,
}: AppTranslationsScreenProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const memory = useMemoryUrlState();
  const drawer = useEntityDrawer({
    adapter: drawerUrlAdapter ?? memory.drawerUrlAdapter,
    editKey: drawerEditKey,
    createKey: drawerCreateKey,
    createValue: drawerCreateValue,
  });
  const baseAdapter = urlStateAdapter ?? memory.urlStateAdapter;
  const paramNamesKey = JSON.stringify(urlParamNames ?? {});
  // biome-ignore lint/correctness/useExhaustiveDependencies: the names are compared by value (an inline object each render)
  const listAdapter = useMemo(() => (urlParamNames ? renameUrlStateKeys(baseAdapter, urlParamNames) : baseAdapter), [baseAdapter, paramNamesKey]);
  const listState = useUrlListState(APP_TRANSLATION_KEY_FILTER_KEYS, { adapter: listAdapter, uncounted: UNCOUNTED });
  const sortState = useUrlListState(SORT_KEYS, { adapter: listAdapter, uncounted: SORT_KEYS });
  const languageState = useUrlListState(APP_TRANSLATION_KEY_LANGUAGE_FILTER_KEYS, { adapter: listAdapter });
  const multipleLanguages = languageFilter === 'multiple';
  // one id as the single variant sends it; with `multiple` the comma-separated ids of the URL key
  const languageSelection: string | readonly string[] = !languageFilter
    ? ''
    : multipleLanguages
      ? appTranslationKeysLanguageIds(languageState.debounced.language.split(','))
      : languageState.debounced.language;
  const languageId = typeof languageSelection === 'string' ? languageSelection : languageSelection.join(',');
  const { values, debounced, setValue, setValues } = listState;
  // the package's sort keys plus the `sortKey`s of the host's columns (sent as `<sortKey> <direction>, id <direction>`);
  // read from the host's transform of the package columns' shape (their cells are drawn below)
  const hostSortKeys = transformColumns
    ? transformColumns(SORT_PROBE_COLUMNS).flatMap(column => (column.sortKey === undefined ? [] : [column.sortKey]))
    : [];
  const sortKeys = [...new Set([...APP_TRANSLATION_KEY_SORT_KEYS, ...hostSortKeys])];
  const sort = parseListSort(sortState.values.sort, sortKeys) ?? DEFAULT_APP_TRANSLATION_KEY_SORT;
  const debouncedSort = parseListSort(sortState.debounced.sort, sortKeys);
  const setSort = (next: EntityListSort | null) => {
    const isDefault = !next || (next.key === DEFAULT_APP_TRANSLATION_KEY_SORT.key && next.direction === DEFAULT_APP_TRANSLATION_KEY_SORT.direction);
    sortState.setValue('sort', isDefault ? '' : formatListSort(next));
  };

  const [ownDisplayMode, setOwnDisplayMode] = useState<ListDisplayMode>('table');
  const displayMode = displayModeProp ?? ownDisplayMode;
  const setDisplayMode = onDisplayModeChange ?? setOwnDisplayMode;

  const filterString = buildAppTranslationKeysFilter(debounced);
  const sortText = formatListSort(debouncedSort);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the filter string, the language and the sort text carry the arguments
  const listArgs = useMemo(() => {
    const built = buildAppTranslationKeysListArgs({ ...debounced, language: languageSelection }, debouncedSort);
    return transformListArgs ? transformListArgs(built) : built;
  }, [filterString, sortText, languageId, transformListArgs]);
  const resetKey = `${filterString ?? ''}|${sortText}${languageId ? `|language:${languageId}` : ''}${extraResetKey ? `|${extraResetKey}` : ''}`;
  const list = useGrowingWindowList({
    useListQuery: useListQuery ?? api.useAppTranslationKeysQuery,
    args: listArgs,
    extractItems: extractKeys,
    pageSize: APP_TRANSLATION_KEYS_PAGE_SIZE,
    resetKey,
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
    resetKey,
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
        const raw = await bulkDelete({ appTranslationKeyIds: ids }).unwrap();
        const mapCounts = mapBulkDeleteResponse ?? api.mapBulkDeleteResponse;
        const response = mapCounts ? mapCounts(raw) : raw;
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
    if (renderGenerationEstimate) {
      const scope: AppTranslationsGenerationScope = { kind: 'all' };
      const preview = loadGenerationPreview ? startGenerationPreview(() => loadGenerationPreview(scope)) : Promise.resolve(undefined);
      const confirmed = await confirm({
        title: t('Generate every missing value?'),
        description: (
          <div>
            <p>{t('Every missing value of every active locale and writing style is generated. The generation runs in the background.')}</p>
            <GenerationEstimate preview={preview} scope={scope} render={renderGenerationEstimate} />
          </div>
        ),
        confirmLabel: t('Generate', { context: 'action' }),
      });
      if (!confirmed) return;
    }
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
  const defaultActionsOf = (key: AppTranslationKey) =>
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
  const actionsOf = (key: AppTranslationKey) => (rowActions ? rowActions(key, defaultActionsOf(key)) : defaultActionsOf(key));

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

  const cardSortLabels = typeof cardSort === 'object' ? (cardSort.labels ?? {}) : {};
  const sortLabelOf = (sortKey: string): string => {
    const named = cardSortLabels[sortKey];
    if (named) return named;
    const header = columns.find(column => column.sortKey === sortKey)?.header;
    return typeof header === 'string' && header !== '' ? t(header) : sortKey;
  };
  const cardSortValue = formatListSort(sort);
  const cardSortControl = cardSort ? (
    <div className={cn('shrink-0', displayMode !== 'grid' && 'md:hidden')} data-slot="app-translation-keys-card-sort">
      <Select
        value={cardSortValue}
        onValueChange={next => {
          const parsed = parseListSort(next, sortKeys);
          if (parsed) setSort(parsed);
        }}
      >
        <SelectTrigger size="sm" aria-label={t('Sort by')} className="h-8 w-auto min-w-40 text-[13px] font-bold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortKeys.flatMap(sortKey =>
            (['asc', 'desc'] as const).map(direction => {
              const value = formatListSort({ key: sortKey, direction });
              const label = sortLabelOf(sortKey);
              return (
                <SelectItem key={value} value={value}>
                  {direction === 'asc'
                    ? t('%label%, ascending', { replacements: { label } })
                    : t('%label%, descending', { replacements: { label } })}
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </div>
  ) : null;

  const cardRenderer: EntityCardRenderer<AppTranslationKey> = props => {
    const { item, onActivate } = props;
    const keyLink = keyLinkOf(item);
    const keyValues = valuesOf(item);
    const actions = actionsOf(item);
    const card = <KeyCard item={item} onActivate={onActivate} keyLink={keyLink} values={keyValues} actions={actions} footer={cardFooter?.(item)} />;
    return renderCard ? renderCard({ ...props, parts: { keyLink, values: keyValues, actions, card } }) : card;
  };

  const clearFilters = () => {
    setValues({ id: '', translation: '' });
    if (languageFilter) languageState.clear();
    onClearExtraFilters?.();
  };
  const languageFilterActive = Boolean(languageFilter) && languageState.values.language !== '';
  const isFiltered = listState.isActive || (Boolean(languageFilter) && languageState.isActive) || extraActiveFilterCount > 0;
  const languageOptions = useMemo(
    () =>
      (languagesQuery.data?.languages.elements ?? []).flatMap(language =>
        language.id === null || language.id === undefined ? [] : [{ value: String(language.id), label: language.name || language.languageCode || String(language.id) }]
      ),
    [languagesQuery.data]
  );
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
          {showGenerateAll && (
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
          )}
          {headerActions}
        </PageToolbar>
      }
      belowHeader={
        showCompleteness ? (
          <TranslationCompleteness api={api} loadGenerationPreview={loadGenerationPreview} renderGenerationEstimate={renderGenerationEstimate} />
        ) : undefined
      }
      toolbar={
        <EntityListToolbar
          search={{ value: values.key, onChange: value => setValue('key', value), placeholder: t('Search keys…'), 'aria-label': t('Filter by key') }}
          filters={
            <FilterPanel>
              <FilterText label={t('ID')} inputMode="numeric" value={values.id} onChange={value => setValue('id', value)} />
              <FilterText label={t('Translation')} value={values.translation} onChange={value => setValue('translation', value)} placeholder={t('Search translations…')} />
              {multipleLanguages && (
                <FilterMultiSelect
                  label={t('Has a value in any of these languages')}
                  value={languageState.getList('language')}
                  onChange={next => languageState.setList('language', next)}
                  options={languageOptions}
                  allLabel={t('Any language')}
                  isLoading={languagesQuery.isFetching && !languagesQuery.data}
                />
              )}
              {languageFilter && !multipleLanguages && (
                <FilterSelect
                  label={t('Has a value in')}
                  value={languageState.values.language}
                  onChange={value => languageState.setValue('language', value)}
                  options={languageOptions}
                  allLabel={t('Any language')}
                  isLoading={languagesQuery.isFetching && !languagesQuery.data}
                />
              )}
              {extraFilters}
            </FilterPanel>
          }
          activeFilterCount={listState.activeFilterCount + (languageFilterActive ? 1 : 0) + extraActiveFilterCount}
          onClearFilters={clearFilters}
          trailing={
            cardSortControl ? (
              <>
                {cardSortControl}
                {toolbarTrailing}
              </>
            ) : (
              toolbarTrailing
            )
          }
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
          if (languageFilter) languageState.clear();
          onClearExtraFilters?.();
        }}
        loadingMessage={t('Loading translation keys')}
        error={list.isError ? t('The translation keys could not be loaded.') : undefined}
      />
      <AppTranslationKeyDrawer api={api} drawer={drawer} editableValueLocale={editableValueLocale} valueActions={valueActions} />
    </EntityListPage>
  );
};
