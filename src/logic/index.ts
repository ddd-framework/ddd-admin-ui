// The logic entry: pure helpers (no React, safe in server code), React hooks and contexts without markup, and
// browser-only helpers. Exports the names the block barrels exported before the split; file-internal helpers stay
// unexported.

// Pure
export {
  allOf,
  anyOf,
  condition,
  fieldEquals,
  fieldFilled,
  fieldIn,
  formRules,
  not,
  requiredWhen,
  validWhen,
} from './pure/conditions.ts';
export type { FormCondition, FormRule, ResetWhenRule } from './pure/conditions.ts';
export { DISCARD_CHANGES_CONFIRM } from './pure/confirm.ts';
export { createConfirmQueue } from './pure/confirmQueue.ts';
export type { ConfirmQueue, ConfirmQueueEntry } from './pure/confirmQueue.ts';
export { fromDateInputValue, fromDateTimeInputValue, toDateInputValue, toDateTimeInputValue } from './pure/dateInput.ts';
export type { DateInputZone } from './pure/dateInput.ts';
export { withStickyParams } from './pure/stickyParams.ts';
export { LIST_DISPLAY_MODES, parseListDisplayMode } from './pure/displayMode.ts';
export type { ListDisplayMode } from './pure/displayMode.ts';
export type { ConfirmDialogApi, ConfirmOptions } from './pure/confirm.ts';
export { drawerKey } from './pure/entityDrawer.ts';
export type { EntityDrawerState, EntityDrawerUrlAdapter } from './pure/entityDrawer.ts';
export { EMPTY_MARKER, formatDate, formatDateTime, formatRelativeTime, isDddDateOnly } from './pure/format.ts';
export { formValuesEqual, isBlankFormValue } from './pure/formValues.ts';
export { localeDisplayName, mergeLocaleKeys, toTranslatableLocale } from './pure/locales.ts';
export type { TranslatableLocale } from './pure/locales.ts';
export { INTERACTIVE_SELECTOR } from './pure/rowActivation.ts';
export { notify, setNotificationAdapter } from './pure/notify.ts';
export type { NotificationAdapter, NotifyAction, NotifyOptions } from './pure/notify.ts';
export { runSequential, runSequentialWithSummary } from './pure/runSequential.ts';
export type { SequentialFailure, SequentialOutcome, SequentialSummaryLabels } from './pure/runSequential.ts';
export { mediaItemValueSchema, propertyTranslationsSchema } from './pure/schemas.ts';
export type { MediaItemValue } from './pure/schemas.ts';
export { parseValidationErrors } from './pure/serverViolations.ts';
export type { FormValidationError } from './pure/serverViolations.ts';
export { defineStatusMap } from './pure/status.ts';
export type { StatusDefinition, StatusMap, StatusMapOptions, StatusTone } from './pure/status.ts';
export { formatListSort, nextListSort, parseListSort } from './pure/listSort.ts';
export type { EntityListSort, ListSortCycle, ListSortDirection } from './pure/listSort.ts';
export {
  computeListTracks,
  hasListTracks,
  LIST_COLUMN_MIN_WIDTH,
  LIST_PIN_MAX_VISIBLE_SHARE,
  LIST_PIN_MIN_OVERFLOW,
  listTrackTemplate,
  minimumListWidth,
  resolveListPins,
  shouldHonourStartPins,
} from './pure/listTracks.ts';
export type {
  ListColumnAlign,
  ListColumnPin,
  ListColumnWidth,
  ListPinLayout,
  ListPinMeasure,
  ListPinPlacement,
  ListPinRequest,
  ListTrack,
  ListTrackLayout,
} from './pure/listTracks.ts';
export {
  documentTitleParts,
  filterNavigation,
  findActiveNavigation,
  isNavigationGroup,
  isNavigationGroupActive,
  isNavigationLeafActive,
  normalisePathname,
  resolveCrumbs,
  resolveDocumentTitle,
} from './pure/navigation.ts';
export type {
  ActiveNavigation,
  CrumbLabel,
  CrumbParams,
  CrumbRoute,
  DocumentTitleOptions,
  NavigationAccess,
  NavigationGroup,
  NavigationIcon,
  NavigationItem,
  NavigationLeaf,
  ResolveCrumbsOptions,
  ResolvedCrumb,
} from './pure/navigation.ts';
export { narrowWriteAccess, WRITE_ACCESS_ALLOWED } from './pure/writeAccess.ts';
export type { WriteAccess } from './pure/writeAccess.ts';
export { toFormSubmitError } from './pure/submitError.ts';
export type { FormSubmitError } from './pure/submitError.ts';
export {
  blankTranslations,
  buildTranslationInfos,
  hydrateTranslations,
  mergeTranslatedStore,
  TRANSLATION_INFOS_OBJECT_TYPE,
} from './pure/translationState.ts';
export type { FieldTranslations, HydratedTranslations } from './pure/translationState.ts';
export { LIST_STATE_DEBOUNCE_MS } from './pure/urlListState.ts';
export type { UrlStateAdapter } from './pure/urlListState.ts';

