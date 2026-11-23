---
name: ddd-admin-ui-specialist
description: "Build admin screens with @mgamadeus/ddd-admin-ui and extend it: entries, import matrix, host setup (AdminUiProvider, theme.css, components.css, tokens.json, check scripts), the app shell (./shell: sidebar, rail, mobile menu, breadcrumbs, title), list pages with URL filters, date presets, column factories, bulk menus, wide tables, detail shells, route states, form drawers and dialogs, useConfirm, write access, agent hooks, locale::style translations (delta saves), image crop, colour fields, key figures, markdown, the admin screens ./workers, ./translations, ./issues, ./database, ./crons, ./files and ./clouddrive (file manager, drive), status text roles, ./design-studio, i18n-keys.json, new blocks. Use when building a frame, list, detail, form, file manager or admin screen, a save deletes a background translation, Tooltip must be used within TooltipProvider, Cmd+S submits the wrong form, a confirm answers false, breadcrumbs miss a page, contrast or status text fails, or URL filters get lost."
metadata:
  author: mgamadeus
  version: 0.3.12
---

# ddd-admin-ui specialist

Package docs (read them for setup and the full entry list): `README.md` and `STANDARDS.md` at the root of the
installed package (`node_modules/@mgamadeus/ddd-admin-ui/`). This skill reaches a project through
`npx ddd-admin-ui link-skills`.

## Which block for what

