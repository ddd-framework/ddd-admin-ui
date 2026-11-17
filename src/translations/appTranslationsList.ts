import { buildContainsFilter, buildFieldFilter, buildIntEqFilter, combineFilters, sanitizeSearchInput } from '@mgamadeus/ddd-web/query';

import type { EntityListSort } from '../logic/pure/listSort.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import type { TranslationsListArg } from './adminTypes.ts';

/**
 * The request arguments of the package's translation screens, exported so a host hook (a wrapped list query, a
 * form's locales) asks with the same argument and shares the RTK Query cache entry instead of a second request.
 */

/** Keys per page of `AppTranslationsScreen` (the list grows by this many on scroll, up to 1000). */
export const APP_TRANSLATION_KEYS_PAGE_SIZE = 50;

/** The URL keys of the keys list's filters (`id`, `key` = the toolbar search, `translation`). */
export const APP_TRANSLATION_KEY_FILTER_KEYS = ['id', 'key', 'translation'] as const;
export type AppTranslationKeyFilterKey = (typeof APP_TRANSLATION_KEY_FILTER_KEYS)[number];
export type AppTranslationKeyFilterValues = Readonly<Record<AppTranslationKeyFilterKey, string>>;

/** The sortable columns of the keys list (`sortKey`). */
export const APP_TRANSLATION_KEY_SORT_KEYS = ['id', 'key'] as const;

/** The default order of the keys list: newest first. */
export const DEFAULT_APP_TRANSLATION_KEY_SORT: EntityListSort = { key: 'id', direction: 'desc' };

/** The filter string of the keys list (exact id, key and value text contained), undefined without one. */
export const buildAppTranslationKeysFilter = (values: AppTranslationKeyFilterValues): string | undefined =>
  combineFilters(
    buildIntEqFilter(values.id.trim(), 'id'),
    buildContainsFilter('key', sanitizeSearchInput(values.key)),
    buildContainsFilter('appTranslationValues.translation', sanitizeSearchInput(values.translation))
  );

/** `orderBy` of a sort: `id DESC` (the default), `id ASC`, `key ASC, id ASC` (ties stay stable). */
export const appTranslationKeysOrderBy = (sort: EntityListSort | null | undefined): string => {
  const effective = sort ?? DEFAULT_APP_TRANSLATION_KEY_SORT;
  const direction = effective.direction === 'asc' ? 'ASC' : 'DESC';
  return effective.key === 'key' ? `key ${direction}, id ${direction}` : `id ${direction}`;
};

/**
 * The arguments of `useAppTranslationKeysQuery` without `top` / `skip` (the growing window adds them): the values
 * expanded, the order, the filters. With the default sort the order is `id DESC`, as the screen asked before sorting.
 */
export const buildAppTranslationKeysListArgs = (
  values: AppTranslationKeyFilterValues,
  sort?: EntityListSort | null
): Omit<TranslationsListArg, 'top' | 'skip'> => {
  const filters = buildAppTranslationKeysFilter(values);
  return { expand: 'appTranslationValues', orderBy: appTranslationKeysOrderBy(sort), ...(filters ? { filters } : {}) };
};

/** The languages of the keys list (the language codes of the values). */
export const APP_TRANSLATIONS_LANGUAGES_ARG: TranslationsListArg = { top: 500 };

/** The active languages of the key drawer (the new value's language). */
export const ACTIVE_LANGUAGES_ARG: TranslationsListArg = { top: 500, filters: buildFieldFilter('isActive', '1') };

/** The active locales of `useContentLocales` (`useActiveLocales` reads the rows of the same entry). */
export const CONTENT_LOCALES_ARG: TranslationsListArg = {
  select: 'id,languageCode,countryShortCode,isActive',
  filters: buildFieldFilter('isActive', '1'),
  top: 500,
};

/** The active locales of the key drawer and the completeness: the countries and the language of each. */
export const ACTIVE_LOCALES_WITH_COUNTRIES_ARG: TranslationsListArg = {
  select: 'id,languageCode,languageId,countryId,countryShortCode,isActive',
  filters: buildFieldFilter('isActive', '1'),
  top: 500,
};

/**
 * A URL adapter whose keys carry other names in the URL (`{ id: 'keyId' }` keeps the id filter apart from a host's
 * own `id` parameter). Keys without a name stay as they are; `restore` answers under the screen's keys.
 */
export const renameUrlStateKeys = (adapter: UrlStateAdapter, names: Readonly<Partial<Record<string, string>>>): UrlStateAdapter => {
  const urlKeyOf = (key: string) => names[key] ?? key;
  const screenKeyOf = new Map(Object.entries(names).map(([key, name]) => [name ?? key, key]));
  const restore = adapter.restore;
  return {
    get: key => adapter.get(urlKeyOf(key)),
    replace: updates => adapter.replace(Object.fromEntries(Object.entries(updates).map(([key, value]) => [urlKeyOf(key), value]))),
    ...(restore
      ? {
          restore: () => {
            const saved = restore();
            return saved ? Object.fromEntries(Object.entries(saved).map(([key, value]) => [screenKeyOf.get(key) ?? key, value])) : saved;
          },
        }
      : {}),
  };
};
