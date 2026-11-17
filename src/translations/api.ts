import {
  type ApiMutationHook,
  type ApiQueryHook,
  type InjectableBaseApi,
  type InjectedEndpointDefinition,
  type InjectedRequest,
  injectEndpointsOnce,
  staticMutationHook,
  staticQueryHook,
  toQueryString,
  trimApiPrefix,
} from '../logic/pure/injectedApi.ts';
import type {
  AdminLanguage,
  AdminLocale,
  AppTranslationCompletenessResponse,
  AppTranslationKey,
  AppTranslationKeyArg,
  AppTranslationKeyResponse,
  AppTranslationKeysResponse,
  AppTranslationsGenerateAllResponse,
  AppTranslationsGenerateArg,
  AppTranslationsGenerateResponse,
  AppTranslationValue,
  AppTranslationValueResponse,
  LanguageResponse,
  LanguagesResponse,
  LocaleResponse,
  LocalesResponse,
  TranslateEntitiesArg,
  TranslateEntitiesResponse,
  TranslationsDeleteResponse,
  TranslationsListArg,
} from './adminTypes.ts';

/** Cache tag types of the translation operations. */
export const APP_TRANSLATIONS_TAG = 'AdminUiAppTranslations';
export const LANGUAGES_TAG = 'AdminUiLanguages';
export const LOCALES_TAG = 'AdminUiLocales';

/** The hooks `createTranslationsApi` returns; the translation screens take them as their `api`. */
export interface TranslationsApi {
  /** `GET {appTranslations}/keys/list` (QueryOptions). */
  useAppTranslationKeysQuery: ApiQueryHook<TranslationsListArg, AppTranslationKeysResponse>;
  /** `GET {appTranslations}/keys/{appTranslationKeyId}?expand=`. */
  useAppTranslationKeyQuery: ApiQueryHook<AppTranslationKeyArg, AppTranslationKeyResponse>;
  /** `PATCH {appTranslations}/keys` with `{ appTranslationKey }` (create without `id`, update with it). */
  useUpdateAppTranslationKeyMutation: ApiMutationHook<{ appTranslationKey: AppTranslationKey }, AppTranslationKeyResponse>;
  /** `DELETE {appTranslations}/keys/{appTranslationKeyId}`. */
  useDeleteAppTranslationKeyMutation: ApiMutationHook<{ appTranslationKeyId: string | number }, TranslationsDeleteResponse>;
  /** `PATCH {appTranslations}/values` with `{ appTranslationValue }`. */
  useUpdateAppTranslationValueMutation: ApiMutationHook<{ appTranslationValue: AppTranslationValue }, AppTranslationValueResponse>;
  /** `DELETE {appTranslations}/values/{appTranslationValueId}`. */
  useDeleteAppTranslationValueMutation: ApiMutationHook<{ appTranslationValueId: string | number }, TranslationsDeleteResponse>;
  /** `GET {appTranslations}/keys/completeness`: per active locale and writing style. */
  useAppTranslationCompletenessQuery: ApiQueryHook<void, AppTranslationCompletenessResponse>;
  /** `GET {appTranslations}/keys/generate/{localeId}?writingStyle=&previewOnly=` (a write: it starts a generation). */
  useGenerateAppTranslationsMutation: ApiMutationHook<AppTranslationsGenerateArg, AppTranslationsGenerateResponse>;
  /** `GET {appTranslations}/keys/generate-all` (a write: every missing value of every active locale). */
  useGenerateAllAppTranslationsMutation: ApiMutationHook<void, AppTranslationsGenerateAllResponse>;
  /** `GET {languages}/list` (QueryOptions). */
  useLanguagesQuery: ApiQueryHook<TranslationsListArg, LanguagesResponse>;
  /** `PATCH {languages}` with `{ language }`. */
  useUpdateLanguageMutation: ApiMutationHook<{ language: AdminLanguage }, LanguageResponse>;
  /** `GET {languages}/importFromConfig`: creates or updates every configured language. */
  useImportLanguagesFromConfigMutation: ApiMutationHook<void, LanguagesResponse>;
  /** `GET {locales}/list` (QueryOptions). */
  useLocalesQuery: ApiQueryHook<TranslationsListArg, LocalesResponse>;
  /** `PATCH {locales}` with `{ locale }`. */
  useUpdateLocaleMutation: ApiMutationHook<{ locale: AdminLocale }, LocaleResponse>;
  /** `GET {locales}/importFromConfig`: creates or updates every configured locale. */
  useImportLocalesFromConfigMutation: ApiMutationHook<void, LocalesResponse>;
  /** `POST {translations}/translateEntities`: AI-translates entities into locales (changes nothing stored). */
  useTranslateEntitiesMutation: ApiMutationHook<TranslateEntitiesArg, TranslateEntitiesResponse>;
}