| Need | Use | Entry |
|---|---|---|
| a list page (header, toolbar, table or card grid) | `EntityListPage` + `EntityListToolbar` + `EntityListBody` | page, list |
| search and filters in the URL | `useUrlListState` with `useNextUrlStateAdapter` | logic, next |
| grid / table switch remembered per list | `useListViewParam` + `EntityListViewToggle` | next, list |
| checkbox column and bulk actions | `useRowSelection` + `EntityListBulkBar` + `runSequentialWithSummary` | logic, list |
| status pill of an enum | `defineStatusMap` + `StatusBadge` (a `context` for an ambiguous word) | logic, list |
| a wide table: column tracks, pinned columns, sortable headers, row numbers | `EntityListColumn` `width` / `minWidth` / `pin` / `align` / `sortKey` + `sort` / `onSortChange` / `showRowIndex` | list |
| the sort in the URL | `formatListSort` / `parseListSort` / `nextListSort` (`key:asc`; `sortStart`, `sortRequired`) | logic |
| one value out of a few (period, scope, view) | `SegmentedControl` (not tabs, not toggle chips) | primitives |
| a picker over a server search, with clear / create | `Combobox` `onSearch` + `useLatestSearch`, `clearable`, `onRequestCreate` | list, logic |
| copy a value next to it | `CopyButton` | list |
| one router link for every block, sticky search parameters | `AdminUiProvider.linkComponent` + `withStickyParams` | provider, logic |
| the application frame: sidebar (groups, badges, locks), icon rail with `[`, mobile menu, top bar slots | `AppShell` with one `NavigationItem[]` tree, `canAccess`, `AdminUiProvider usePathname={useNextPathname}` | shell, logic, next |
| breadcrumbs and the tab title from the same tree | leaf `crumbs` (`'create'`, `':itemId'` + `entity`), `useEntityLabel`, `documentTitle={{ appName }}`; `resolveDocumentTitle` on the server | shell, logic |
| breadcrumbs with scope, query-string tabs, rights per crumb, pages only in the trail | `leadingCrumbs`, `queryCrumbs` + `search`, `canAccessCrumb`, `crumbOnly`, `crumbLink` / `crumbHidden` | shell, logic |
| shell parts without `AppShell`, controlled open groups, loading navigation | `ShellNavDisplayProvider`, `navOpenGroupKeys`, `navigationLoading` | shell |
| account and language menus fed by the host | `AccountMenu` (entries, `LanguageMenuSub` inside; `triggerVariant="avatar"`, `header`), `LanguageMenu` (`renderOption`) | shell |
| an animated background | `background={<ShaderBackground />}` (separate, lazy) | shell-background |
| a `type="date"` / `datetime-local` value | `toDateInputValue` / `fromDateTimeInputValue` … with `'local'` or `'utc'` | logic |
| see every block in the host theme, light and dark | `Showcase` on a development route | showcase |
| a view that loads its own data (a tree) in the list card | `EntityListBody.renderOwnView` | list |
| an entity detail with tabs | `EntityDetailShell` (+ `SectionHeader`, `DefinitionList`) | page |
| a form page or drawer | `Form` + `FormField` / `FormSection` + `FormActions`, in `FormDrawer` | form |
| the Save / Cancel pill in the page header | `EntityDetailShell formActionsSlot`, or `FormHeader formActionsSlot` / a host `FormActionsSlot` inside one `FormActionsSlotProvider` | page, form, primitives |
| a short form in a dialog (rename, a reason) | `FormDialog` (`form` optional: react-hook-form or plain state) | form |
| drawer state in the URL (`?edit=<id>`, `?create=1`) | `useEntityDrawer` with `useNextDrawerUrlAdapter` | logic, next |
| a text per content locale | `useEntityTranslations` + `FormTranslatableInput` / `FormTranslatableMarkdown` | logic, translations |
| one text per language plus the field's store (`{ de, en }` call sites) | `TranslatableLanguageInput` / `TranslatableLanguageMarkdown` (`onChange({ texts, store, reason })`; `languageTextsOf` / `storeWithLanguageTexts`) | translations, logic |
| the tab from the URL; no `translationInfos` when nothing changed | `useEntityTranslations({ activeLocale, onActiveLocaleChange })`, `buildChangedPayload` | logic |
| tabs only for offered locales; the edited key per field (FORMAL, else INFORMAL) | `useEntityTranslations({ offeredTabsOnly, editedKeyPerField })` | logic |
| Shift-click ranges, a header that sticks to the page over a sideways scroller, a table that fills its card | `useRowSelection({ rangeSelection })`, `EntityListTable` `selectionHitArea`, `stickyHeader="page"`, `fillWidth` | logic, list |
| one seamless scroll edge, sized select / `#` columns, a table on a popover, widths without padding | `EntityListTable` `pinEdge="overlay"`, `selectionColumnWidth` / `indexColumnWidth`, `surface`, `columnWidthBox="content-box"` | list |
| the host's cell padding, header / table classes, no built-in empty block, a table in the page flow | `EntityListTable` `cellPaddingX`, `headerRowClassName` / `headerCellClassName` / `tableClassName`, `showEmptyState={false}`, `scroll={false}`; edge look via `--list-edge-*` | list |
| crumbs, list sort or tracks in a worker, a Node script or a CommonJS test | `./logic/pure` (no React, no ddd-web; `require` works) | logic/pure |
| a media reference | `FormMediaItemField` (+ the host's `MediaItemPickerDialog`) | media |
| a confirmation from screen code | `useConfirm()` → `confirm(options)` (the provider draws it; `requirePhrase` for a typed name) | logic |
| a confirmation inside a block with its own dialog | `useConfirmDialog` (returns `{ confirm, dialog }`) | form |
| write controls off for a read-only user | `WriteAccessProvider value={{ allowed, reason }}`, `useWriteAccess()`, `ignoreWriteAccess` on reading controls | logic |
| a toast | `notify.success / info / error / loading / submitError` | logic |
| a date filter with presets (today, last 7 / 30 days, custom) | `FilterDateRange presets` (+ `onRangeChange`) | list |
| columns without boilerplate (id, text, number, money, date, status, actions) | `idColumn`, `textColumn`, `moneyColumn` (currency required), `actionsColumn` (`width: 'content'`, pinned end) | list |
| bulk action with sub-choices, a counted confirmation, a hint | `EntityListBulkAction` `choices` / `onChoose`, `confirm`, `hint`; `moreOnServer` | list |
| a bulk run that skips rows on purpose | `skipSequential(reason)` + `runSequentialWithSummary` (`skipReasons`), `bulkSummaryText` | logic |
| filter toggle / count / clear outside the toolbar | `FilterToggleButton`, `FilterCountBadge`, `ClearFiltersButton` | list |
| table only from `lg` (many columns) or at every width | `EntityListBody tableBreakpoint` + the same on `EntityListViewToggle` | list |
| a master-detail drawer beside the page | `FormDrawer modal={false}` (`nonModalFrom`) | form |
| one tab per language, length limits on translatable texts | `useEntityTranslations({ tabModel: 'language' })`, `maxLength` / `AdminUiProvider textLimits`, `focusFirstOverLimitTranslation` | logic, translations |
| a markdown field or sanitised markdown text | `renderMarkdownEditor` / `MarkdownEditor`, `MarkdownPreview` (peers `@uiw/react-md-editor`, `rehype-sanitize`; loaded after hydration) | markdown |
| key figures with a change, a sparkline slot, footnotes | `MetricGrid` + `MetricTile` + `DeltaText` (`preference`, `format`), `NoteList` | data |
| a crashed or loading route (`error.tsx`, `loading.tsx`) | `RouteError` (`onRetry`, `onReport`), `RouteLoading` | page |
| crop or normalise a picked image | `ImageCropDialog` (`aspectOptions`, `allowSkip`, `output`) + `normalizeImage` | media, logic |
| a colour value | `ColorValueField` with an explicit `format` (`hex` / `hex-alpha`) | form |
| the workers monitoring (overview, transport, runs, processes, restart) | `createWorkersApi({ baseApi, apiPrefix })` + `WorkersOverviewScreen` / `WorkerTransportScreen` (`headerActions`, `renderSection`, `linkComponent`) | workers |
| one section of a package screen as host code | `renderSection(id, section)` (keep / `null` / own node); the exported parts (`WorkerTransportFacts`, `WORKER_TRANSPORT_TABS`) | workers |
| charts of one window with a shared hover, round axis ticks | `WorkerChartSyncGroup` + `WorkerTimeChart ticks={countTicks \| durationTicks}` | workers |
| a list row that opens by keyboard (no own button) | `EntityListBody` / `EntityListTable` `rowKeyboardActivation` with `rowAction` | list |
| app translations, languages, locales, import from configuration | `createTranslationsApi({ baseApi, apiPrefix, bulkDelete? })` + `AppTranslationsScreen` (slots: `headerActions`, `moreActions`, `toolbarTrailing`, `columns`, `extraFilters`, `renderCard`, `useListQuery`) / `LanguagesScreen` / `LocalesScreen` / `ConfigImportCard` | translations |
| a host hook on the same cache entry as a package screen | `buildAppTranslationKeysListArgs`, `CONTENT_LOCALES_ARG` / `useActiveLocales`, the exported tags | translations |
| an Add button in a list's empty state | `EntityListBody emptyAction` | list |
| delta saves of a translatable form, rebase on a newer copy | `useEntityTranslations({ translationSaveMode: 'delta' })` → `buildSavePayload`, `omitScalars`, `rebase`, `getBaseline`; pure: `buildDeltaTranslationInfos`, `rebaseTranslations` | logic |
| a translation that runs on the server: progress rows, no cancel, Dismiss, "Save and translate", per-locale markers | `BackgroundTranslationControls rows={translationProgressRowsOf(parts)}` (`onDismiss`, `isDirty`, `localeMarkers`, `failureReasonLabels`) | translations, logic |
| AI translation of an entity form, content locales from the active locales | `useEntityTranslator(api)` (several drafts per request: `useEntitiesTranslator`) + `useTranslationRunner`, `useContentLocales(api)` | translations, logic |
| an import from configuration of a host kind (countries) | `ConfigImportCard kind="countries" operation={…} texts={…}` | translations |
| the error groups of the issues registry (environments, status tabs, trend, occurrences, resolve / ignore / reopen) | `createIssuesApi({ baseApi, apiPrefix })` + `IssuesScreen` (`urlStateAdapter`, `drawerUrlAdapter`) | issues |
| one error occurrence (frames with code, causes, request, job, client) in a host's own view | `IssueEventDetails` (+ `IssueFrameList`, `IssueCauses`) | issues |
| the schema diff (apply per table or in bulk, blocked tables, the signature gate, generated SQL and model code) | `createDatabaseApi({ baseApi, apiPrefix })` + `SchemaDiffScreen` (`GeneratedCodePanel` alone for the previews) | database |
| scheduled commands: list with health, run now, on / off, runs and output, timeline, create / edit with schedule preview | `createCronsApi({ baseApi, apiPrefix })` + `CronsScreen` (`urlStateAdapter`, `drawerUrlAdapter`) | crons |
| crons worst first, polling, times in the viewer's zone; issues with a custom range or load-more; a reworded schema-write refusal | `CronsScreen` `sort="severity"`, `*PollingIntervalMs`, `timeZone="viewer"`; `IssuesScreen` `customTrendRange`, `pagination="load-more"`; `SchemaDiffScreen` `isSchemaWritesRefusal` | crons, issues, database |
| workers screens with host sections that follow the window, more than 500 runs; translations filtered by language, host slots and sort columns; host cache tags | `renderSection(id, section, state)`, `listMaxTop`; `AppTranslationsScreen` `languageFilter`, `transformListArgs`, `rowActions`, `cardFooter`, `renderCard` `parts`; `createWorkersApi` / `createTranslationsApi` `tags` | workers, translations |
| keys in any of several languages, a sort select on the cards, the host's cost estimate in the generation confirmation (a React node: a host `confirm` service must render nodes); tags per operation; crons polling by state, severity tie-break or host order; environment labels by pattern | `AppTranslationsScreen` `languageFilter="multiple"`, `cardSort`, `renderGenerationEstimate` + `loadGenerationPreview`; `tags: { provides: { byOperation } }` or `(operation, kind) => tags`; `CronsScreen` `detailsPollingIntervalMs={cron => …}`, `severityCompare`; `IssuesScreen` `environmentLabels={code => …}` | translations, logic, crons, issues |
| list filters that follow Back / Forward, a list that never restores or saves only its own keys | `useUrlListState` (re-syncs on outside URL changes); `useNextUrlStateAdapter({ restore: false, savedKeys })` | logic, next |
| a text-only host confirm service plus typed-phrase confirmations | `AdminUiProvider confirmWithPhrase="package"` (or a function); `ConfirmDialogView` | provider, form |
| status text legible on a host whose status colours are fills | set `--success-text`, `--warning-text`, `--destructive-text`, `--info-text` (light and dark); badges keep `StatusBadge` | theme.css, tokens.json |
| a maintenance action (run, pending, last outcome) | `MaintenanceActionCard` | page |
| a file area: folder tree, grid / table, upload tray, drawer with preview, versions, activity, trash, links, moves between areas | `FileManager` + a `FileManagerAdapter` (`capabilities`: `trash`, `versions`, `activity`, `links`, `moveAcrossAreas`, `filters`, `workingCopy`); slots `renderAreaSettings`, `renderAreaMaintenance`, `renderAreaPicker`, `formatEventType` | files |
| file manager state in the URL (folder path, file, tab), Back / Forward through folders, sticky breadcrumbs with sibling menus, the path bar (Ctrl/Cmd+L, `drive/<id>`, completion), Copy path / Copy link | `FileManager` `urlKeys` (`renameUrlStateKeys`), `pushKeys` of `useUrlListState` (adapter `push`), capability `location.resolveLocation`, `buildLink`, `readOnlyNotice` | files, logic |
| accesses of a file (viewed, downloaded) and a partner audience without staff-only controls | capability `activity.useAccessEvents`, `audience: 'partner'`; drive: `createCloudDriveApi({ audience: 'shared' })` | files, clouddrive |
| an upload with progress through the host's session | `uploadWithProgress(transport, request, callbacks)`, `useFileUploadQueue` + `UploadTray` | files |
| the drive of mgamadeus/ddd-clouddrive (spaces by group, versions, history, trash, malware status) | `createCloudDriveApi({ baseApi, apiPrefix })` + `CloudDriveScreen`; own screen: `useCloudDriveFileAdapter({ api, spaceId })` + `FileManager` + `CloudDriveSpacePicker`; text / PDF previews need the bucket's CORS | clouddrive |
| an agent or test reading the screen: row keys, list state, unsaved forms, may it navigate | `data-row-key` on rows and cards, `onListStateChange` + `activeFilters`; `useUnsavedChangesGuard(…, { form, label })` + `getDirtyForms()`; `useNavigationGuard().canNavigate()` | list, logic |
| mark regions for an agent: anchor, secret value, chrome | `data-agent-anchor` (host), `data-agent-secret` (`Input type="password"` sets it), `data-agent-skip` (package chrome sets it) | README › Screen state for agents |

## Rules that fail silently

- **Provider above every page.** `AdminUiProvider` renders the tooltip provider, the portal container and registers
  the notification adapter. Without it a date cell throws ("`Tooltip` must be used within `TooltipProvider`") and
  `notify` does nothing (one warning outside production).
- **CSS and tokens.** `theme.css` and `components.css` after `@import 'tailwindcss'`; every property of `tokens.json`
  on `:root` (themed ones also under `.dark`). Run `ddd-admin-ui-check-tokens <built css>` after a theme change: a
  missing colour role means a utility without a rule, so the element is simply transparent.
- **Status text roles.** `text-success` … read `--<status>-text` and the badge tints `--<status>-soft` through
  `theme.css`; unset they are the status colour (and its 15 % tint). The contrast check has no package exceptions: a
  host whose status colours are fills sets the text roles. A host with its own Tailwind binding must bind them itself:
  `--text-color-<status>` and `--color-<status>-soft` (the status badges read that binding, never the bare property;
  with channel values `hsl(var(--success-soft))`). `ddd-admin-ui-check-tokens` names a declared role nothing reads and
  a channel value read as a whole colour.
- **Schema writes disabled.** A 403 on a schema-diff apply means `APP_SCHEMA_WRITES_DISABLED` on that process, not
  missing rights; `SchemaDiffScreen` shows it and turns read-only. Crons' Run now only queues (the next runner tick
  runs it); a 409 is shown as the server's message.
