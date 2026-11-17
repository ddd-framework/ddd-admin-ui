# Changelog

All notable changes to `@mgamadeus/ddd-admin-ui`. 0.x: each minor may break; pin the exact version while the package
is in 0.x.

## 0.2.0

All additions below are optional props, new exports or new entries: a caller that uses none of them renders the same
DOM (the list snapshot of 0.1.0-rc.2 and the form actions snapshot of 0.1.0-rc.5 are unchanged).

Lists:

- `FilterDateRange presets` (`true` or the host's list; `preset` / `onPresetChange`, `onRangeChange`, `today`): all
  time, today, last 7 days, last 30 days, custom on a `SegmentedControl`; a preset writes the same `YYYY-MM-DD` bounds as
  typed dates, so "Clear filters" is "All time" again; the resolved range shows next to the label; custom reveals the two
  fields without a second visible label. Pure helpers in `./logic`: `DEFAULT_DATE_RANGE_PRESETS`,
  `resolveDateRangePreset`, `dateRangePresetOf`, `addCalendarDays`, `localToday`, `CUSTOM_DATE_RANGE_PRESET` (types
  `DateRange`, `DateRangePreset`).
- Bulk runs with skipped rows: a run of `runSequential` / `runSequentialWithSummary` returns `skipSequential(reason?)`
  for a row it leaves alone; the outcome gains `skipped`, the toast reads `Deleted 3 of 5 tracks · 2 skipped` (clauses
  per reason through `skipReasons`). `bulkSummaryText`, `bulkOutcomeCounts`, `summarizeSkipReasons` for bulk endpoints
  (types `BulkOutcomeCounts`, `SequentialSkip`, `SequentialSkipMark`).
- Column factories in `./list`: `textColumn`, `numberColumn`, `moneyColumn` (currency required), `dateColumn`,
  `booleanColumn`, `imageColumn`, `idColumn`, `statusColumn`, `actionsColumn` (type `ColumnFactoryOptions`); each
  returns an `EntityListColumn`, display id, sort key and filter are separate, formats explicit.
- `EntityListColumn.width: 'content'`: a track as wide as its widest cell (`max-content`, measured after hydration),
  also among pinned columns (`actionsColumn` uses it with `pin: 'end'`). `isContentTrack`, `listTrackLayoutTemplate`
  in `./logic`.
- `EntityListBody tableBreakpoint` and `EntityListViewToggle tableBreakpoint`: `md` (default), `lg`, `always` (type
  `ListTableBreakpoint`).
- `EntityListBulkBar`: an action with `choices` opens a menu (`choicesLabel`, `onChoose`; `onClick` is optional now),
  `confirm` asks through `useConfirm()` with the count filled in (`%count%`, ICU plurals), `hint` shows a tooltip (also
  on a disabled action), `moreOnServer` notes that only the loaded rows are selected (types
  `EntityListBulkActionChoice`, `EntityListBulkActionConfirm`).
- `FilterToggleButton`, `FilterCountBadge`, `ClearFiltersButton`: the toolbar's controls for a host's own filter row or
  sheet (the toolbar renders them, same DOM).
- `Combobox translate` and `ComboboxOption.translate` (also the group heading), `QuickFilterPills translate` and
  `QuickFilterOption.translate`: `false` for texts from the server.
- `DateCell locale` (default: the provider's `formatLocale`, else the UI language); `formatDate`, `formatDateTime`,
  `formatRelativeTime`, `uiDateTimeFormat`, `uiRelativeTimeFormat` take an optional locale. `ImageCell bordered`,
  `objectFit`, `imageClassName`.
- `EntityListEmpty clearSearchSize` (the built-in "Clear search" is `sm`, `xs` when compact).

Primitives:

- `SegmentedControl`: `heightOf: 'option'` (the option carries the height, the track adds its padding),
  `coarsePointer: 'grow'` (44 px options and an 8 px gap on touch, `--segmented-control-coarse-option-height`,
  `--segmented-control-coarse-gap`), `badgeStyle: 'unstyled'` (also per option; there a falsy badge renders nothing),
  `translate: false` (the `aria-label` and the option texts as given), `style` on the root, `pressFeedback`
  (`--segmented-control-held-scale`). The indicator takes the selected option's box, so a host track padding insets it
  like the options. Optional variables, unset by default: `--segmented-control-easing`,
  `--segmented-control-option-duration`, `--segmented-control-option-easing`, `--segmented-control-track-duration`,
  `--segmented-control-track-easing`. Measured in headless Chromium against an earlier host control in seven call-site
  shapes (fine and coarse pointer): track, indicator and option geometry, timings and widths equal.

Pages, forms, media, translations:

- `RouteError` (`onRetry`, optional `onReport` with its own pending / sent / failed state, `title`, `description`,
  `detail`, `variant`) and `RouteLoading` (`list`, `detail`, `form`; `rows`, `inset`) in `./page`.
- `ColorValueField` in `./form`: an explicit `format` (`hex`, `hex-alpha`), `letterCase`, presets, `clearable`; typed
  text is normalised on blur and refused when it is not a colour of that format. `parseHexColor`, `formatHexColor`,
  `normalizeColorValue` in `./logic` (types `ColorValueFormat`, `RgbaValue`).
- `FormDrawer modal={false}` (with `nonModalFrom`, `nonModalClassName`): beside the page from `md` up, no overlay, the
  page stays clickable, a click outside never closes it; below that the modal drawer. `useMediaQuery`,
  `BREAKPOINT_QUERIES` in `./logic`.
- `ImageCropDialog` in `./media` (types `ImageCropDialogProps`, `ImageCropResult`): one picked image, aspect choices
  (free, ratio, round), move, resize, wheel and pinch zoom, arrows and +/− on the focused frame; Apply answers the
  cropped and normalised blob, "Use original" the untouched file, Cancel `onCancel`; a corrupt file shows an error.
  `normalizeImage`, `decodeImage`, `renderNormalizedImage`, `ImageNormalizeError` / `isImageNormalizeError` (`code`
  `decode`, `too-large`, `encode`, `unsupported`) in `./logic`: EXIF orientation, crop, round clip, size limits without
  upscaling, alpha kept, an optional `runInWorker` adapter with a main-thread fallback; the crop geometry
  (`initialCrop`, `moveCrop`, `resizeCrop`, `zoomCrop`, `planImageNormalization`, …) too. Upload, validation and presets
  stay with the host.
- Translatable inputs: `useEntityTranslations({ tabModel: 'language', styleOrder, initialLocale })`: one tab per
  language, each editing one full key chosen deterministically and named on the tab when not FORMAL; the language's
  other keys stay and go back in the payload (`mergeLanguageTabs`, `translationLanguageOf`, `TranslatableLocale.otherKeys`).
  `maxLength` / `countText` on `TranslatableInput`, `TranslatableMarkdown` and their form-bound variants: a counter in
  code points, the over-limit tab marked, `aria-invalid`, nothing cut; `AdminUiProvider textLimits` sets the defaults by
  kind; `focusFirstOverLimitTranslation(container)` in `./translations`; `countCodePoints`, `overLimitKeys`,
  `TextLimitsContext`, `useTextLimits` in `./logic`. `MarkdownEditorRenderArgs.invalid`.
- A ReactNode description of `PageHeader`, `SectionHeader`, `DetailHeader`, `MediaItemField` and `TranslatableField`
  renders in a `<div>` (a string or number stays in the `<p>`).

New entries:

- `./markdown` (optional peers `@uiw/react-md-editor` ^4.1.0 and `rehype-sanitize` ^6.0.0, imported after hydration,
  never from another entry): `MarkdownEditor`, `MarkdownPreview`, `renderMarkdownEditor(options)` for the
  `renderEditor` slot and `AdminUiProvider.renderMarkdownEditor`, `MARKDOWN_ROW_HEIGHT`, `loadMarkdownLibrary`,
  `useMarkdownLibrary`, `extendMarkdownSanitizeSchema`, `MARKDOWN_IMAGE_ATTRIBUTES`, `remarkLineBreaks`. The preview is
  sanitised (raw HTML parsed, then GitHub's rules plus images; a single newline is a line break); the editor follows the
  nearest `.dark` ancestor; the server draws a skeleton; a failed load falls back to a plain text area.
- `./data`: `MetricTile` (label, value, icon, delta, hint, sparkline slot, `isLoading` skeleton, `compact`),
  `MetricTileSkeleton`, `MetricGrid`, `DeltaText` (signed change in the UI language; `preference` higher / lower /
  none; `format` number / percent / explicit `Intl.NumberFormatOptions`; arrow, sign and a hidden word), `NoteList`, and
  `resolveDelta`, `relativeChange`, `deltaDirectionOf`, `deltaToneOf`.
- `ddd-admin-ui-check-contrast <css> [tokens.json]` (bin): WCAG 2.x contrast of the pairs `tokens.json` declares
  (`contrast.pairs`, 4.5 for text, 3 for large text and UI parts; `role/NN` backgrounds), light and dark; fails on a pair
  below its minimum that no exception list names, and on a value it cannot compute (unless `--allow-unevaluated`).
  `--exceptions <file.json>` adds a host's written exceptions (same entry format) to the package's. The package lists
  the five light status pairs (`success` on `card`; `success`, `warning`, `destructive`, `info` on their 15 % tints) as
  exceptions: status colours used as text or on their tint, themed by the host, until an emphasis role exists. Gated in
  the consumer runs (CI and release) on the fixture app's built CSS, whose dark `--primary` moved from `#3b82f6` to
  `#3472d8` (white on it: 3.68:1 → 4.62:1).

Provider and contract:

- `AdminUiProvider formatLocale` and `textLimits`; `FormatLocaleContext`, `useFormatLocale` in `./i18n`.
- `tokens.json`: the optional `--segmented-control-*` variables above and the `contrast` key.
- README: the layers checklist (dialogs open at `--layer-overlay` 50; a host with a higher overlay scale raises it).
- Showcase: sections `./markdown` (through `loadMarkdown`) and `./data`, samples of the new blocks;
  `SHOWCASE_COVERAGE` lists them.
### Framework screens: `./workers` and `./translations`

- New entry `./workers`: the screens of Core's worker monitoring (`WorkersControllerTrait`, mgamadeus/ddd 3.23.1 or
  later). `createWorkersApi({ baseApi, apiPrefix })` injects the six operations into the host's RTK Query api (tag
  `AdminUiWorkers`; the restart request invalidates the live reads) and returns the hooks. `WorkersOverviewScreen`:
  totals as tiles with sparklines, the monitoring-off and sampler banners, the live row per transport with its
  processes, the throughput table per window, the history of every transport over a window switch (1 h – 14 d), the
  transports table by state severity, the loops, the restart of all workers (confirmed). `WorkerTransportScreen`:
  facts, five charts (queue, workers with the configured range, throughput, duration and wait with a logarithmic axis
  when the maximum dwarfs the average), message classes, live processes, and the tabs Message runs and Processes (with
  a lifetime timeline). Their parts are exported, with the status maps `WORKER_TRANSPORT_STATE`,
  `WORKER_PROCESS_STATE`, `WORKER_MESSAGE_OUTCOME` and the payload types. Charts are SVG drawn by the entry (no chart
  library, no optional peer); a step without a reading is a gap, never a 0.
- `./translations` gains the admin screens on the application's translation controllers (the entities of
  mgamadeus/ddd-common-translations and -political): `createTranslationsApi({ baseApi, apiPrefix, paths? })` (tags
  `AdminUiAppTranslations`, `AdminUiLanguages`, `AdminUiLocales`; a locale write refetches the locales and the
  completeness), `AppTranslationsScreen` (keys with their values per `locale::style`, search and filters, bulk delete,
  "Generate all missing"), `AppTranslationKeyDrawer` (key fields, one row per value, a new value),
  `TranslationCompleteness` (per active locale and writing style, generation per locale and style), `LanguagesScreen`
  (active and writing styles in place), `LocalesScreen` (`isActive` and the default flags in place), `ConfigImportCard`
  / `useConfigImport` (import of the configured languages or locales), `useEntityTranslator` (one
  `translateEntities` request per target locale, for `useTranslationRunner`) and `useContentLocales`.