/** Path segments below `apiPrefix`, as the application's controllers mount them. */
export interface TranslationsApiPaths {
  /** App translation keys, values and completeness (default `app-translations`). */
  appTranslations: string;
  /** Languages (default `languages`). */
  languages: string;
  /** Locales (default `locales`). */
  locales: string;
  /** Entity translation (default `translations`). */
  translations: string;
}

export const DEFAULT_TRANSLATIONS_API_PATHS: Readonly<TranslationsApiPaths> = Object.freeze({
  appTranslations: 'app-translations',
  languages: 'languages',
  locales: 'locales',
  translations: 'translations',
});

export interface CreateTranslationsApiOptions {
  /** The host's RTK Query api (`createApi` with the React hooks module). */
  baseApi: InjectableBaseApi;
  /** The common prefix of the controllers, without a trailing slash (`/api/admin/common`). */
  apiPrefix: string;
  /** Path segments that differ from `DEFAULT_TRANSLATIONS_API_PATHS`. */
  paths?: Partial<TranslationsApiPaths>;
}

const listQuery = ({ filters, orderBy, top, skip, select, expand }: TranslationsListArg): string =>
  toQueryString({ filters, orderBy, top, skip, select, expand });

const trimSegment = (segment: string): string => segment.replace(/^\/+|\/+$/g, '');

/** The request of every operation, on `apiPrefix` and the paths. Pure: no RTK runtime. */
export const buildTranslationsRequests = (apiPrefix: string, paths: Partial<TranslationsApiPaths> = {}) => {
  const prefix = trimApiPrefix(apiPrefix);
  const resolved = { ...DEFAULT_TRANSLATIONS_API_PATHS, ...paths };
  const appTranslations = `${prefix}/${trimSegment(resolved.appTranslations)}`;
  const languages = `${prefix}/${trimSegment(resolved.languages)}`;
  const locales = `${prefix}/${trimSegment(resolved.locales)}`;
  const translations = `${prefix}/${trimSegment(resolved.translations)}`;
  const id = (value: string | number) => encodeURIComponent(String(value));
  return {
    appTranslationKeys: (arg: TranslationsListArg): InjectedRequest => ({ url: `${appTranslations}/keys/list${listQuery(arg)}` }),
    appTranslationKey: ({ appTranslationKeyId, expand }: AppTranslationKeyArg): InjectedRequest => ({
      url: `${appTranslations}/keys/${id(appTranslationKeyId)}${toQueryString({ expand })}`,
    }),
    updateAppTranslationKey: (body: { appTranslationKey: AppTranslationKey }): InjectedRequest => ({ url: `${appTranslations}/keys`, method: 'PATCH', body }),
    deleteAppTranslationKey: ({ appTranslationKeyId }: { appTranslationKeyId: string | number }): InjectedRequest => ({
      url: `${appTranslations}/keys/${id(appTranslationKeyId)}`,
      method: 'DELETE',
    }),
    updateAppTranslationValue: (body: { appTranslationValue: AppTranslationValue }): InjectedRequest => ({
      url: `${appTranslations}/values`,
      method: 'PATCH',
      body,
    }),
    deleteAppTranslationValue: ({ appTranslationValueId }: { appTranslationValueId: string | number }): InjectedRequest => ({
      url: `${appTranslations}/values/${id(appTranslationValueId)}`,
      method: 'DELETE',
    }),
    appTranslationCompleteness: (): InjectedRequest => ({ url: `${appTranslations}/keys/completeness` }),
    generateAppTranslations: ({ localeId, writingStyle, previewOnly }: AppTranslationsGenerateArg): InjectedRequest => ({
      url: `${appTranslations}/keys/generate/${id(localeId)}${toQueryString({ writingStyle, previewOnly: previewOnly === undefined ? undefined : previewOnly ? 1 : 0 })}`,
    }),
    generateAllAppTranslations: (): InjectedRequest => ({ url: `${appTranslations}/keys/generate-all` }),
    languages: (arg: TranslationsListArg): InjectedRequest => ({ url: `${languages}/list${listQuery(arg)}` }),
    updateLanguage: (body: { language: AdminLanguage }): InjectedRequest => ({ url: languages, method: 'PATCH', body }),
    importLanguagesFromConfig: (): InjectedRequest => ({ url: `${languages}/importFromConfig` }),
    locales: (arg: TranslationsListArg): InjectedRequest => ({ url: `${locales}/list${listQuery(arg)}` }),
    updateLocale: (body: { locale: AdminLocale }): InjectedRequest => ({ url: locales, method: 'PATCH', body }),
    importLocalesFromConfig: (): InjectedRequest => ({ url: `${locales}/importFromConfig` }),
    translateEntities: (body: TranslateEntitiesArg): InjectedRequest => ({ url: `${translations}/translateEntities`, method: 'POST', body }),
  };
};