- **One Radix copy.** `radix-ui` is a peer; single `@radix-ui/*` packages of the host match the versions `radix-ui`
  pins. Two copies of one Radix package keep separate focus traps and outside-click layers (an overlay closes the wrong
  one, focus jumps). Run `ddd-admin-ui-check-radix` in the host after dependency changes.
- **Layers.** Overlays stack with `z-(--layer-overlay)` and `z-(--layer-popover)` (both 50 by default; a later portal
  paints on top), sticky bars with `--layer-sticky` (20), sticky headers with `--layer-raised` (10). A host raises them
  on `:root`; `PortalContainerProvider` / the provider's `portalContainer` moves every portal.
- **Import boundary.** Blocks import only the entries the matrix in `README.md` allows, never app code. Only `./next`
  imports `next/*`, only `./notify-sonner` imports `sonner`; `./logic` pure files run without React.
- **Design studio.** Pass `designStudioComponents` from `./design-studio` as the studio provider's `components`; replace
  single slots by spreading it. The entry never imports the studio (`DesignStudioComponentsContract` is a structural
  copy); a new studio slot means updating `contract.ts`, the map and the render test together.
- **Translation keys.** Keys are full `locale::style` (`de::FORMAL`, `de::INFORMAL`). Never collapse them to the
  language: the payload of `useEntityTranslations` sends every loaded key back; a cleared text removes its key.
