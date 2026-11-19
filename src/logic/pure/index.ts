// The dependency-free entry: the pure helpers of ./logic that need neither React nor @mgamadeus/ddd-web (navigation and
// crumbs, list sort and tracks, URL list state, sticky parameters, date inputs and presets, colour values, image crop
// geometry, text limits, write access, the injected api helpers). Loads in server code, workers and tests; also built
// as CommonJS (`require('@mgamadeus/ddd-admin-ui/logic/pure')`). Texts it resolves go through the package's text store
// (`translateText`); a CommonJS caller has its own copy of that store, so it passes `t` where a helper takes one.

export {
  formatHexColor,
  normalizeColorValue,
  parseHexColor,
} from './colorValue.ts';
export type {
  ColorValueFormat,
  RgbaValue,
} from './colorValue.ts';
export {
  createConfirmQueue,
} from './confirmQueue.ts';
export type {
  ConfirmQueue,
  ConfirmQueueEntry,
} from './confirmQueue.ts';
export {
  fromDateInputValue,
  fromDateTimeInputValue,
  toDateInputValue,
  toDateTimeInputValue,
} from './dateInput.ts';
export type {
  DateInputZone,
} from './dateInput.ts';
export {
  LIST_DISPLAY_MODES,
  parseListDisplayMode,
} from './displayMode.ts';
export type {
  ListDisplayMode,
} from './displayMode.ts';
export {
  drawerKey,
} from './entityDrawer.ts';
export type {
  EntityDrawerState,
  EntityDrawerUrlAdapter,
} from './entityDrawer.ts';
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
} from './imageCrop.ts';
export type {
  CropAspectOption,
  CropHandle,
  CropRect,
  ImageNormalizationPlan,
  ImageOutputType,
  ImageSizeLimits,
  PlanImageNormalizationOptions,
  ResizeCropOptions,
} from './imageCrop.ts';
export {
  formatListSort,
  nextListSort,
  parseListSort,
} from './listSort.ts';
export type {
  EntityListSort,
  ListSortCycle,
  ListSortDirection,
} from './listSort.ts';
export {
  computeListTracks,
  hasListTracks,
  isContentTrack,
  LIST_COLUMN_MIN_WIDTH,
  LIST_PIN_MAX_VISIBLE_SHARE,
  LIST_PIN_MIN_OVERFLOW,
  listTrackLayoutTemplate,
  listTrackTemplate,
  minimumListWidth,
  resolveListPins,
  shouldHonourStartPins,
  LIST_CELL_PADDING,
  isSortIconFirst,
  listCellPaddingAt,
  resolveListCellPadding,
} from './listTracks.ts';
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
} from './listTracks.ts';
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
} from './navigation.ts';
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
} from './navigation.ts';
export {
  INTERACTIVE_SELECTOR,
} from './rowActivation.ts';
export {
  withStickyParams,
} from './stickyParams.ts';
export {
  countCodePoints,
  overLimitKeys,
} from './textLimits.ts';
export type {
  TextCounter,
  TextLimits,
} from './textLimits.ts';
export {
  LIST_STATE_DEBOUNCE_MS,
} from './urlListState.ts';
export type {
  UrlStateAdapter,
} from './urlListState.ts';
export {
  narrowWriteAccess,
  WRITE_ACCESS_ALLOWED,
} from './writeAccess.ts';
export type {
  WriteAccess,
} from './writeAccess.ts';
export {
  injectedHookName,
  hostTagTypes,
  hostTagsMemoKey,
  resolveHostTagsByEndpoint,
  resolveHostTagsOf,
  injectEndpointsOnce,
  withHostTags,
  staticMutationHook,
  staticQueryFailure,
  staticQueryHook,
  toQueryString,
  trimApiPrefix,
} from './injectedApi.ts';
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
} from './injectedApi.ts';
export {
  addCalendarDays,
  CUSTOM_DATE_RANGE_PRESET,
  dateRangePresetOf,
  DEFAULT_DATE_RANGE_PRESETS,
  localToday,
  resolveDateRangePreset,
} from './dateRangePresets.ts';
export type {
  DateRange,
  DateRangePreset,
} from './dateRangePresets.ts';
export { translateText } from '../../i18n/store.ts';
export type { TranslateFn, TranslateOptions } from '../../i18n/store.ts';