/**
 * The operations as injected (endpoint name → definition). Cache: each query provides its tag type; a key or value
 * write invalidates every app translation query (list, key, completeness); a language write or import invalidates the
 * languages; a locale write or import (the `isActive` toggle) the locales and the completeness (it counts active
 * locales); a generation the app translations. The entity translation invalidates nothing.
 */
export const translationsEndpointDefinitions = (apiPrefix: string, paths?: Partial<TranslationsApiPaths>) => {
  const requests = buildTranslationsRequests(apiPrefix, paths);
  const appTranslations = [APP_TRANSLATIONS_TAG];
  return {
    adminUiAppTranslationKeys: { kind: 'query', request: requests.appTranslationKeys, providesTags: appTranslations },
    adminUiAppTranslationKey: { kind: 'query', request: requests.appTranslationKey, providesTags: appTranslations },
    adminUiUpdateAppTranslationKey: { kind: 'mutation', request: requests.updateAppTranslationKey, invalidatesTags: appTranslations },
    adminUiDeleteAppTranslationKey: { kind: 'mutation', request: requests.deleteAppTranslationKey, invalidatesTags: appTranslations },
    adminUiUpdateAppTranslationValue: { kind: 'mutation', request: requests.updateAppTranslationValue, invalidatesTags: appTranslations },
    adminUiDeleteAppTranslationValue: { kind: 'mutation', request: requests.deleteAppTranslationValue, invalidatesTags: appTranslations },
    adminUiAppTranslationCompleteness: { kind: 'query', request: requests.appTranslationCompleteness, providesTags: appTranslations },
    adminUiGenerateAppTranslations: { kind: 'mutation', request: requests.generateAppTranslations, invalidatesTags: appTranslations },
    adminUiGenerateAllAppTranslations: { kind: 'mutation', request: requests.generateAllAppTranslations, invalidatesTags: appTranslations },
    adminUiLanguages: { kind: 'query', request: requests.languages, providesTags: [LANGUAGES_TAG] },
    adminUiUpdateLanguage: { kind: 'mutation', request: requests.updateLanguage, invalidatesTags: [LANGUAGES_TAG] },
    adminUiImportLanguagesFromConfig: { kind: 'mutation', request: requests.importLanguagesFromConfig, invalidatesTags: [LANGUAGES_TAG] },
    adminUiLocales: { kind: 'query', request: requests.locales, providesTags: [LOCALES_TAG] },
    adminUiUpdateLocale: { kind: 'mutation', request: requests.updateLocale, invalidatesTags: [LOCALES_TAG, APP_TRANSLATIONS_TAG] },
    adminUiImportLocalesFromConfig: { kind: 'mutation', request: requests.importLocalesFromConfig, invalidatesTags: [LOCALES_TAG, APP_TRANSLATIONS_TAG] },
    adminUiTranslateEntities: { kind: 'mutation', request: requests.translateEntities, invalidatesTags: [] },
  } as const satisfies Record<string, InjectedEndpointDefinition<never>>;
};

/**
 * Injects the translation operations into the host's RTK Query api and returns their hooks. Call it once at module
 * scope; a second call with the same api, prefix and paths returns the first result.
 *
 * ```ts
 * export const translationsApi = createTranslationsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common' });
 * ```
 */