- **Translation saves use delta mode.** `useEntityTranslations({ translationSaveMode: 'delta' })`, then
  `buildSavePayload(texts)` (only the changed keys, a cleared one as `null`, `replaceExistingTranslations: false`),
  `omitScalars(body, keepRequired)` and `rebase(newerEntity, texts)` on every newer copy (save answer, reload after a
  background run). Why: a replace save sends the store as loaded and the server replaces the column, so a text stored
  while the form was open (a background translation, another editor) is deleted by the next save; in merge mode a key
  not sent stays. Never send the plain value of a nullable translatable field next to merge mode (a NULL clears the
  column on MariaDB, not on PostgreSQL). The default stays `'replace'` (forms built before 0.3.12 send plain values);
  a create form has no baseline and sends every non-blank key, which is right for a new record.
- **URL state.** Build requests from `list.debounced`, never `list.values`. All writes (filters, view, drawer) go
  through the one URL writer, so writes in the same tick merge; never `router.replace` the search parameters by hand.
  Screens reading search parameters render inside `<Suspense>`.
- **Wide tables.** Tracks are opt-in per table: one `width` gives every column a track (default `1fr`, minimum 120
  px); the table then scrolls sideways inside its card instead of squeezing. `pin: 'end'` always holds; `pin: 'start'`
  only while the table overflows by 120 px or more and the pinned columns stay under a third of the visible width. The
  table never sorts rows: map `sortKey` to the request. Sizes are measured after hydration only.
