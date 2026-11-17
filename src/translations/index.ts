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