// React
export { useCondition, useDisabledWhen, useRequiredWhen, useResetWhen, useVisibleWhen } from './react/conditionHooks.ts';
export { ConfirmContext, useConfirm } from './react/useConfirm.ts';
export { useCopyToClipboard } from './react/useCopyToClipboard.ts';
export type { CopyToClipboard } from './react/useCopyToClipboard.ts';
export { useDebouncedValue } from './react/useDebouncedValue.ts';
export { useEntityDrawer } from './react/useEntityDrawer.ts';
export type { EntityDrawer, UseEntityDrawerOptions } from './react/useEntityDrawer.ts';
export { useEntityTranslations } from './react/useEntityTranslations.ts';
export { useHydrated } from './react/useHydrated.ts';
export type { TranslationTabs, UseEntityTranslationsOptions, UseEntityTranslationsReturn } from './react/useEntityTranslations.ts';
export { useFormDirty } from './react/useFormDirty.ts';
export type { UseFormDirtyOptions } from './react/useFormDirty.ts';
export { useGrowingWindowList } from './react/useGrowingWindowList.ts';
export type { GrowingWindowList, ListQueryHook, ListQueryResult, UseGrowingWindowListOptions } from './react/useGrowingWindowList.ts';
export { useInfiniteScrollSentinel } from './react/useInfiniteScrollSentinel.ts';
export { useLatestSearch } from './react/useLatestSearch.ts';
export type { LatestSearch } from './react/useLatestSearch.ts';
export { useLocaleName } from './react/useLocaleName.ts';
export { useRowActivation } from './react/useRowActivation.ts';
export type { RowActivationHandlers } from './react/useRowActivation.ts';
export { useRowSelection } from './react/useRowSelection.ts';
export type { EntityListSelection, RowSelection, UseRowSelectionOptions } from './react/useRowSelection.ts';
export { useTranslationRunner } from './react/useTranslationRunner.ts';
export type {
  TranslationRunner,
  TranslationRunResult,
  TranslationTaskProgress,
  TranslationTaskStatus,
} from './react/useTranslationRunner.ts';
export { UnsavedChangesContext, useUnsavedChangesBoundary, useUnsavedChangesGuard } from './react/useUnsavedChangesGuard.ts';
export type { ConfirmFn, UnsavedChangesRegistry } from './react/useUnsavedChangesGuard.ts';
export { useWriteAccess, WriteAccessContext, WriteAccessProvider } from './react/writeAccess.ts';
export type { WriteAccessProviderProps } from './react/writeAccess.ts';
export { useUrlListState } from './react/useUrlListState.ts';
export type { UrlListState, UseUrlListStateOptions } from './react/useUrlListState.ts';

// Browser
export { prepareImageFile } from './browser/prepareImageFile.ts';
export type { PreparedImage } from './browser/prepareImageFile.ts';
export { buildStorageKey, readStored, writeStored } from './browser/storage.ts';
export type { StorageArea } from './browser/storage.ts';