- **SegmentedControl** is a radio group: exactly one value, one tab stop, arrows select (`activation="manual"`: Space /
  Enter). Tooltips (`iconOnly`, `disabledReason`) need `AdminUiProvider`. Corner and slide come from
  `--segmented-control-radius` / `--segmented-control-duration`.
- **Combobox server search**: pass `onSearch` and `isSearching` (from `useLatestSearch`, which drops answers to older
  terms); the block debounces and never shows the previous term's options. A picked value outside the results needs
  `selectedOption`.
- **Links**: set `linkComponent` once on `AdminUiProvider`; without it blocks render plain `<a>` (full page loads).
- **One navigation tree.** Sidebar, mobile menu, breadcrumbs and tab title all read `AppShell.navigation`; a page below
  an entry is described in that entry's `crumbs`, never in a second list. Without `usePathname` on the provider the
  shell knows the path only after hydration (no current entry, no crumbs in the server HTML). `canAccess` hides
  sidebar items only — crumbs of a hidden page stay as text. `useEntityLabel` and `canAccess` must be stable (a
  module-level hook, a memoised predicate). The collapsed rail applies right after hydration, never on the server.
  `ShaderBackground` needs the page background on `<html>` (a body background covers it).
- **⌘S / Ctrl+S** (`FormActions`, `FormDialog`) listens on `document`: in a dialog or drawer it answers anywhere inside
  the innermost one holding the focus; on a page with focus in the form, on its actions (also portalled) or nowhere.
  It prevents the default whenever it is in scope (also with a disabled primary, then nothing submits); an event
  already prevented is left alone, so of two forms only the first answers. It submits with `requestSubmit` through the
  actions' own submit button, so a form needs a `type="submit"` button it owns.
