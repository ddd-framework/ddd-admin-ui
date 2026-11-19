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
export { DISCARD_CHANGES_CONFIRM, isTextConfirmDescription, routeConfirm } from './pure/confirm.ts';
export { createConfirmQueue } from './pure/confirmQueue.ts';
export type { ConfirmQueue, ConfirmQueueEntry } from './pure/confirmQueue.ts';
export { fromDateInputValue, fromDateTimeInputValue, toDateInputValue, toDateTimeInputValue } from './pure/dateInput.ts';
export type { DateInputZone } from './pure/dateInput.ts';
export { withStickyParams } from './pure/stickyParams.ts';
export { LIST_DISPLAY_MODES, parseListDisplayMode } from './pure/displayMode.ts';
export type { ListDisplayMode } from './pure/displayMode.ts';
export type { ConfirmDialogApi, ConfirmOptions, ConfirmRoutes } from './pure/confirm.ts';
export { drawerKey } from './pure/entityDrawer.ts';
export type { EntityDrawerState, EntityDrawerUrlAdapter } from './pure/entityDrawer.ts';
export { EMPTY_MARKER, formatDate, formatDateTime, formatRelativeTime, isDddDateOnly } from './pure/format.ts';
export { dirtyFormFieldNames, formValuesEqual, isBlankFormValue } from './pure/formValues.ts';
export { localeDisplayName, mergeLocaleKeys, toTranslatableLocale } from './pure/locales.ts';
export type { TranslatableLocale } from './pure/locales.ts';
export { INTERACTIVE_SELECTOR } from './pure/rowActivation.ts';
export { notify, setNotificationAdapter } from './pure/notify.ts';
export type { NotificationAdapter, NotifyAction, NotifyOptions } from './pure/notify.ts';
export {
  bulkOutcomeCounts,
  bulkSummaryText,
  runSequential,
  runSequentialWithSummary,
  skipSequential,
  summarizeSkipReasons,
} from './pure/runSequential.ts';
export type {
  BulkOutcomeCounts,
  SequentialFailure,
  SequentialOutcome,
  SequentialSkip,
  SequentialSkipMark,
  SequentialSummaryLabels,
} from './pure/runSequential.ts';
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
  LIST_CELL_PADDING,
  isSortIconFirst,
  listCellPaddingAt,
  resolveListCellPadding,
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
  ListCellPadding,
  ListSortIconPosition,
} from './pure/listTracks.ts';
export {
  documentTitleParts,
  filterNavigation,
  findActiveNavigation,
  isNavigationGroup,
  isNavigationGroupActive,
  isNavigationLeafActive,
  menuNavigation,
  menuNavigationOf,
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
  LeadingCrumb,
  NavigationAccess,
  NavigationGroup,
  NavigationIcon,
  NavigationIconProps,
  NavigationItem,
  NavigationLeaf,
  QueryCrumb,
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
  translationsChanged,
} from './pure/translationState.ts';
export type { FieldTranslations, HydratedTranslations } from './pure/translationState.ts';
export {
  hostTagTypes,
  hostTagsMemoKey,
  resolveHostTagsByEndpoint,
  resolveHostTagsOf,
  injectEndpointsOnce,
  withHostTags,
  injectedHookName,
  staticMutationHook,
  staticQueryFailure,
  staticQueryHook,
  toQueryString,
  trimApiPrefix,
} from './pure/injectedApi.ts';
export type {
  ApiMutationCall,
  ApiMutationHook,
  ApiMutationState,
  ApiQueryHook,
  ApiQueryOptions,
  ApiQueryResult,
  ApiRefetchCall,
  InjectableBaseApi,
  InjectedEndpointDefinition,
  InjectedRequest,
  InjectedHostTags,
  InjectedHostTagsByOperation,
  InjectedHostTagSelection,
  InjectedHostTagsOption,
  InjectedHostTagsResolver,
  InjectedTag,
  StaticQueryFailure,
} from './pure/injectedApi.ts';
export { LIST_STATE_DEBOUNCE_MS } from './pure/urlListState.ts';
export type { UrlStateAdapter } from './pure/urlListState.ts';

