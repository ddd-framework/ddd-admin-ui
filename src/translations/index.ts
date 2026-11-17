/** @deprecated moved to logic/pure/schemas — the re-export is removed in a later minor */
export { propertyTranslationsSchema } from '../logic/pure/schemas.ts';
export { FormTranslatableInput, FormTranslatableMarkdown } from './FormTranslatableFields.tsx';
export type { FormTranslatableInputProps, FormTranslatableMarkdownProps } from './FormTranslatableFields.tsx';
/** @deprecated moved to logic/pure/locales — the re-export is removed in a later minor */
export { localeDisplayName, mergeLocaleKeys, toTranslatableLocale } from '../logic/pure/locales.ts';
/** @deprecated moved to logic/react/useLocaleName — the re-export is removed in a later minor */
export { useLocaleName } from '../logic/react/useLocaleName.ts';
/** @deprecated moved to logic/pure/locales — the re-export is removed in a later minor */
export type { TranslatableLocale } from '../logic/pure/locales.ts';
export { TranslatableField } from './TranslatableField.tsx';
export type { TranslatableFieldBaseProps } from './TranslatableField.tsx';
export { TranslatableInput } from './TranslatableInput.tsx';
export type { TranslatableInputProps } from './TranslatableInput.tsx';
export { TranslatableMarkdown } from './TranslatableMarkdown.tsx';
export type { MarkdownEditorRenderArgs, TranslatableMarkdownProps } from './TranslatableMarkdown.tsx';
export { TranslationControls } from './TranslationControls.tsx';
export type { TranslationControlsProps } from './TranslationControls.tsx';
/** @deprecated moved to logic/pure/translationState — the re-export is removed in a later minor */
export {
  blankTranslations,
  buildTranslationInfos,
  hydrateTranslations,
  mergeTranslatedStore,
  TRANSLATION_INFOS_OBJECT_TYPE,
} from '../logic/pure/translationState.ts';
/** @deprecated moved to logic/pure/translationState — the re-export is removed in a later minor */
export type { FieldTranslations, HydratedTranslations } from '../logic/pure/translationState.ts';
/** @deprecated moved to logic/react/useEntityTranslations — the re-export is removed in a later minor */
export { useEntityTranslations } from '../logic/react/useEntityTranslations.ts';
/** @deprecated moved to logic/react/useEntityTranslations — the re-export is removed in a later minor */
export type { TranslationTabs, UseEntityTranslationsOptions, UseEntityTranslationsReturn } from '../logic/react/useEntityTranslations.ts';
/** @deprecated moved to logic/react/useTranslationRunner — the re-export is removed in a later minor */
export { useTranslationRunner } from '../logic/react/useTranslationRunner.ts';
/** @deprecated moved to logic/react/useTranslationRunner — the re-export is removed in a later minor */
export type {
  TranslationRunner,
  TranslationRunResult,
  TranslationTaskProgress,
  TranslationTaskStatus,
} from '../logic/react/useTranslationRunner.ts';
export { focusFirstOverLimitTranslation } from './focusOverLimit.ts';

// Admin screens on the host's RTK Query api (`createTranslationsApi`): app translation keys with their drawer and
// completeness, languages, locales, the import from configuration, the entity translator and the content locales.
export {
  APP_TRANSLATIONS_TAG,
  buildAppTranslationKeysBulkDeleteRequest,
  buildTranslationsRequests,
  createStaticTranslationsApi,
  createTranslationsApi,
  DEFAULT_TRANSLATIONS_API_PATHS,
  LANGUAGES_TAG,
  LOCALES_TAG,
  translationsEndpointDefinitions,
} from './api.ts';
export type {
  AppTranslationKeysBulkDelete,
  AppTranslationKeysBulkDeleteArg,
  AppTranslationKeysBulkDeleteResponse,
  CreateTranslationsApiOptions,
  StaticTranslationsData,
  TranslationsApi,
  TranslationsApiPaths,
} from './api.ts';
export {
  ACTIVE_LANGUAGES_ARG,
  ACTIVE_LOCALES_WITH_COUNTRIES_ARG,
  APP_TRANSLATION_KEY_FILTER_KEYS,
  APP_TRANSLATION_KEY_SORT_KEYS,
  APP_TRANSLATION_KEYS_PAGE_SIZE,
  APP_TRANSLATIONS_LANGUAGES_ARG,
  appTranslationKeysOrderBy,
  buildAppTranslationKeysFilter,
  buildAppTranslationKeysListArgs,
  CONTENT_LOCALES_ARG,
  DEFAULT_APP_TRANSLATION_KEY_SORT,
  renameUrlStateKeys,
} from './appTranslationsList.ts';
export type { AppTranslationKeyFilterKey, AppTranslationKeyFilterValues } from './appTranslationsList.ts';
export type * from './adminTypes.ts';
export {
  APP_TRANSLATION_CONTEXT_OPTIONS,
  APP_TRANSLATION_WRITING_STYLE_OPTIONS,
  appTranslationValueCombination,
  appTranslationValueCountryCode,
  appTranslationValueLocaleKey,
  completenessPercent,
  filterAppTranslationValues,
  LANGUAGE_WRITING_STYLES_OPTIONS,
  sortAppTranslationValues,
  sortAppTranslationValuesBy,
  supportedWritingStylesOf,
  TEXT_DIRECTION_OPTIONS,
  toAppTranslationKeyBody,
  toCountryCodeMap,
  toLanguageCodeMap,
  writingStyleLabel,
} from './adminFormat.ts';
export type { AppTranslationValuesFilter, CountryCodeMap, LanguageCodeMap } from './adminFormat.ts';
export { AppTranslationsScreen } from './AppTranslationsScreen.tsx';
export type { AppTranslationsScreenProps, AppTranslationsUrlParamNames } from './AppTranslationsScreen.tsx';
export { AppTranslationKeyDrawer } from './AppTranslationKeyDrawer.tsx';
export type { AppTranslationKeyDrawerProps } from './AppTranslationKeyDrawer.tsx';
export { TranslationCompleteness } from './TranslationCompleteness.tsx';
export type { TranslationCompletenessProps } from './TranslationCompleteness.tsx';
export { LanguagesScreen } from './LanguagesScreen.tsx';
export type { LanguagesScreenProps } from './LanguagesScreen.tsx';
export { LocalesScreen } from './LocalesScreen.tsx';
export type { LocaleFlag, LocalesScreenProps } from './LocalesScreen.tsx';
export { ConfigImportCard, useConfigImport } from './ConfigImportCards.tsx';
export type { ConfigImport, ConfigImportCardProps, ConfigImportKind, ConfigImportOptions, ConfigImportTexts } from './ConfigImportCards.tsx';
export { LOCALE_OBJECT_TYPE, useEntitiesTranslator, useEntityTranslator } from './useEntityTranslator.ts';
export type {
  EntitiesTranslationRequest,
  EntitiesTranslator,
  EntityTranslationRequest,
  EntityTranslator,
  UseEntityTranslatorOptions,
} from './useEntityTranslator.ts';
export { toContentLocaleKeys, useActiveLocales, useContentLocales } from './useContentLocales.ts';
export type { UseContentLocalesOptions } from './useContentLocales.ts';