- **FormActions placement**: inside a dialog that is not a `FormDrawer` the plain row comes by itself; `auto` moves the
  pill into the slot closest above the form when the page mounts one (else as before); `row` never moves.
- **Confirmations** ask through `useConfirm()`: no dialog to render; without `AdminUiProvider` every call answers
  `false` (one warning outside production). A host service goes into the provider's `confirm`; a text-only service
  drops a node description (a generation estimate) unless `confirmWithRichDescription="package"` routes those to the
  package dialog (`confirmWithPhrase` the same for typed phrases).
- **Write access is a presentation aid.** `WriteAccessProvider` disables `FormSubmitButton`, `FormDialog`'s submit, the
  bulk bar's actions and `AddEntityButton` as a button (never a link); a nested provider only narrows (it may add the
  reason an outer denial lacks). Handlers keep their guard and the server its check.
- **Showcase** needs no optional peer: pass `loadNotifySonner={() => import('@mgamadeus/ddd-admin-ui/notify-sonner')}`
  only when sonner is installed. A new block gets a showcase sample and a `SHOWCASE_COVERAGE` entry, or the checks fail.
- **Text contexts are literals.** `m('Failed', { context: 'import-status' })`: extractors (the package manifest and
  host exports) read the text and the context as string literals; a context only on the status map or in a variable is
  not exported. Put the same context on the definition or the map so `StatusBadge` translates with it.
- **Translatable limits never cut**: `maxLength` counts code points, marks the tab and the field, keeps the text; the
  submit refuses with `overLimitKeys` and shows the text with `focusFirstOverLimitTranslation(form)`. Tab model
  `language` still sends every loaded `locale::style` key back.