// React
export { useCondition, useDisabledWhen, useRequiredWhen, useResetWhen, useVisibleWhen } from './react/conditionHooks.ts';
export { ConfirmContext, useConfirm } from './react/useConfirm.ts';
export { useCopyToClipboard } from './react/useCopyToClipboard.ts';
export type { CopyToClipboard } from './react/useCopyToClipboard.ts';
export { useDebouncedValue } from './react/useDebouncedValue.ts';
export { ENTITY_DRAWER_CREATE_VALUE, useEntityDrawer } from './react/useEntityDrawer.ts';
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
export { keysBetween, useRowSelection } from './react/useRowSelection.ts';
export type { EntityListSelection, RowSelection, SelectionModifiers, UseRowSelectionOptions } from './react/useRowSelection.ts';
export { useTranslationRunner } from './react/useTranslationRunner.ts';
export type {
  TranslationRunner,
  TranslationRunResult,
  TranslationTaskProgress,
  TranslationTaskStatus,
} from './react/useTranslationRunner.ts';
export { UnsavedChangesContext, useUnsavedChangesBoundary, useUnsavedChangesGuard } from './react/useUnsavedChangesGuard.ts';
export type {
  ConfirmFn,
  DirtyFormDetails,
  UnsavedChangesGuardOptions,
  UnsavedChangesRegistry,
} from './react/useUnsavedChangesGuard.ts';
export { buildEntityListState, sameEntityListState } from './pure/listState.ts';
export type { EntityListState, EntityListStateInput } from './pure/listState.ts';
export { useListStateReport } from './react/useListStateReport.ts';
export { useNavigationGuard } from './react/useNavigationGuard.ts';
export type { NavigationGuard } from './react/useNavigationGuard.ts';
export {
  canNavigate,
  decideNavigation,
  describeDirtyForm,
  getDirtyForms,
  getOpenOverlays,
  setDirtyFormEntry,
  setOpenOverlay,
  subscribeUiActivity,
  UI_ACTIVITY_KEY,
  uiActivityState,
} from './pure/navigationGuard.ts';
export type {
  CanNavigateOptions,
  DirtyForm,
  DirtyFormEntry,
  NavigationBlockReason,
  NavigationDecision,
  OpenOverlay,
  OverlayKind,
  UiActivityState,
} from './pure/navigationGuard.ts';
export { useWriteAccess, WriteAccessContext, WriteAccessProvider } from './react/writeAccess.ts';
export type { WriteAccessProviderProps } from './react/writeAccess.ts';
export { useMemoryUrlState } from './react/useMemoryUrlState.ts';
export { useOptimisticRowPatches } from './react/useOptimisticRowPatches.ts';
export type { OptimisticRowPatches } from './react/useOptimisticRowPatches.ts';
export { externalListChange, readListValues, useUrlListState } from './react/useUrlListState.ts';
export type { UrlListState, UseUrlListStateOptions } from './react/useUrlListState.ts';

// Browser
export { prepareImageFile } from './browser/prepareImageFile.ts';
export type { PreparedImage } from './browser/prepareImageFile.ts';
export { buildStorageKey, readStored, writeStored } from './browser/storage.ts';
export type { StorageArea } from './browser/storage.ts';

// Lists, bulk runs, date ranges, translatable limits, images (0.2.0)
export {
  addCalendarDays,
  CUSTOM_DATE_RANGE_PRESET,
  DEFAULT_DATE_RANGE_PRESETS,
  dateRangePresetOf,
  localToday,
  resolveDateRangePreset,
} from './pure/dateRangePresets.ts';
export type { DateRange, DateRangePreset } from './pure/dateRangePresets.ts';
export { isContentTrack, listTrackLayoutTemplate } from './pure/listTracks.ts';
export {
  DEFAULT_STYLE_ORDER,
  languageEditedKey,
  languageFieldTabs,
  languagesOfStore,
  languageTextsOf,
  mergeLanguageTabs,
  storeWithLanguageTexts,
  translationFieldKey,
  translationKeyOf,
  translationLanguageOf,
} from './pure/locales.ts';
export type { LanguageTabsOptions, LanguageTextsOptions, LocaleKeyTabsOptions } from './pure/locales.ts';
export { countCodePoints, overLimitKeys } from './pure/textLimits.ts';
export type { TextCounter, TextLimits } from './pure/textLimits.ts';
export { TextLimitsContext, useTextLimits } from './react/textLimits.ts';
export { BREAKPOINT_QUERIES, useMediaQuery } from './react/useMediaQuery.ts';
export type { BreakpointName } from './react/useMediaQuery.ts';
export {
  chooseImageOutputType,
  cropHandleAt,
  cropRatioOf,
  fitImageSize,
  initialCrop,
  moveCrop,
  planImageNormalization,
  resizeCrop,
  roundCrop,
  zoomCrop,
} from './pure/imageCrop.ts';
export type {
  CropAspectOption,
  CropHandle,
  CropRect,
  ImageNormalizationPlan,
  ImageOutputType,
  ImageSizeLimits,
  PlanImageNormalizationOptions,
  ResizeCropOptions,
} from './pure/imageCrop.ts';
export { decodeImage, ImageNormalizeError, isImageNormalizeError, normalizeImage, renderNormalizedImage } from './browser/normalizeImage.ts';
export type {
  DecodedImage,
  ImageNormalizeErrorCode,
  NormalizedImage,
  NormalizeImageOptions,
  NormalizeImageWorkerRunner,
} from './browser/normalizeImage.ts';
export { formatHexColor, normalizeColorValue, parseHexColor } from './pure/colorValue.ts';
export type { ColorValueFormat, RgbaValue } from './pure/colorValue.ts';