export const createTranslationsApi = ({ baseApi, apiPrefix, paths }: CreateTranslationsApiOptions): TranslationsApi => {
  const memoKey = `translations:${trimApiPrefix(apiPrefix)}:${JSON.stringify({ ...DEFAULT_TRANSLATIONS_API_PATHS, ...paths })}`;
  return injectEndpointsOnce(
    baseApi,
    memoKey,
    [APP_TRANSLATIONS_TAG, LANGUAGES_TAG, LOCALES_TAG],
    translationsEndpointDefinitions(apiPrefix, paths),
    hookOf => ({
      useAppTranslationKeysQuery: hookOf('adminUiAppTranslationKeys') as TranslationsApi['useAppTranslationKeysQuery'],
      useAppTranslationKeyQuery: hookOf('adminUiAppTranslationKey') as TranslationsApi['useAppTranslationKeyQuery'],
      useUpdateAppTranslationKeyMutation: hookOf('adminUiUpdateAppTranslationKey') as TranslationsApi['useUpdateAppTranslationKeyMutation'],
      useDeleteAppTranslationKeyMutation: hookOf('adminUiDeleteAppTranslationKey') as TranslationsApi['useDeleteAppTranslationKeyMutation'],
      useUpdateAppTranslationValueMutation: hookOf('adminUiUpdateAppTranslationValue') as TranslationsApi['useUpdateAppTranslationValueMutation'],
      useDeleteAppTranslationValueMutation: hookOf('adminUiDeleteAppTranslationValue') as TranslationsApi['useDeleteAppTranslationValueMutation'],
      useAppTranslationCompletenessQuery: hookOf('adminUiAppTranslationCompleteness') as TranslationsApi['useAppTranslationCompletenessQuery'],
      useGenerateAppTranslationsMutation: hookOf('adminUiGenerateAppTranslations') as TranslationsApi['useGenerateAppTranslationsMutation'],
      useGenerateAllAppTranslationsMutation: hookOf('adminUiGenerateAllAppTranslations') as TranslationsApi['useGenerateAllAppTranslationsMutation'],
      useLanguagesQuery: hookOf('adminUiLanguages') as TranslationsApi['useLanguagesQuery'],
      useUpdateLanguageMutation: hookOf('adminUiUpdateLanguage') as TranslationsApi['useUpdateLanguageMutation'],
      useImportLanguagesFromConfigMutation: hookOf('adminUiImportLanguagesFromConfig') as TranslationsApi['useImportLanguagesFromConfigMutation'],
      useLocalesQuery: hookOf('adminUiLocales') as TranslationsApi['useLocalesQuery'],
      useUpdateLocaleMutation: hookOf('adminUiUpdateLocale') as TranslationsApi['useUpdateLocaleMutation'],
      useImportLocalesFromConfigMutation: hookOf('adminUiImportLocalesFromConfig') as TranslationsApi['useImportLocalesFromConfigMutation'],
      useTranslateEntitiesMutation: hookOf('adminUiTranslateEntities') as TranslationsApi['useTranslateEntitiesMutation'],
    })
  );
};

/** Fixed answers of a `createStaticTranslationsApi`; a query without one stays loading, a write echoes its body. */
export interface StaticTranslationsData {
  appTranslationKeys?: (arg: TranslationsListArg) => AppTranslationKeysResponse | undefined;
  appTranslationKey?: (arg: AppTranslationKeyArg) => AppTranslationKeyResponse | undefined;
  completeness?: AppTranslationCompletenessResponse;
  languages?: (arg: TranslationsListArg) => LanguagesResponse | undefined;
  locales?: (arg: TranslationsListArg) => LocalesResponse | undefined;
  translateEntities?: (arg: TranslateEntitiesArg) => TranslateEntitiesResponse | Promise<TranslateEntitiesResponse>;
}

/** A `TranslationsApi` answering fixed payloads, without a store or a request: for showcases, tests and design reviews. */
export const createStaticTranslationsApi = (data: StaticTranslationsData): TranslationsApi => ({
  useAppTranslationKeysQuery: staticQueryHook(arg => data.appTranslationKeys?.(arg)),
  useAppTranslationKeyQuery: staticQueryHook(arg => data.appTranslationKey?.(arg)),
  useUpdateAppTranslationKeyMutation: staticMutationHook(({ appTranslationKey }) => ({ appTranslationKey: { id: appTranslationKey.id ?? 1, ...appTranslationKey } })),
  useDeleteAppTranslationKeyMutation: staticMutationHook(() => ({})),
  useUpdateAppTranslationValueMutation: staticMutationHook(({ appTranslationValue }) => ({ appTranslationValue })),
  useDeleteAppTranslationValueMutation: staticMutationHook(() => ({})),
  useAppTranslationCompletenessQuery: staticQueryHook(() => data.completeness),
  useGenerateAppTranslationsMutation: staticMutationHook(({ writingStyle }) => ({ appTranslationsResult: { writingStyle, translatedKeysCount: 0 } })),
  useGenerateAllAppTranslationsMutation: staticMutationHook(() => ({ appTranslationsResults: { elements: [] } })),
  useLanguagesQuery: staticQueryHook(arg => data.languages?.(arg)),
  useUpdateLanguageMutation: staticMutationHook(({ language }) => ({ language })),
  useImportLanguagesFromConfigMutation: staticMutationHook(() => data.languages?.({}) ?? { languages: { elements: [] } }),
  useLocalesQuery: staticQueryHook(arg => data.locales?.(arg)),
  useUpdateLocaleMutation: staticMutationHook(({ locale }) => ({ locale })),
  useImportLocalesFromConfigMutation: staticMutationHook(() => data.locales?.({}) ?? { locales: { elements: [] } }),
  useTranslateEntitiesMutation: staticMutationHook(arg => (data.translateEntities ? data.translateEntities(arg) : { translatedEntities: { elements: [] } })),
});