- **`./markdown` loads its peers after hydration**: the server draws a skeleton; never import the editor library from
  another entry, and never render user markdown with `dangerouslySetInnerHTML` (use `MarkdownPreview`).
- **Contrast**: run `ddd-admin-ui-check-contrast <built css> [--exceptions host.json]` in CI and after a palette
  change; declared pairs below AA fail in both themes unless the package's or the host's exception list names them
  (`{ foreground, background, theme?, reason }`).
- **SegmentedControl options of a host look**: `heightOf="option"` with a track padding class, `coarsePointer="grow"`,
  `badgeStyle="unstyled"`, `translate={false}`, timings as `--segmented-control-*` variables on `style`; the indicator
  follows the option box.
- **Layers**: the package's dialogs open at `--layer-overlay` (50); a host with a higher overlay scale raises it.
- **Navigation guard.** `canNavigate()` refuses while a form reports unsaved changes (`useUnsavedChangesGuard`,
  `FormDialog isDirty`), then while a package `DialogContent` / `SheetContent` / `FormDrawer` is mounted (the mobile
  menu is not counted). A form only appears in `getDirtyForms()` with its fields when it passes `{ form }` (or
  `dirtyFieldNames`) to the guard; without options it is listed with a generated id and no fields. Overlays a host
  draws with another library are invisible to it.
- **Agent attributes.** `data-agent-skip` marks chrome, not disabled controls; `data-agent-secret` is on password
  inputs only: a host field holding a key or token sets it itself. `data-row-key` is set on the element a card
  renderer returns; a card component that drops `data-*` props sets `data-row-key={rowKey}` itself.
- **File manager adapter identity.** `FileManager` calls the adapter's read hooks (and the capabilities' `useTrash`,
  `useLinkTargets`, `useMoveTargetAreas`) once per render: the adapter and its `capabilities` keep their identity (module
  scope or `useMemo`). A control appears only when its capability and the actions it needs are both there
  (`resolveFileManagerFeatures`). Previews never render SVG or HTML; a PDF needs `loadPdfJs`.
- **Server vs client.** Hooks and context live in files with `'use client'`; pure helpers (`m`, `formatDateTime`,
  `defineStatusMap`, schemas, conditions) may be called in server code and `metadata`.

## Patterns

### List page

```tsx
const LIST_ID = 'admin.items';
const LIST_KEYS = ['q', 'status'] as const;

export const ItemsScreen = () => {
  const list = useUrlListState(LIST_KEYS, { adapter: useNextUrlStateAdapter({ listId: LIST_ID }), uncounted: ['q'] });
  const [displayMode, setDisplayMode] = useListViewParam(LIST_ID, 'table');
  const query = useItemsQuery(list.debounced);            // the host's data hook
  // wide tables: columns with width / pin / sortKey, then sort={sort} onSortChange={setSort} showRowIndex on the body
  return (
    <EntityListPage
      title="Items"
      toolbar={
        <EntityListToolbar
          search={{ value: list.values.q, onChange: value => list.setValue('q', value), placeholder: 'Search' }}
          activeFilterCount={list.activeFilterCount}
          onClearFilters={list.clear}
          viewToggle={<EntityListViewToggle displayMode={displayMode} onDisplayModeChange={setDisplayMode} />}
        />
      }
    >
      <EntityListBody
        displayMode={displayMode}
        columns={COLUMNS}
        items={query.items}
        getRowKey={item => String(item.id)}
        isLoading={query.isLoading}
        isSearchActive={list.isActive}
        onClearSearch={list.clear}
      />
    </EntityListPage>
  );
};
```

### Form in a drawer

```tsx
const drawer = useEntityDrawer({ adapter: useNextDrawerUrlAdapter() });
const form = useForm<Values>({ defaultValues });
const confirm = useConfirm();                          // ./logic: the provider's dialog
const { confirmDiscard } = useUnsavedChangesGuard(useFormDirty(form), confirm);

<FormDrawer open={drawer.isOpen} onClose={drawer.close} title="Edit item">
  <Form form={form} onSubmit={save}>
    <FormField<Values, 'name'> name="name" label="Name" required>
      {({ field, control }) => <Input {...control} {...field} />}
    </FormField>
    <FormActions
      secondary={
        <Button type="button" variant="outline" onClick={async () => (await confirmDiscard()) && drawer.close()}>
          Cancel
        </Button>
      }
      primary={<FormSubmitButton>Save</FormSubmitButton>}
    />
  </Form>
</FormDrawer>
```