- `./page`: `MaintenanceActionCard` — a maintenance action with its run button (write access applies), pending state
  and the outcome of the last run.
- `./logic`: the api injection of the screen entries (`InjectableBaseApi`, `ApiQueryHook`, `ApiMutationHook`,
  `injectEndpointsOnce`, `toQueryString`, `staticQueryHook`, `staticMutationHook`), `useMemoryUrlState` (search
  parameters in component state for a screen without a router adapter) and `useOptimisticRowPatches` (in-place edits
  of list rows with rollback).
- `./showcase`: sections for both screen entries and `MaintenanceActionCard`; the sample payloads
  `showcaseWorkersData`, `showcaseTranslationsData` (with `createStaticWorkersApi` / `createStaticTranslationsApi`).
- Import matrix: `./workers` may import logic, i18n, primitives, list and page; `./translations` additionally list and
  page and, from form, `Form`, `FormActions`, `FormDrawer`, `FormField`, `FormSubmitButton`; `./showcase` also workers.
- Checks: unit tests of both injections (operations, paths, tags, invalidation; the workers one also on the real RTK
  Query store where the install has it), `screens-render.mjs` in `test:render` (both entries on the sample payloads,
  write access disables restart, generation, toggles and imports), and `browser-screens.mjs` in the Next consumer
  (real RTK Query with an in-memory base query: window switch, restart and refetch, chart tooltip, tabs and filters,
  the `isActive` toggle with its refetches, the key drawer, the import, 390 px).
