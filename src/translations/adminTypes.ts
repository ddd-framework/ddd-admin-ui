/**
 * The payloads of the translation admin endpoints: app translation keys and values and their completeness
 * (mgamadeus/ddd-common-translations ≥ 1.1.0, `DDD\Domain\Common\Entities\AppTranslations`), languages and locales
 * (mgamadeus/ddd-common-political ≥ 1.0.19, `DDD\Domain\Common\Entities\Languages|Locales`), and the entity
 * translation (`AITranslationsService::translateEntities`). The routes are the application's controllers (the modules
 * ship no controller trait); `createTranslationsApi` documents the paths it calls. Every set is `{ elements: [...] }`.
 */

export interface TranslationsSet<TElement> {
  elements?: TElement[];
}

export type LanguageWritingStyles = 'INFORMAL' | 'FORMAL' | 'FORMAL_AND_INFORMAL';
export type AppTranslationContext = 'ONE' | 'MANY';
export type AppTranslationWritingStyle = 'INFORMAL' | 'FORMAL';

export interface AdminLanguage {
  id?: number | string | null;
  languageCode?: string | null;
  iso3Code?: string | null;
  name?: string | null;
  nativeName?: string | null;
  /** `LTR` or `RTL`. */
  textDirection?: string | null;
  scriptCode?: string | null;
  isActive?: boolean;
  displayOrder?: number | null;
  supportedWritingStyles?: LanguageWritingStyles | string | null;
}

export interface AdminLocale {
  id?: number | string | null;
  name?: string | null;
  languageCode?: string | null;
  languageId?: number | null;
  countryId?: number | null;
  countryShortCode?: string | null;
  isDefaultLocaleForLanguage?: boolean | null;
  isDefaultLocaleForCountry?: boolean | null;
  isActive?: boolean;
}

export interface AppTranslationValue {
  id?: number | string | null;
  appTranslationKeyId?: number | string | null;
  languageId?: number | null;
  countryId?: number | null;
  translation?: string;
  context?: AppTranslationContext | string;
  writingStyle?: AppTranslationWritingStyle | string;
}

export interface AppTranslationKey {
  id?: number | string | null;
  key?: string;
  translationTemplate?: string | null;
  translationHint?: string | null;
  requiresContext?: boolean;
  doNotTranslateAutomatically?: boolean;
  reTranslate?: boolean;
  /** Present with `expand=appTranslationValues`. */
  appTranslationValues?: TranslationsSet<AppTranslationValue>;
}

/** Translated values of one active locale, per writing style, against the number of keys. */
export interface AppTranslationCompleteness {
  locale?: AdminLocale;
  totalKeys?: number;
  informalTranslatedCount?: number;
  formalTranslatedCount?: number;
}

/** The outcome of a generation for one locale and style (it runs asynchronously on the backend). */
export interface AppTranslationsResult {
  locale?: AdminLocale | null;
  writingStyle?: string;
  translatedKeysCount?: number | null;
  apiCalls?: number | null;
}

/** QueryOptions of a list endpoint (`filters`, `orderBy`, `top`, `skip`, `select`, `expand`). */
export interface TranslationsListArg {
  filters?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  select?: string;
  expand?: string;
}

export interface AppTranslationKeyArg {
  appTranslationKeyId: string | number;
  expand?: string;
}

export interface AppTranslationsGenerateArg {
  localeId: string | number;
  writingStyle?: AppTranslationWritingStyle;
  /** Only estimate the costs. */
  previewOnly?: boolean;
}

/**
 * One entity of `translateEntities`: `objectType`, `id`, its values and `translationInfos`. `objectType` accepts
 * `null` as generated entity types declare it (`objectType?: string | null`); send the entity's class name.
 */
export type TranslatableEntityPayload = Readonly<Record<string, unknown>> & { objectType?: string | null };

export interface TranslateEntitiesArg {
  entitiesToTranslate: TranslationsSet<TranslatableEntityPayload>;
  localesToTranslate: TranslationsSet<AdminLocale & { objectType?: string }>;
}

export interface AppTranslationKeysResponse {
  appTranslationKeys: TranslationsSet<AppTranslationKey>;
}

export interface AppTranslationKeyResponse {
  appTranslationKey: AppTranslationKey;
}

export interface AppTranslationValueResponse {
  appTranslationValue: AppTranslationValue;
}

export interface AppTranslationCompletenessResponse {
  appTranslationCompletenesses: TranslationsSet<AppTranslationCompleteness>;
}

export interface AppTranslationsGenerateResponse {
  appTranslationsResult: AppTranslationsResult;
}

export interface AppTranslationsGenerateAllResponse {
  appTranslationsResults: TranslationsSet<AppTranslationsResult>;
}

export interface LanguagesResponse {
  languages: TranslationsSet<AdminLanguage>;
}

export interface LanguageResponse {
  language: AdminLanguage;
}

export interface LocalesResponse {
  locales: TranslationsSet<AdminLocale>;
}

export interface LocaleResponse {
  locale: AdminLocale;
}

export interface TranslateEntitiesResponse {
  translatedEntities?: TranslationsSet<TranslatableEntityPayload>;
}

/** The answer of a delete (`DeleteResponseDto`). */
export type TranslationsDeleteResponse = Readonly<Record<string, unknown>>;