### Form in a dialog, a typed confirmation

```tsx
<FormDialog<Values> open={open} onOpenChange={setOpen} title="Rename item" form={form}
  onSubmit={async values => { await rename(values); setOpen(false); }}
  submitLabel="Save" pendingLabel="Saving…" isPending={isRenaming} isDirty={form.formState.isDirty}>
  <FormField<Values, 'name'> name="name" label="Name">{({ field, control }) => <Input {...control} {...field} />}</FormField>
</FormDialog>

if (await confirm({ title: `Delete ${site.name}?`, confirmVariant: 'destructive', confirmLabel: 'Delete', requirePhrase: site.name })) …
```

### Translations and media in one form

```tsx
const tabs = useEntityTranslations({ fields: ['name'], locales: ['en::FORMAL', 'de::FORMAL'], defaultLocale: 'en::FORMAL',
  translationSaveMode: 'delta' });
// save: tabs.omitScalars(body, ['name']) + translationInfos: tabs.buildSavePayload(values.translations)
// newer copy (answer, reload): const { stored, values, hasDelta } = tabs.rebase(entity, form.getValues('translations'))

<Form form={form} onSubmit={save}>
  <FormErrors error={submitError} />
  <FormTranslatableInput<Values> name="translations.name" label="Display name" tabs={tabs} />
  <FormMediaItemField<Values> name="image" label="Image" alt="" onOpenPicker={openPicker} />
</Form>
```

A server violation on `translations.name` shows with the field's label ("Display name: …").

### Framework screens on the host's api

```ts
export const workersApi = createWorkersApi({ baseApi: adminApi, apiPrefix: '/api/admin/maintenance/workers' });
export const translationsApi = createTranslationsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common', paths: { appTranslations: 'app-translations' } });
```

Call them once at module scope with the host's RTK Query api (the React hooks module); screens take the result as
`api`, links come from the provider's `linkComponent`, writes follow `WriteAccessProvider`, URL state needs the host's
adapters (`urlStateAdapter`, `drawerUrlAdapter`). Workers need mgamadeus/ddd ≥ 3.23.1; the translation routes are the
application's controllers (paths in `README.md`). For reviews and tests: `createStaticWorkersApi(showcaseWorkersData)`.

## Adding a block to the package

Work in the package repository (`src/<entry>/`).

1. Pick the entry by layer: no React → `logic/pure`; hooks without markup → `logic/react`; browser API → `logic/browser`;
   markup → the block entry. Respect the import matrix (`README.md`); a new edge needs a matrix change first.
2. Relative imports name their file (`./Block.tsx`, `../logic/index.ts`); `'use client'` exactly when the file calls a
   hook, `createContext` or `react-dom`; export the block from the entry's `index.ts`.
3. Colours only through role utilities (`bg-card`, `text-muted-foreground`); a new role, property or layer goes into
   `tokens.json` (regenerate the `utilities` lists with `scripts/tokens-utilities.mjs --write`).
4. Texts through `t()` / `m()`; add the hint to `i18n/hints.json` and regenerate `i18n-keys.json` with
   `pnpm i18n:manifest`.
5. Check:

   ```sh
   pnpm typecheck && pnpm test && pnpm build
   node scripts/check-package.mjs --dir .                  # and on the extracted tarball (pnpm pack)
   node scripts/tokens-utilities.mjs && node scripts/build-i18n-manifest.mjs --check
   test/consumer/run.sh <tarball> pnpm <work dir>           # consumer tests on the packed tarball
   ```

## References

- `README.md` — entries and matrix, peers, host setup, provider props, texts, package commands.
- `STANDARDS.md` — how list, detail, form and drawer screens are composed, with full examples.
- `tokens.json` — the host contract; `i18n-keys.json` — the text manifest.