- `./shell` (new entry): the application frame and its navigation, mechanism in the package, content from the host.
  - `AppShell` (type `AppShellProps`): fixed top bar (`ShellTopBar`: banner, menu button, `brand`, `topBarStart`, the
    breadcrumbs, `topBarEnd`; frosted once the page scrolls, `data-shell-scrolled`), fixed sidebar from `lg`
    (`ShellSidebar`: `<nav>` landmark, nested groups as disclosure buttons with one open group per level, the current
    entry `aria-current="page"`, badges, lock marks, external marks; `sidebarHeader`, `sidebarRailHeader`,
    `sidebarFooter`), the icon rail (`ShellNavRail`: groups as flyout menus, tooltips) toggled by the foot row and `[`
    (`useShellShortcut`; not while typing, in a dialog or menu, or below `lg`), remembered in localStorage per
    `collapsedStorageKey` (`useSidebarCollapsed`, applied right after hydration, followed across tabs), the mobile menu
    below `lg` (`ShellMenuButton`, `ShellMobileMenu`: a sheet from the inline-start edge, closes on a followed link or
    a route change), the content frame (`<main>` behind a "Skip to content" link), an optional `background` and
    `documentTitle`.
  - `ShellBreadcrumbs`: the crumbs of the current path from the same navigation; entity names through the host's
    `useEntityLabel` hook (types `UseEntityLabel`, `EntityLabelRequest`, `EntityLabelResult`); the middle folds into an
    ellipsis menu with the full path on narrow trails (container queries).
  - `ShellDocumentTitle`: keeps `document.title` on the page's name (`Details · Blue widget · Admin`).
  - `AccountMenu` (name, description, avatar or initials, entries as links or actions, `children`, a `fallback`
    without a session), `AccountAvatar`, `AccountSummary`; `LanguageMenu` (languages with native names in their own
    `lang`, the current one checked, `onChange`, `isPending`, `note`), `LanguageMenuItems`, `LanguageMenuSub`.
  - `ShellNavigationProvider` / `ShellNavigationContext` / `useShellNavigation`: breadcrumbs and title without the
    frame. Logical sides throughout (RTL with Radix's `Direction.Provider`).
- `./shell-background` (new entry): `ShaderBackground`, an animated WebGL background (two soft blobs over the base
  colour, generated displacement, a quarter resolution at 20 fps, held when hidden or idle), loaded lazily; nothing
  without WebGL or with reduced motion. Colours from `--shell-background-base`, `--shell-background-blob-1`,
  `--shell-background-blob-2` (falling back to `--background`, `--brand-light`, `--accent`); `tint`,
  `tintShaderPalette`.
- `./logic`: the navigation model (types `NavigationItem`, `NavigationLeaf`, `NavigationGroup`, `NavigationIcon`,
  `NavigationAccess`, `CrumbRoute`, `CrumbLabel`, `CrumbParams`, `ResolvedCrumb`, `ActiveNavigation`) and its pure
  resolvers: `findActiveNavigation`, `isNavigationLeafActive`, `isNavigationGroupActive`, `filterNavigation` (the rights
  predicate), `resolveCrumbs`, `resolveDocumentTitle`, `documentTitleParts`, `normalisePathname`.
- `./primitives`: `PathnameProvider`, `PathnameContext`, `useCurrentPathname`, `useBrowserPathname`, type
  `UsePathname`. `AdminUiProvider.usePathname` sets the pathname hook of every block; `./next` ships
  `useNextPathname`. Without it: `location.pathname` after hydration.
- `tokens.json`: layer `--layer-chrome` (30), optional properties `--sidebar-w` (16rem), `--sidebar-rail-w` (5rem) and
  the three `--shell-background-*` colours, data attributes `data-shell`, `data-shell-collapsed`,
  `data-shell-content`, `data-shell-sidebar`, `data-shell-topbar`, `data-shell-scrolled`, `data-shell-background`,
  `data-nav-key`. `components.css` sets the defaults and reserves the sidebar width on `[data-shell-content]`.
- Showcase: a `shell` section (an interactive frame with the background, folding breadcrumbs, the menus);
  `SHOWCASE_COVERAGE` lists `./shell` and `./shell-background`.
- Checks: resolver unit tests; `shell-render.mjs` (server render: one navigation for sidebar, breadcrumbs and title,
  the rights predicate, no stored state on the server, `./shell` never reaches `./shell-background`); browser checks of
  the shell (active entry, rights predicate, collapse by button and `[`, restored after a reload without a hydration
  warning, rail flyout, mobile menu, folding breadcrumbs, title, RTL).

## 0.1.0

First stable release: 0.1.0-rc.6 plus the description fix below. Published under the `latest` dist-tag; prereleases
stay on `next`. In short, the release candidates brought (details in the sections below):

- the blocks and their entries `./logic`, `./i18n`, `./primitives`, `./list`, `./page`, `./form`, `./translations`,
  `./media`, `./glass`, `./provider`, `./next`, `./notify-sonner`, the stylesheets `./theme.css` and
  `./components.css`, the manifests `./tokens.json` and `./i18n-keys.json`, the bins and `STANDARDS.md` (rc.2);
- list tables with column tracks, pinned columns, sortable headers, a row index, and status contexts (rc.3);
- `SegmentedControl`, the `./showcase` entry and per-column sort cycles (rc.4);
- Combobox server search, clearing, groups and a create row, selectable rows, `CopyButton`, date input and storage
  helpers, the provider's link component with sticky parameters (rc.5);
- `FormDialog`, the header slot and the document-level save shortcut of `FormActions`, `useConfirm` on the provider
  with `requirePhrase` and a queue, and write access as a presentation aid (rc.6).

Fix:

- A description that is not a string or number (two paragraphs, a list, a `<div>`) renders in a `<div>` instead of the
  `<p>` of `DialogDescription` / `SheetDescription`, with the same classes, `data-slot` and `aria-describedby` wiring:
  no `<p>` nested in a `<p>`, no hydration warning. Covers `useConfirm` / `ConfirmOptions.description`,
  `FormDialog.description`, `FormDrawer.description` and `MediaItemPickerDialog.description`. A string description
  renders the same DOM as in 0.1.0-rc.6. Consumer checks in the browser: a block description in `useConfirm`,
  `FormDialog` and `FormDrawer` (a `<div>` referenced by `aria-describedby`, no `<p>` in a `<p>`, no console error or
  hydration warning), a string description still a `<p>`.

## 0.1.0-rc.6

All additions are optional props or new exports: a caller that uses none of them renders the same DOM as in
0.1.0-rc.5, proven by a server-render snapshot taken from 0.1.0-rc.5 (`form-actions-snapshot.html`: `FormActions`,
`FormSubmitButton`, `AddEntityButton`, `EntityListBulkBar`, `EntityDetailShell`, `FormHeader`, `DetailHeader`), next to
the list snapshot from 0.1.0-rc.2 (`pnpm test:render`; icons are reduced to their own classes, so the snapshot holds
at every lucide-react the peer range admits).

- `FormDialog` in `./form` (type `FormDialogProps`): a form in a dialog with or without a form library. Props `open`,
  `onOpenChange`, `title`, `description`, `children`, `submitLabel`, `pendingLabel`, `cancelLabel`, `isPending`,
  `isDirty` (a close request asks "Discard changes?"), `submitDisabled`, `submitVariant` (`default` / `destructive`),
  `ignoreWriteAccess`, `className`, `onSubmit`, and an optional react-hook-form instance `form` (then `FormField` works
  inside and `onSubmit` gets the parsed values; react-hook-form stays a peer). A real `<form>`: Enter in a text field
  and ⌘S submit it; a dialog opened from it is its own form (its submit never reaches this one). Escape, the backdrop
  and Cancel are ignored while pending or while the promise `onSubmit` returns runs; after a failed submit the dialog
  is usable again. The focus returns to the element that had it when the dialog opened.
- `FormActions`:
  - ⌘S / Ctrl+S listens on `document`. Inside a dialog or drawer (`[role="dialog"]`, `[role="alertdialog"]`) it answers
    anywhere inside the innermost container holding the focus; elsewhere with focus in the form, on the actions (also
    portalled) or nowhere (`body`). In scope it prevents the default, also while the primary is disabled (then nothing
    submits); an event already `defaultPrevented` is left alone, so of two forms only one answers. It submits with
    `form.requestSubmit(submitter)`, the actions' own submit button linked to the form first, else any submit button the
    form owns. (Before: a listener on the form only; focus on `body` or on a portalled footer did nothing.)
  - `placement: 'auto' | 'row' | 'header'` (`header` is new). `auto` moves the pill into the header slot closest above
    the form when one is mounted, else it stays as before; `header` asks for the slot (without one: as `auto`); `row`
    never moves. In a slot the actions are the same pill, floating under the top bar (`--nav-h`) once the header
    scrolls away while the form is in view; the portalled submit button is linked back with the `form` attribute.
  - Inside a dialog that is not a `FormDrawer` the actions render the plain row by themselves (as `sticky={false}`);
    `sticky` without a value is now "pill on a page, row in a dialog", an explicit `sticky` keeps the pill there.
- Header slot in `./primitives`: `FormActionsSlotProvider`, `FormActionsSlot` (types `FormActionsSlotProviderProps`,
  `FormActionsSlotProps`); `EntityDetailShell formActionsSlot` (brings its own provider; a nested shell takes the
  actions of its own forms), `FormHeader formActionsSlot` and `DetailHeader formActionsSlot` (inside a provider around
  header and form). Of several slots in one provider the one closest above the form wins.
- `useConfirm()` in `./logic` (with `ConfirmContext`): `confirm(options): Promise<boolean>` of the nearest
  `AdminUiProvider`, which draws the dialog; nothing to render in the screen. Calls queue; each settles exactly once; an
  unmounted provider settles its pending calls with `false`; Strict Mode safe; the focus returns to the element that
  asked. Without a provider every call answers `false` with one warning outside production. `AdminUiProvider.confirm`
  takes the host's own service (then `useConfirm()` calls it and the package dialog does not render).
  `createConfirmQueue` (types `ConfirmQueue`, `ConfirmQueueEntry`) is the queue behind it. `useConfirmDialog` stays.
- `ConfirmOptions.requirePhrase` and `requirePhraseLabel`: the confirm button stays off until the phrase is typed
  (trimmed, exact), in `useConfirm` and `useConfirmDialog` alike. `useConfirmDialog` now also returns the focus to the
  element that had it when the dialog opened (before: Radix focused no trigger).
- Write access in `./logic`: `WriteAccessProvider value={{ allowed, reason? }}` (nestable, a subtree only narrows; no
  provider = allowed), `useWriteAccess()`, `WriteAccessContext`, `narrowWriteAccess`, `WRITE_ACCESS_ALLOWED`, types
  `WriteAccess`, `WriteAccessProviderProps`. Honoured by `FormSubmitButton`, `FormDialog`'s submit, the actions and
  Delete of `EntityListBulkBar` (not Clear) and `AddEntityButton` as a button (never as a link); the reason is the
  disabled control's title. `ignoreWriteAccess` on `FormSubmitButton`, `FormDialog` and `EntityListBulkAction` for a
  control that only reads. A presentation aid: it replaces no handler guard and no server check.
- Showcase: samples of `FormDialog`, `useConfirm` (with a phrase), the header slot and write access;
  `SHOWCASE_COVERAGE` lists `FormDialog`, `FormActionsSlotProvider`, `FormActionsSlot`.
- Text keys: new `Cancel__form-dialog`, `Type “%phrase%” to confirm`. `Cancel__confirm-dialog` and
  `Confirm__confirm-dialog` are now used by `primitives/confirmDialogView.tsx` (the shared dialog).
- DOM of the new paths only: `data-form-actions-slot` on a slot, `data-form-actions-placement="header"` and
  `data-form-actions-floating` on the pill in a slot, `data-confirm-phrase` around the phrase field.
- Docs: `STANDARDS.md` § 14 (form dialogs and confirmations) and § 15 (write access; the toolbar and bulk sections no
  longer pass the write flag to every control), § 8 header slots; README provider props and confirmations; the skill.
- Consumer checks: the snapshot from 0.1.0-rc.5 and write access (server render); in the browser `FormDialog` (Enter,
  pending, failed submit, a nested dialog, two forms on a page, focus return), the shortcut (focus on `body`, a drawer
  footer button outside the form, focus in another form, a disabled primary, two nested dialogs), header slots (closest
  slot, nested shells, `row`, the `form` attribute, the floating pill) and `useConfirm` (Escape, focus back to the
  trigger, queue, phrase, inside a drawer, two providers, Strict Mode, unmount); unit tests for the confirm queue, the
  missing-provider answer and the write access merge.

## 0.1.0-rc.5

- `EntityListTable` / `EntityListBody`: `rowClassName(item, index)` for extra row classes.
- `useRowSelection`: `isSelectable(item)`. A row it refuses gets a disabled checkbox; "Select all loaded", the header
  state, the count and `selectedKeys` take selectable rows only. `EntityListSelection` gains the optional
  `isItemSelectionDisabled` (a row without a key still gets no checkbox).
- `Combobox`: `clearable` (a clear control; re-picking the picked option clears; without it the value is kept, as
  before), `onSearch` (server search: no client filtering, debounced 300 ms, `''` on close; the list never shows the
  previous term's options) with `isSearching`, option `group` (headings in first-appearance order) and `badge`,
  `onRequestCreate` (a "Create “…”" row while no label equals the trimmed term), `selectedOption` (the label of a picked
  value outside the options), `popoverClassName`; `COMBOBOX_SEARCH_DEBOUNCE_MS`. With `clearable`, `className` sizes a
  wrapper around trigger and clear control.
- `./logic`: `useLatestSearch` (only the answer to the last term counts; aborts the previous request), date input
  values `toDateInputValue`, `fromDateInputValue`, `toDateTimeInputValue`, `fromDateTimeInputValue` with an explicit
  `'local' | 'utc'` zone (`DateInputZone`), `withStickyParams(href, names, currentSearch)`, the guarded storage helpers
  `readStored` / `writeStored` (`StorageArea`, moved from the Next adapters, which use them from here) and
  `buildStorageKey(prefix, area, name)` → `<prefix>.<area>.<name>`.
- `CopyButton` in `./list`: `value`, `label`, `reveal` (`always` / `hover`), `notify` (a toast through `notify`).
- Links: `AdminUiProvider.linkComponent` sets the router link of every block that renders a link (`EntityTabs`,
  `SectionHeader` tabs, `EntityDetailShell` back link, `AddEntityButton`, and `BreadcrumbLink` with an `href`); a
  block's own `linkComponent` still wins. Without the provider prop every link renders as before.
  The link contract (`PageLinkProps`, `PageLinkComponent`, `AnchorLink`) moved to `./primitives` with
  `LinkComponentContext`, `LinkComponentProvider`, `useLinkComponent`; `./page` still exports the old names.
- `EntityListEmpty size="compact"`: one inline line. `DefinitionList layout="rows"`: divided rows, label left, value
  right. `FilterDateRange hideLabel` with `fromLabel` / `toLabel` (and `className`) for an inline range.
- `PageFrame` / `EntityListPage` `asSpecimen`: no `data-page-frame`, no full-height frame (used by the showcase, so a
  host rule keyed to the attribute no longer fires there).
- `SegmentedControl`: a control wider than its container scrolls inside itself, keeping the selected and the focused
  option in view (touch swipes scroll then, the drag preview stays for mouse and pen); options no longer shrink.
  Options take `context` (passed to `t()`) and `translate: false` for already translated text.
- `ConfirmOptions.description`: documented — may be a React node; the package's own confirmations pass plain text.
- Showcase: samples of the new props and blocks; specimen cells shrink (`min-w-0`), so a wide specimen does not widen
  the page at 390 px.
- DOM change: `FormActions` renders `data-form-actions="admin-ui"` (was an empty value), and `components.css` selects
  that value only, so a host's own action bar with a bare `data-form-actions` is no longer restyled.
- Text keys changed (move host translations):
  - `Search for a command to run...` → `Search for a command to run…`
  - the translation progress statuses got the context `translation-status`: `Waiting`, `Translating`, `Done`,
    `Failed`, `Cancelled` → `Waiting__translation-status`, `Translating__translation-status`,
    `Done__translation-status`, `Failed__translation-status`, `Cancelled__translation-status`.
    `Translating…` (the running button label) stays a separate key: a button text, not a status word.
  - new: `Clear`, `Copied`, `Could not copy`, `Create “%term%”`.
- Consumer checks: Combobox in the browser (out-of-order answers, picked label outside the results, reset on close,
  keyboard through groups and the create row, clearing), selectable rows, SegmentedControl in a 358 px container, the
  showcase at 390 px without page scroll and without `data-page-frame`, links through the provider's link component
  keeping sticky parameters; unit tests for the date values (UTC and Europe/Berlin around midnight and both clock
  changes), `withStickyParams` and the storage helpers.

## 0.1.0-rc.4

- `SegmentedControl` in `./primitives`: one value out of a few. Props `value`, `onValueChange`, `options` (`value`,
  `label`, `icon`, `badge`, `description`, `disabled`, `disabledReason`, `className`), `aria-label` (required),
  `height` (32 / 36 / 40 / 48), `iconOnly`, `fullWidth`, `selection` (`surface` / `primary`), `tone`
  (`default` / `onBrand`), `activation` (`automatic` / `manual`), `className`; types `SegmentedControlProps`,
  `SegmentedControlOption`. A radio group (`role="radiogroup"`, `role="radio"` + `aria-checked`, one tab stop): arrows,
  Home and End move and select (manual: move the focus, Space / Enter select), right to left aware, disabled options
  skipped with their reason announced and shown as a tooltip, `description` announced through `aria-describedby`,
  `badge` hidden from assistive technology, `iconOnly` keeps the label as name and tooltip. A sliding indicator,
  measured after layout, without motion under reduced motion; at least a 44 px target on coarse pointers. Pressing and
  dragging across the options previews the choice; the value changes once on release; Escape or a cancelled pointer
  restores it; a touch drag starts only after a sideways movement. New optional properties in `tokens.json`:
  `--segmented-control-radius` (9999px) and `--segmented-control-duration` (200ms), defaults in `components.css`.
- New entry `./showcase`: `Showcase` draws every block of the package in the host's theme, light and dark, one section
  per entry, with the host's sections appended (`sections`, `themes`, `omit`); `SHOWCASE_COVERAGE` lists the drawn
  components per entry. It needs none of the optional peers: `./notify-sonner` loads lazily through `loadNotifySonner`
  and is skipped without it or when the import fails; `./next` is described, never imported. Its texts stay out of
  `i18n-keys.json` (the manifest builder skips the entry). `check-package` allows the entry the block entries only.
- List table sort: `EntityListColumn.sortStart` (`'asc'` / `'desc'`, the first direction when the column becomes
  sorted) and `sortRequired` on `EntityListTable` / `EntityListBody` (never unsorted: the third click returns to the
  first direction). `nextListSort(current, key, { start, required })` takes the same cycle (new type `ListSortCycle`);
  calls without it keep the old cycle. A sortable header with `align: 'end'` puts the arrow before the label.
- Consumer checks: SegmentedControl in the browser (roles, both activation modes, right to left, disabled reason,
  description, icon-only name and tooltip, drag preview with one change on release and none on Escape or cancel); the
  showcase rendered on the server, bundled for the browser without optional peers and hydrated in the Next app; the
  sort cycle with `sortStart` on an end-aligned column. The fixture app sets its UI language in one shared module.

## 0.1.0-rc.3

- List table, all optional (a table without the new props renders the same DOM and classes as 0.1.0-rc.2, proven by
  a server-render snapshot taken from 0.1.0-rc.2, `pnpm test:render`):
  - Column tracks: `EntityListColumn.width` (`'1fr'`, `'2fr'`, `'120px'`), `minWidth` (px, default 120), `align`
    (`start` / `center` / `end`). One column with a width gives every column a track (default `1fr`); share columns
    never go below their minimum, and when the minimums exceed the visible width the table scrolls sideways inside its
    card. A table with tracks is one CSS grid (every row a subgrid, table roles kept); without any width the layout
    stays content-sized.
  - Pinned columns: `pin: 'start' | 'end'`. `end` always holds; `start` only while the table overflows by 120 px or
    more and the pinned columns take less than a third of the visible width. In a table using tracks, pins or the row
    index, the selection column and the row index always pin. A pinned cell paints the card surface and its edge only
    while content scrolls under it.
  - Sortable headers: `sortKey` on the column, `sort` / `onSortChange` on `EntityListTable` and `EntityListBody`;
    not sorted → ascending → descending → not sorted, `aria-sort`, the header content is a button. The table never
    sorts rows itself.
  - Row index: `showRowIndex`, a leading `#` column, 1-based among the loaded rows (new text `Row number`).
  - Sizes are measured after hydration only (server and hydration render use the CSS form of the same tracks).
- `EntityListBody.renderOwnView(mode)`: a view that owns its data and states, drawn in the list card as is, without
  the paged list's skeletons, empty and error states and tail. `renderExtraView` is unchanged.
- `./logic`: `nextListSort`, `parseListSort`, `formatListSort` (`key:asc`), `EntityListSort`, `ListSortDirection`; the
  pure track and pin mechanics `computeListTracks`, `listTrackTemplate`, `minimumListWidth`, `hasListTracks`,
  `resolveListPins`, `shouldHonourStartPins`, `LIST_COLUMN_MIN_WIDTH`, `LIST_PIN_MAX_VISIBLE_SHARE`,
  `LIST_PIN_MIN_OVERFLOW` and their types (`ListColumnWidth`, `ListColumnPin`, `ListColumnAlign`, `ListTrack`,
  `ListTrackLayout`, `ListPinRequest`, `ListPinPlacement`, `ListPinMeasure`, `ListPinLayout`).
- Status contexts: `StatusDefinition.context` and `defineStatusMap(map, { context })` (`StatusMapOptions`; the
  definition's context wins). `StatusBadge` translates label and description with it. `m()` takes an optional
  `{ context }` (`MarkOptions`) that text exports read: `m('Failed', { context: 'import-status' })` → key
  `Failed__import-status`. Existing calls are unchanged.
- `tokens.json`: data attributes `data-list-tracks`, `data-list-pin`, `data-list-pin-edge`, `data-list-overflow-start`,
  `data-list-overflow-end` (read by `components.css`). No new colour role or custom property.
- Removed the optional peer `recharts` (no entry used it).
- Docs: pin the exact version while the package is in 0.x prereleases; neutral examples in `STANDARDS.md`; the list
  section and the skill describe the new table props.
- Consumer checks: the no-prop snapshot and the status context (server render), and a list page with tracks, pins, sort
  and row index in the browser (pin guard at three widths, sideways scroll inside the card at 390 px, sort cycle).

## 0.1.0-rc.2

- The real blocks replace the sample source. Entries: `./logic` (pure helpers, React hooks, browser helpers),
  `./i18n`, `./primitives`, `./list`, `./page`, `./form`, `./translations`, `./media`, `./glass`, `./provider`,
  `./next`, `./notify-sonner`, plus `./theme.css`, `./components.css`, `./tokens.json` (31 colour roles, properties,
  layers, data attributes, utilities per role) and `./i18n-keys.json` (128 texts). `STANDARDS.md` describes how list,
  detail, form and drawer screens are composed.
- Removed: the `./data` entry (no blocks yet).
- `radix-ui` is a peer (`^1.8.1`), no longer a dependency: the host installs one Radix copy.
- Exports use the `default` condition (was `import`).
- New bins: `ddd-admin-ui-check-tokens`, `ddd-admin-ui-check-radix`, `ddd-admin-ui-i18n-manifest` (scripts shipped in
  `dist/scripts`); `scripts/check-tokens.mjs` at the package root is gone. `ddd-admin-ui link-skills` is unchanged.
- `check-package` follows the rules as built: client boundaries without a hook are listed, not failed; runtime and
  type-only edges are checked apart, with file limits for `page → list`, `form → page` and `translations → form`;
  the declarations compile in a strict consumer (bundler and nodenext); the text manifest is compared against the
  built JS; the `utilities` lists of `tokens.json` must equal a fresh extraction.

## 0.1.0-rc.1

- First published version of the scaffold (the content of 0.1.0-rc.0).
- Release step: the version is part of `i18n-keys.json`, so a version bump is followed by `pnpm i18n:manifest`
  before the commit; the release checks refuse a stale manifest.

## 0.1.0-rc.0 (tagged, not published: its manifest named the former version)

- Repository scaffold: unbundled `tsc` build with per-file `'use client'` directives, `check-package` (13 rules, a
  failing fixture per rule), `check-tokens` for hosts, the i18n key manifest, consumer tests (Next 16 build,
  hydration, overlays, CSS, optional peers, strict type checks), CI and the tag release workflow, and the
  `ddd-admin-ui link-skills` command. Sample source only.
