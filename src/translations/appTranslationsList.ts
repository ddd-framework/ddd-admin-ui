import { buildContainsFilter, buildFieldFilter, buildInFilter, buildIntEqFilter, combineFilters, sanitizeSearchInput } from '@mgamadeus/ddd-web/query';

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

/**
 * The URL key of the keys list's "has a value in language" filter (`AppTranslationsScreen.languageFilter`): a language
 * id, or with `languageFilter="multiple"` a comma-separated list of ids.
 */
export const APP_TRANSLATION_KEY_LANGUAGE_FILTER_KEYS = ['language'] as const;

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

/**
 * `orderBy` of a sort: `id DESC` (the default), `id ASC`, `key ASC, id ASC` (ties stay stable); a host column's own
 * `sortKey` (a property of the key, `created`) the same way: `created DESC, id DESC`.
 */
export const appTranslationKeysOrderBy = (sort: EntityListSort | null | undefined): string => {
  const effective = sort ?? DEFAULT_APP_TRANSLATION_KEY_SORT;
  const direction = effective.direction === 'asc' ? 'ASC' : 'DESC';
  return effective.key === 'id' ? `id ${direction}` : `${effective.key} ${direction}, id ${direction}`;
};

/**
 * The language selection of "has a value in": one language id (`languageFilter`, as the URL holds it), or a list of ids
 * (`languageFilter="multiple"`).
 */
export type AppTranslationKeysLanguageSelection = string | readonly string[] | null | undefined;

const DIGITS = /^\d+$/;

/** The ids of a list selection: trimmed, whole numbers only, each once, in their order. */
export const appTranslationKeysLanguageIds = (languageIds: readonly string[]): string[] => [
  ...new Set(languageIds.map(id => id.trim()).filter(id => DIGITS.test(id))),
];

/**
 * The filter on `property` for a selection: one id as `eq` (as the single filter always sent it), several as `in`
 * (a value in any of them), nothing without one.
 */
const languageSelectionFilter = (selection: AppTranslationKeysLanguageSelection, property: string): string | undefined => {
  if (selection === null || selection === undefined) return undefined;
  if (typeof selection === 'string') return buildIntEqFilter(selection.trim(), property);
  const ids = appTranslationKeysLanguageIds(selection);
  if (ids.length === 0) return undefined;
  if (ids.length === 1) return buildIntEqFilter(ids[0] ?? '', property);
  return buildInFilter(property, ids);
};

/**
 * The root filter of "has a value in": keys with at least one value in the language (by language id), or with a list
 * in any of the languages (`appTranslationValues.languageId in ["3","5"]`).
 */
export const buildAppTranslationKeysLanguageFilter = (languageId: AppTranslationKeysLanguageSelection): string | undefined =>
  languageSelectionFilter(languageId, 'appTranslationValues.languageId');

/**
 * The expand of the keys list: the values, cut to the chosen language(s) when the "has a value in" filter is set
 * (`appTranslationValues(filters=languageId eq 3)`, with a list `languageId in [...]`), so a row shows those values only.
 */
export const appTranslationKeysExpand = (languageId?: AppTranslationKeysLanguageSelection): string => {
  const valueFilter = languageSelectionFilter(languageId, 'languageId');
  return valueFilter ? `appTranslationValues(filters=${valueFilter})` : 'appTranslationValues';
};

/**
 * The arguments of `useAppTranslationKeysQuery` without `top` / `skip` (the growing window adds them): the values
 * expanded, the order, the filters. With the default sort the order is `id DESC`, as the screen asked before sorting.
 */
export const buildAppTranslationKeysListArgs = (
  values: AppTranslationKeyFilterValues & { language?: AppTranslationKeysLanguageSelection },
  sort?: EntityListSort | null
): Omit<TranslationsListArg, 'top' | 'skip'> => {
  const filters = combineFilters(buildAppTranslationKeysFilter(values), buildAppTranslationKeysLanguageFilter(values.language));
  return { expand: appTranslationKeysExpand(values.language), orderBy: appTranslationKeysOrderBy(sort), ...(filters ? { filters } : {}) };
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
 * own `id` parameter). Keys without a name stay as they are; `restore` answers under the screen's keys and leaves out
 * a saved parameter under a renamed key's own name (the host's `id` never comes back as the id filter).
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
            if (!saved) return saved;
            const restored: Record<string, string> = {};
            for (const [urlKey, value] of Object.entries(saved)) {
              const screenKey = screenKeyOf.get(urlKey);
              if (screenKey !== undefined) restored[screenKey] = value;
              // a screen key renamed away: its own name in the URL is someone else's parameter
              else if (names[urlKey] === undefined || names[urlKey] === urlKey) restored[urlKey] = value;
            }
            return restored;
          },
        }
      : {}),
  };
};
