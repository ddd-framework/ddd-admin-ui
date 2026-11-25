# @mgamadeus/ddd-admin-ui

DDD-generic admin UI for apps built on `@mgamadeus/ddd-web`: entity lists (table and card grid, filters, selection,
bulk actions), page frames and detail shells, form shells with conditional fields and server validation, translatable
inputs on full `locale::style` keys, media pickers, and the shadcn-style primitives they are drawn with. Host specifics
(columns, labels, endpoints, routing, storage, toasts) come in as props or adapters; the package never imports app
code. How a screen is built from the blocks: [`STANDARDS.md`](./STANDARDS.md).

Every import names an entry: `import { EntityListTable } from '@mgamadeus/ddd-admin-ui/list'`. ESM only; the
package ships one unbundled JS file and one declaration file per source file.

## Install

```bash
pnpm add -E @mgamadeus/ddd-admin-ui
pnpm add @mgamadeus/ddd-web radix-ui react react-dom lucide-react react-hook-form zod
# optional, per entry: next (./next), sonner (./notify-sonner); the host's Tailwind 4 build compiles the CSS
```

## Entries

| Entry | What it holds | May import (besides React and its peers) |
|---|---|---|
| `./logic` | pure helpers (`formatDate`, `defineStatusMap`, conditions, schemas, `notify`, `runSequential`, the navigation model with `resolveCrumbs`, `resolveDocumentTitle`, `filterNavigation`, `findActiveNavigation`), React hooks without markup (`useUrlListState`, `useEntityDrawer`, `useRowSelection`, `useEntityTranslations`, …), browser helpers (`prepareImageFile`, `readStored` / `writeStored`, `buildStorageKey`), date input values (`toDateInputValue`, `fromDateTimeInputValue`, …), `withStickyParams`, `useLatestSearch`, `useConfirm` (the provider's confirmation), `WriteAccessProvider` / `useWriteAccess`, date range presets, bulk summaries with skipped rows (`skipSequential`, `bulkSummaryText`), text limits (`countCodePoints`, `overLimitKeys`), colour values, `useMediaQuery`, the image normaliser (`normalizeImage`) and crop geometry, the api injection of the screen entries (`InjectableBaseApi`, `ApiQueryHook`, `staticQueryHook`, …), `useMemoryUrlState`, `useOptimisticRowPatches` | `./i18n` |
| `./logic/pure` | the dependency-free part of `./logic` (no React, no `@mgamadeus/ddd-web`): the navigation model and crumb resolver, list sort and tracks, URL list state, sticky parameters, date inputs and presets, colour values, image crop geometry, text limits, write access, the api injection helpers, `translateText`; ESM and CommonJS (`require`) | its own `i18n` text store only |
| `./i18n` | the UI text store (`m`, `translateText`, `setTranslations`), `useTranslate`, `<Translate>`, number / date formats of the UI locale, server-message translation | — |
| `./primitives` | buttons, inputs, selects, dialogs, sheets, popovers, menus, tooltips, tables, badges, `SegmentedControl`, `cn`, the portal container, the link component and pathname hook contexts, the header slot of form actions (`FormActionsSlotProvider`, `FormActionsSlot`) | `./i18n` |
| `./list` | entity list card, toolbar, search, filters, table, grid, load-more, status badge, cells, multi-select, combobox, bulk bar, column factories (`textColumn`, `moneyColumn`, `actionsColumn`, …), the toolbar's filter toggle, count and clear as blocks | logic, i18n, primitives |
| `./page` | page header and frame, `EntityListPage`, detail shell and header, tabs, section header, definition list, page toolbar, editable card, status callout, entity metadata, route states (`RouteError`, `RouteLoading`), `MaintenanceActionCard` | logic, i18n, primitives; from list only `EmptyValue`, `EntityListEmpty`, `EntityListCard` |
| `./form` | `Form`, `FormField`, `FormSection`, `FormActions`, `FormDrawer`, `FormDialog`, `FormHeader`, `FormWrapper`, `FormJumpBar`, `FormErrors`, `FormSubmitButton`, `useConfirmDialog`, `ColorValueField` | logic, i18n, primitives; from page only `DetailHeader`, `EntityMetadata` |
| `./translations` | `TranslatableInput`, `TranslatableMarkdown` (editor injected), their form-bound variants, `TranslationControls`, `BackgroundTranslationControls`, `focusFirstOverLimitTranslation`; the admin screens on the host's api (`createTranslationsApi`): `AppTranslationsScreen` with `AppTranslationKeyDrawer` and `TranslationCompleteness`, `LanguagesScreen`, `LocalesScreen`, `ConfigImportCard`, `useEntityTranslator`, `useContentLocales` | logic, i18n, primitives, list, page; from form only `fieldLabels`, `useConfirmDialog`, `Form`, `FormActions`, `FormDrawer`, `FormField`, `FormSubmitButton` |
| `./workers` | the screens of the worker monitoring on the host's api (`createWorkersApi`): `WorkersOverviewScreen`, `WorkerTransportScreen` and their parts (tiles, live panel, throughput and transport tables, history charts as SVG, message runs, processes, restart request), the status maps, the payload types | logic, i18n, primitives, list, page |
| `./issues` | the screen of the issues registry on the host's api (`createIssuesApi`): `IssuesScreen` and its parts (the trend as SVG bars, the window switch, the group drawer with occurrences, frames, causes, job and client blocks, the status actions), `ISSUE_GROUP_STATUS`, the payload types | logic, i18n, primitives, list, page; from form only `FormDrawer` |
| `./database` | the schema diff screen on the host's api (`createDatabaseApi`): `SchemaDiffScreen`, `SchemaDiffCard`, the generated-code previews (`GeneratedCodePanel`, `CodeBlock`), the status maps `DB_TABLE_CHANGE_TYPE` / `DB_DIFF_SEVERITY`, the diff helpers, the payload types | logic, i18n, primitives, list, page |
| `./files` | the generic file manager on the host's adapter (`FileManagerAdapter` with optional capabilities): `FileManager` (folder tree, grid / table, search and filters, upload tray with progress, drag and drop moves, details drawer with preview, versions and activity, trash, links, moves into other areas), its parts (`FolderTree`, `FileCard`, `FileDrawer`, `FilePreview`, `FileViewer`, `MoveDialog`, `LinkTargetsDialog`, `UploadTray`, `QuotaPill`, …), `useFileUploadQueue`, `uploadWithProgress`, `createStaticFileManagerAdapter`, the view models | logic, i18n, primitives, list, page, form |
| `./crons` | the Crons screen on the host's api (`createCronsApi`): `CronsScreen` and its parts (summary tiles, runner banner, Crons table with countdown and run strip, row actions, details drawer with the duration chart, runs with their output, timeline, create / edit form with the schedule preview), `useCronActions`, the status maps `CRON_STATUS`, `CRON_EXECUTION_RESULT`, the payload types | logic, i18n, primitives, list, page, form, data |
| `./agent-ui` | the adapters of `Agent.UI` (`@mgamadeus/ddd-agents/ui` 0.3.x) for screens built from the package: `useAdminUiAgentScreen` (screen targets from the shell's navigation tree, the navigator with the navigation guard, the DOM reader's and highlighter's options, the UI state source), the pure `buildScreenTargets`, `matchScreenTarget`, `buildScreenTargetHref`, `buildAgentUIState`, `describeNavigationBlocker`; the contract types (structural copy) | logic, i18n, primitives; never imports the agents package |
| `./media` | `MediaItemField`, `FormMediaItemField`, `MediaItemPickerDialog`, `MediaPreview`, `ImageCropDialog` (crop surface: file and aspect options in; cropped blob, skip or cancel out) | logic, i18n, primitives, list, form |
| `./glass` | `GlassPill`, `QuickFilterPills`, `CollapsibleCard`, `GlassGroup`, `ActionRow` | logic, i18n, primitives |
| `./shell` | the application frame `AppShell` (top bar with slots, sidebar with groups, badges and locks, the icon rail and its `[` shortcut, the mobile menu, the content frame), `ShellBreadcrumbs`, `ShellDocumentTitle`, `AccountMenu`, `LanguageMenu`, their parts and hooks (`useSidebarCollapsed`, `useShellShortcut`) | logic, i18n, primitives |
| `./shell-background` | `ShaderBackground`: the animated WebGL background (loaded lazily; a host that does not import the entry pays nothing) | — |
| `./provider` | `AdminUiProvider` (also the dialog behind `useConfirm`), `useAdminUi`, `defaultStorageKey` | logic, i18n, primitives; types only from media and translations |
| `./next` | Next.js adapters: `useNextUrlStateAdapter`, `useNextDrawerUrlAdapter`, `useNextPathname`, `useListViewParam`, the one URL writer (`queueSearchParamsWrite`) | logic, provider; the only entry importing `next/*` |
| `./notify-sonner` | `sonnerNotifications` (the notification adapter on `sonner`) and its `Toaster` | logic; the only entry importing `sonner` |
| `./showcase` | `Showcase`: a development page drawing every block in the host theme, light and dark, one section per entry, the host's sections appended; `SHOWCASE_COVERAGE`; the sample payloads of the screens (`showcaseWorkersData`, `showcaseTranslationsData`, `showcaseIssuesData`, `showcaseDatabaseData`, `showcaseFilesData`, `showcaseCronsData`) | logic, i18n, primitives, list, page, form, translations, media, glass, data, workers, issues, database, files, crons, shell, shell-background; never `./next`, `./notify-sonner` or `./markdown` (its section loads through `loadMarkdown`) |
| `./data` | key figures: `MetricTile` (label, value, delta, hint, sparkline slot, skeleton), `MetricTileSkeleton`, `MetricGrid`, `DeltaText`, `NoteList`, the delta helpers `resolveDelta`, `relativeChange`, `deltaDirectionOf`, `deltaToneOf` | logic, i18n, primitives |
| `./markdown` | `MarkdownEditor`, `MarkdownPreview` (sanitised; `untrusted` for a text of unknown origin: no raw HTML, no pictures, web and mail links only), `renderMarkdownEditor` (the `renderEditor` slot of `./translations` and `AdminUiProvider.renderMarkdownEditor`); loads `@uiw/react-md-editor` and `rehype-sanitize` after hydration | logic, i18n, primitives; translations type-only; the only entry reaching its optional peers |
| `./design-studio` | `designStudioComponents`: the `components` of `@mgamadeus/ddd-design-studio`'s provider, every slot mapped to the block of the same name; the slot types (`DesignStudioComponentsContract`, structural copy) | primitives, list, page, glass; never imports the studio |
| `./theme.css`, `./components.css` | the Tailwind theme binding and the structural CSS of the blocks | — |
| `./tokens.json`, `./i18n-keys.json` | the host contract (colour roles, properties, layers, data attributes) and the text manifest | — |

Blocks never import `./provider`: screens read `useAdminUi()` and pass adapters to blocks as props. Some barrels still
re-export names that moved to another entry (for example `EntityListPage` from `./list`, which belongs to `./page`, or
the conditions and `notify` from `./form`, which belong to `./logic`); they are marked `@deprecated`. Import every name
from the entry that owns it.

## Peers

| Package | Kind | Range |
|---|---|---|
| `react`, `react-dom` | peer | `^19.0.0` |
| `@mgamadeus/ddd-web` | peer | `>=0.13.0 <1` |
| `lucide-react` | peer | `>=0.550.0 <2` |
| `react-hook-form` | peer | `^7.65.0` |
| `zod` | peer | `^4.0.0` |
| `next` | optional peer | `^16.0.0` — needed by `./next` only |
| `sonner` | optional peer | `^2.0.0` — needed by `./notify-sonner` only |
| `tailwindcss` | optional peer | `^4.1.0` — the host's build compiles the CSS |
| `@uiw/react-md-editor` | optional peer | `^4.1.0` — needed by `./markdown` only |
| `rehype-sanitize` | optional peer | `^6.0.0` — needed by `./markdown` only |
| `radix-ui` | peer | `^1.8.1` — one copy per app, as with React (see below) |
| `class-variance-authority`, `cmdk`, `clsx`, `tailwind-merge` | dependencies | imported inside `./primitives` only |

Without `next` or `sonner` every entry except `./next` and `./notify-sonner` imports and type-checks. `./markdown`
imports its two peers only after hydration (a dynamic import), so it loads without them and a host that never imports
it never bundles them.

**One Radix copy.** Radix keeps focus traps, outside-click layers and portals in module state. Two copies of one
Radix package in an app (the package's dialogs from `radix-ui`, a host dialog from an older single
`@radix-ui/react-dialog`) do not see each other: one overlay's focus trap does not pause for the other's, and an
outside click closes the wrong one. So `radix-ui` is a peer, and the host installs it once. A host that also uses single
`@radix-ui/*` packages aligns them to the exact versions `radix-ui` pins (its `package.json` lists them), with npm
`overrides` or pnpm `pnpm.overrides` where a dependency asks for another version. `cmdk` asks for its Radix packages
with caret ranges; in a host without an older single package they resolve to the copies `radix-ui` brings (checked with
npm and pnpm), and an older single package drags them onto the older copy. Check the install after every dependency
change, from the host folder:

```sh
npx ddd-admin-ui-check-radix [host folder]
```

It reads the host's `node_modules` (npm and pnpm layouts) and the folders above it, and names every `radix-ui` /
`@radix-ui/*` package installed more than once, with its versions and where each copy sits (exit 1).

## Host setup

1. **Stylesheet**, after Tailwind and an animation plugin that provides `animate-in/out`, `fade-*`, `zoom-*`,
   `slide-in-from-*` (for example `tw-animate-css`):

   ```css
   @import 'tailwindcss';
   @import 'tw-animate-css';
   @import '@mgamadeus/ddd-admin-ui/theme.css';
   @import '@mgamadeus/ddd-admin-ui/components.css';

   @custom-variant dark (&:is(.dark *));
   ```

   `components.css` carries `@source './'`, so Tailwind scans the package's built files without a host `@source` line.
   `theme.css` binds the colour roles for a host whose colours are complete values under bare names (`--card: #fff`);
   a host with another colour encoding provides the same utility names its own way and leaves `theme.css` out.

   A host on a JavaScript Tailwind config puts the package imports before the `@config` line (Biome's CSS linter
   refuses an `@import` after it; the built CSS is the same either way):

   ```css
   @import 'tailwindcss';
   @import '@mgamadeus/ddd-admin-ui/theme.css';
   @import '@mgamadeus/ddd-admin-ui/components.css';
   @config '../tailwind.config.js';
   ```

   Cascade: the surfaces, the glass tones and the table card of a list sit in `@layer components`, so a host's own
   layered rule can restyle them. Six rules of the list card stay unlayered because they must beat utilities on the
   same elements: the list card frame (its overflow and radius utilities), the toolbar row (its bottom rule and padding),
   the toolbar's filter controls (fill, glass shadow, edge colour of pills and outline buttons), the chips of a toolbar
   multi-select, and the grid's scroll padding. A host overrides those with an unlayered rule of at least the same
   specificity, loaded after `components.css`.

2. **Tokens.** Declare on `:root` (and under `.dark` where themed) every property of
   [`tokens.json`](./tokens.json): the 31 required colour roles (the eight optional status text and soft roles below
   need nothing), `--nav-h`, `--content-max`, `--radius`, the surface and glass alphas and shadows,
   `--glass-control-shadow`. Dark mode is a `.dark` class on an ancestor; the default border
   colour is the `border` role. `components.css` sets the five `--layer-*` defaults (`raised` 10, `sticky` 20, `chrome`
   30, `overlay` 50, `popover` 50), the two optional properties of `SegmentedControl` (`--segmented-control-radius`
   9999px, `--segmented-control-duration` 200ms) and the two of `AppShell` (`--sidebar-w` 16rem, `--sidebar-rail-w`
   5rem) with zero specificity in the lowest cascade layer, so any host value wins. `ShaderBackground` reads
   `--shell-background-base`, `--shell-background-blob-1` and `--shell-background-blob-2` (optional; fallbacks
   `--background`, `--brand-light`, `--accent`). Check a built
   stylesheet against the contract:

   ```sh
   npx ddd-admin-ui-check-tokens <built css file or folder> [tokens.json]
   ```

   It names every missing utility, property, `.dark` value, layer default or data attribute, and every colour value
   that does not fit its use. A role property that the stylesheet reads only inside a channel function
   (`hsl(var(--card))`, `rgb(var(--card) / 0.5)`) may hold channels such as `0 0% 100%` (the bridge of a host whose
   theme stores HSL channels); a property read anywhere else (`background-color: var(--card)`, `color-mix()`,
   `light-dark()`, or passed on to another custom property that is read so) must hold a colour.

   Check the contrast of the pairs `tokens.json` declares (`contrast.pairs`: text and UI roles on their backgrounds,
   4.5:1 for text, 3:1 for large text and UI parts), light and dark:

   ```sh
   npx ddd-admin-ui-check-contrast <built css file or folder> [tokens.json] [--exceptions <file.json>] [--allow-unevaluated]
   ```

   It prints each pair's ratio per theme and exits 1 on a pair below its minimum that no exception list names: the
   package's (`contrast.exceptions` of `tokens.json`) merged with the host's file passed as `--exceptions`. A background
   `role/NN` is that role at NN % over the card (status badges). Values it cannot compute (named colours, `color-mix()`,
   `lab()`, `light-dark()`, …) count as failures unless `--allow-unevaluated` is passed. Run it in the host's CI on its
   built CSS, like `ddd-admin-ui-check-tokens`.

   An exception file is an array (or `{ "exceptions": [...] }`) of entries in the format of the package's list; `theme`
   is optional (both themes when absent), `reason` is required:

   ```json
   [
     { "foreground": "muted-foreground", "background": "card", "theme": "dark", "reason": "captions only, large text" }
   ]
   ```

   **Status text and soft surfaces.** Status text (`StatusBadge`, `StatusCallout`, tone rows, `DeltaText`, field
   errors: every `text-success`, `text-warning`, `text-destructive`, `text-info`) reads the optional text roles
   `--success-text`, `--warning-text`, `--destructive-text`, `--info-text`; the badge tints (`bg-<status>/15`) read the
   optional soft surfaces `--success-soft`, `--warning-soft`, `--destructive-soft`, `--info-soft`. Unset, a text role is
   the status colour and a soft surface the status colour at 15 % (`color-mix(in oklab, var(--success) 15%,
   transparent)`): a host that sets none of them renders exactly as before. A host whose status colours are fill
   colours (a mid green that reads well as a dot, not as text) sets the text roles, light and dark:

   ```css
   :root { --success-text: #166534; --warning-text: #92400e; --destructive-text: #b91c1c; --info-text: #0369a1; }
   .dark { --success-text: var(--success); --warning-text: var(--warning); --destructive-text: var(--destructive); --info-text: var(--info); }
   ```

   `theme.css` binds them (`--text-color-<status>` for the text utilities; `--color-<status>-soft` and the four 15 %
   tints for the soft surfaces). The package's rules read them only through that binding (the status badges of
   `components.css` read `--color-<status>-soft`, else the status colour at 15 %), never the bare property. A host with
   its own binding binds the same names its own way, e.g. with channel values
   `--text-color-success: hsl(var(--success-text, var(--success)))` and `--color-success-soft: hsl(var(--success-soft))`;
   a host that binds no soft role gets the 15 % tint. `ddd-admin-ui-check-tokens` names a text or soft role that is declared but read by no rule.
   The contrast check tests every text role on `card`, on `background` and on its soft surface over a card (an unset
   role by its fallback, named in the output); the package lists no exceptions, so a host whose status colours fail
   as text sets the text roles or writes its own exceptions.

   **Layers checklist.** The package's dialogs, sheets and drawers open at layer 50 (`--layer-overlay`), its popovers,
   selects, menus and tooltips at 50 too (`--layer-popover`). A host whose own overlay scale is higher (a dialog at
   9999, toasts at 100) raises them on `:root` (`--layer-overlay: 10000; --layer-popover: 10001`), or the package's
   dialogs open under the host's chrome.

3. **Provider** above every page. Blocks draw tooltips (a date cell shows the relative time on hover), so a page
   without the provider fails with "`Tooltip` must be used within `TooltipProvider`".

   ```tsx
   'use client';
   import { useNextDrawerUrlAdapter, useNextPathname, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';
   import { sonnerNotifications, Toaster } from '@mgamadeus/ddd-admin-ui/notify-sonner';
   import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';

   export const Providers = ({ children }: { children: React.ReactNode }) => (
     <AdminUiProvider
       notifications={sonnerNotifications}
       tooltipDelayMs={150}
       useUrlStateAdapter={useNextUrlStateAdapter}
       useDrawerUrlAdapter={useNextDrawerUrlAdapter}
       usePathname={useNextPathname}
     >
       {children}
       <Toaster />
     </AdminUiProvider>
   );
   ```

   Props: `notifications` (registered for `notify`), `storageKey` (`(kind, id) => key`; default
   `ddd-admin-ui.<kind>.<id>`), `portalContainer` (where dialogs, sheets, popovers, selects, menus and tooltips mount;
   default `document.body`), `tooltipDelayMs`, `translations` (a `TranslationAdapter` that feeds the text store from a
   host store), `useUrlStateAdapter`, `useDrawerUrlAdapter`, `upload`, `renderMarkdownEditor`, `aiTranslation`,
   `preserveSearchParams` (search parameters the URL writer never removes), `linkComponent` (the router link of every
   block that renders a link; wrap it with `withStickyParams` to keep sticky search parameters), `usePathname` (the
   router's pathname hook for the shell's active entry, breadcrumbs and title: `useNextPathname` from `./next`; without
   it `location.pathname` after hydration), `confirm` (the host's confirmation service behind `useConfirm()`),
   `formatLocale` (the `Intl` locale date cells format in, when it differs from the UI language's), `textLimits`
   (`{ singleLine, multiline }`: default length limits of translatable text fields, in code points). Without a
   notification adapter `notify.*` does nothing and warns once outside production.

   ```tsx
   const StickyLink: PageLinkComponent = ({ href, ...props }) => {
     const search = useSearchParams();
     return <Link href={withStickyParams(href, ['workspace', 'debug'], search)} {...props} />;
   };
   <AdminUiProvider linkComponent={StickyLink} …>
   ```

4. **Confirmations.** Screen code asks with `useConfirm()` (`./logic`): `confirm(options)` of the nearest
   `AdminUiProvider`, which draws the package dialog (calls queue, each settles once, an unmounted provider answers its
   pending calls `false`; `requirePhrase` keeps the confirm button off until a phrase is typed). Without a provider
   every call answers `false` and warns once outside production. A host with its own service passes it as the
   provider's `confirm`; `useConfirm()` then calls it and the package dialog does not render.
   `confirmWithPhrase` and (0.3.9) `confirmWithRichDescription` (`'package'` or a service) take the confirmations a
   text-only service cannot show: a typed phrase, and a description that is a node (an element, a list, a generation
   estimate) instead of text.

   Blocks that ask before a step open the package's confirm dialog (`useConfirmDialog`). A host
   with its own confirmation service passes it as `confirm` (`(options: ConfirmOptions) => Promise<boolean>`, a stable
   function): `FormDrawer` ("Discard changes?") and `TranslatableInput` / `TranslatableMarkdown` and their form-bound
   variants ("Clear all translations?"). The package dialog then does not render. The host's dialog must come from the
   same Radix copy as the blocks (see Peers).

5. **Markdown** (optional): with `@uiw/react-md-editor` and `rehype-sanitize` installed, pass
   `renderMarkdownEditor({ rows: 8 })` from `./markdown` as `AdminUiProvider.renderMarkdownEditor` or as a field's
   `renderEditor`. The editor loads after hydration (the server draws a skeleton, no `next/*`); its stylesheet comes
   with the library's module, and a bundler that cannot import CSS from `node_modules` adds
   `@import '@uiw/react-md-editor/markdown-editor.css'`. If the editor cannot be loaded at run time, the field is a plain
   text area.

## List tables

How list, detail and form screens are composed: [STANDARDS.md](STANDARDS.md) (wide tables: section 5).

Options (0.3.9) of `EntityListTable` (and `EntityListBody`): `cellPaddingX` (`number | { inner, edge }`, px: the
cells' inline padding instead of 16 px / 24 px at the card edge; `columnWidthBox="content-box"` tracks add it, the
selection column's default width follows the edge), `showEmptyState={false}` (no built-in empty and no-results block;
also on `EntityListGrid`; the error stays), `sortIconPosition` (`'start' | 'end' | 'auto'`, also per column),
`sortButtonClassName`, `headerRowClassName`, `headerCellClassName` (every header cell, filler and leading cells
included), `tableClassName`, `skeletonClassName`, `scroll={false}` (table, page-sticky host and grid sit in the page
flow: no `md:flex-1 md:min-h-0`, the grid no `md:overflow-y-auto`). With `selectionHitArea="cell"` the select-all cell
is a target too. In a table with tracks the selection cell takes its track (`selectionColumnWidth`) and the checkbox
sits centred (before: a fixed `w-10` cell and the 2 px table-cell offset). The scroll edge of `pinEdge="overlay"` reads
the optional variables `--list-edge-width`, `--list-edge-color`, `--list-edge-shadow-offset`, `--list-edge-shadow-blur`,
`--list-edge-shadow-color` and `--list-edge-fade` (a gradient from the surface over the scrolled content; default 0).

## Screen state for agents and tests

A host tool that reads the screen, navigates or highlights elements (an agent embedded in the admin, an end-to-end
test) gets stable hooks from the package (0.3.10). All of it is additive: a host that uses none of it renders as before.

**Row keys.** Every row of `EntityListTable` and every card of `EntityListGrid` (also the phone cards of
`EntityListBody`) carries `data-row-key="<getRowKey(item)>"`, the key the list uses for React and the selection. A card
gets it on the element `renderCard` returns (a DOM element, or a component that passes `data-*` props to its root);
the renderer also receives `rowKey`, for a card component that sets it itself. A fragment or text card gets none.

**List state.** `onListStateChange(state)` on `EntityListBody`, `EntityListTable` and `EntityListGrid` is called after
the first render and after every change of what the list shows, never on the server; `EntityListBody` reports once for
its views. `activeFilters` (e.g. `list.debounced`) is passed through into the state's `filters` (empty values dropped).

```ts
interface EntityListState {
  view: string;                    // 'table' | 'grid' | the list's own view (displayMode)
  rowKeys: string[];               // the loaded rows in order; [] while loading or on an error
  selectedRowKeys: string[];       // the selected rows (table selection)
  columnIds: string[];             // the table's columns; [] in the card grid and own views
  filters: Record<string, string>; // the non-empty activeFilters
  sort: EntityListSort | null;     // the table's sort
  isLoading: boolean;
  hasError: boolean;
}
```

`buildEntityListState` and `useListStateReport(onChange, buildState)` (`./logic`) report a host's own view the same way.

**Unsaved changes.** `useUnsavedChangesGuard(isDirty, confirm, options?)` takes `{ formId?, label?, form?, ignore?,
dirtyFieldNames? }`: with `form` (react-hook-form) the changed fields are read when someone asks, compared like
`useFormDirty` (`dirtyFormFieldNames(values, baseline, ignore?)`, dotted paths). The registry of a `FormDrawer`
(`UnsavedChangesRegistry`) gained `getDirtyForms()` (optional on the interface, so a host's own registry still
compiles; `setDirty` takes an optional third argument with the details); `hasUnsavedChanges()` is unchanged.
`FormDialog isDirty` lists the dialog too (its title as label when that is text, the fields with `form`).

```ts
interface DirtyForm { formId: string; label?: string; dirtyFieldNames: string[] }
```

**Navigation guard.** `useNavigationGuard()` returns `{ canNavigate, getDirtyForms, getOpenOverlays }` (stable; the
same functions are exported from `./logic` for code outside React). Ask before a navigation of the host's own:

```ts
const guard = useNavigationGuard();
const decision = guard.canNavigate();   // { allowed, reason?: 'unsaved-changes' | 'dialog-open', dirtyForms, openOverlays }
if (!decision.allowed) return refuse(decision);
router.push(href);
```

Unsaved changes refuse first, then an open package overlay. Overlays report themselves through a registry, not the
DOM: `DialogContent` (kind `dialog`: `FormDialog`, confirmations, the command palette, host dialogs built on the
primitive), `SheetContent` (`sheet`) and `FormDrawer` (`drawer`), while mounted (Radix mounts the content only while
open, until its close animation ends). The shell's mobile menu is not counted (a navigation closes it); `overlayKind`
on `DialogContent` / `SheetContent` sets the kind or `null` (not counted); a `forceMount` content is never counted.
`canNavigate({ ignoreOverlayKinds: ['drawer'] })` lets a master-detail drawer through. The store lives on
`globalThis`, so two copies of the package on one page share it.

**Attribute convention.** Three attributes for agent tools, read by the host, never styled:

| Attribute | Meaning | Set by |
|---|---|---|
| `data-agent-anchor="<name>"` | a stable anchor of a region (`orders-list`, `customer-summary`) the agent may name, scroll to or highlight | the host |
| `data-agent-secret` | the element's value is never read out (passwords, keys, tokens, generated secrets) | `Input type="password"`; the host on its own secret fields and displays |
| `data-agent-skip` | the subtree is chrome, not content (skip it when reading the screen; its controls still work) | the package on: `Skeleton`, the `EntityListViewToggle` switch, the clear button of `SearchField`, `EntityListBulkBar`, the ✕ of `FormDrawer`, the sidebar's collapse toggle, `ShellMenuButton`, the `Toaster` region (`./notify-sonner`) |

The package has no password, key or token field component of its own; a host field for such a value sets
`data-agent-secret` itself (`<Input data-agent-secret="" … />` on a field that is not `type="password"`).

### `./agent-ui`: the agent's view of the admin

`Agent.UI` of `mgamadeus/ddd-agents` (≥ 0.3.0) lets the admin agent read the screen, list and open screens and mark
elements; the client runs the requests through four adapters and reports the UI state with every message. The
agents package (`@mgamadeus/ddd-agents/ui`) ships the runner, the DOM reader and the highlighter; this entry fills the
rest from the package's own model, so a host writes only its router call and its filter lists:

```tsx
'use client';
import { useAdminUiAgentScreen } from '@mgamadeus/ddd-admin-ui/agent-ui';
import { DomScreenHighlighter, DomScreenReader, ScreenReferenceRegistry, useAgentUIClient } from '@mgamadeus/ddd-agents/ui';

const screen = useAdminUiAgentScreen({
  navigation: ADMIN_NAVIGATION,                       // the tree of AppShell
  canAccess,                                          // the shell's rights predicate
  navigate: href => router.push(href),
  filtersByTargetKey: { orders: ORDER_LIST_KEYS },    // each list's useUrlListState keys
});
const adapters = useMemo(() => {
  const registry = new ScreenReferenceRegistry();
  return {
    targets: screen.targets,
    navigator: screen.navigator,
    isVisible: screen.isVisible,
    reader: new DomScreenReader({ ...screen.readerOptions, registry }),
    highlighter: new DomScreenHighlighter({
      ...screen.highlighterOptions,                   // agents ≥ 0.3.2: marks scroll beside the agent window
      registry,
      announce: labels => t('Marked: %labels%', { replacements: { labels: labels.join(', ') } }),
    }),
  };
}, [screen]);
const uiClient = useAgentUIClient(adapters, screen.uiStateSource);   // → createAgentsHttpConversationClient({ uiClient })
```

- **Targets** come from the navigation tree (`buildScreenTargets`): every in-app entry with an `href` under its key,
  every `:parameter` crumb a record target (its `entity`, or the parameter without `Id`; below a record
  `<owner>.<record>`), the literal crumbs right below a target its tabs. `canAccess` applies: the agent offers the
  viewer's menu. Filters and views are the host's lists per key.
- **Navigation** is refused by the navigation guard: unsaved changes (`UNSAVED_CHANGES`, naming the forms and fields),
  then an open package dialog, drawer or sheet (`DIALOG_OPEN`). The agent window must not count itself: give its
  `DialogContent` / `SheetContent` `overlayKind={null}`, or pass its kind in `ignoreOverlayKinds`. An opened screen
  waits until the route arrived and no `aria-busy` / skeleton is left (at most 6 s), then `onOpened` runs.
- **UI state** (`uiStateSource`): the route path and its parameters from the matched target, the tab (route segment,
  else `?tab=`), the view (`?view=`), the unsaved fields of the guard and the fields marked `aria-invalid` as the
  reader's references (`f.<field name>`), the kind of the open overlay, visibility. Only tokens the server keeps; no
  field value or label.
- **Reader options**: the content root is the shell's `<main>` (`findRoot` to change), the location is the pathname
  plus query and the page's `h1`, unsaved changes come from the guard.
- **Highlighter options** (`@mgamadeus/ddd-agents/ui` ≥ 0.3.2): put `data-agent-panel` on the agent window (or
  pass `findAgentPanel`). A mark is then scrolled into the band the window leaves free; a window docked beside the
  page changes nothing. `onHighlight({ references, elements, occludingRect, coveredAfterScroll })` runs after every
  mark: when `coveredAfterScroll` is true (the element is too tall for the free band, or a side panel lies over it),
  make the compact window smaller or move it. A mark that stays covered is answered as out of view.

The contract types are a structural copy of `@mgamadeus/ddd-agents/ui` 0.3.x: this package never imports the agents
package, and the adapters are assignable to its types.

## Server and client

Every file that calls a hook, `createContext` or `react-dom` starts with `'use client'`; barrels and `./logic`'s pure
files carry none. Pure helpers therefore work in server code, for example in Next.js `metadata`:

```tsx
import { m } from '@mgamadeus/ddd-admin-ui/i18n';
import { defineStatusMap, formatDateTime } from '@mgamadeus/ddd-admin-ui/logic';

export const metadata = { title: m('Users') };
const STATUS = defineStatusMap({ ACTIVE: { label: 'Active', tone: 'success' } });
```

Client components (`DateCell`, `EntityListTable`, `Form`, …) render from server components as long as they get no
function props there.

Code that must not load React or `@mgamadeus/ddd-web` (a worker, a Node script, a CommonJS test runner, a shared
navigation module) imports `./logic/pure`: the same helpers, built twice (`import` → ESM, `require` → CommonJS in
`dist/cjs`). A CommonJS caller gets its own copy of the text store; it passes `t` where a helper takes one.

```js
const { resolveCrumbs, resolveDocumentTitle } = require('@mgamadeus/ddd-admin-ui/logic/pure');
```

## Dates in native inputs

`<input type="date">` and `type="datetime-local"` hold wall-clock text. Translate it with an explicit zone, `'local'`
(the browser's clock) or `'utc'`: `toDateInputValue(date, zone)` / `fromDateInputValue(text, zone)` and
`toDateTimeInputValue` / `fromDateTimeInputValue` (`./logic`). Empty or invalid gives `''` / `null`; no arithmetic. A
local time skipped when the clocks go forward resolves an hour later, a repeated one to its first occurrence.

## Translatable texts: delta saves and background translation

A replace save (`buildPayload` / `buildChangedPayload` of `useEntityTranslations`, `replaceExistingTranslations: true`)
sends the whole store as the form loaded it, and the server replaces the column. A text stored while the form was open
(a background translation, another user) is deleted by that save. A **delta save** sends only the `locale::style` keys
the user changed since the baseline (the store of the last load or save answer), a cleared key as `null`, with
`replaceExistingTranslations: false`; the server merges it key by key, so everything else it stored stays.

```tsx
const tabs = useEntityTranslations({ fields: FIELDS, locales, defaultLocale: 'en::FORMAL', translationSaveMode: 'delta' });

useEffect(() => { if (entity) form.reset({ ...valuesOf(entity), translations: tabs.hydrate(entity) }); }, [entity]);

const save = async (values: Values) => {
  const body = tabs.omitScalars({ id, ...plainValuesOf(values) }, ['name']);   // keep a #[NotNull] name only
  const translationInfos = tabs.buildSavePayload(values.translations);       // undefined: no text changed
  const saved = await update({ ...body, ...(translationInfos ? { translationInfos } : {}) }).unwrap();
  const { stored, values: rebased, hasDelta } = tabs.rebase(saved, form.getValues('translations'));
  form.resetField('translations', { defaultValue: stored });
  if (hasDelta) form.setValue('translations', rebased, { shouldDirty: true });
};
```

| `useEntityTranslations` | Does |
|---|---|
| `translationSaveMode` (`'replace'` default, `'delta'`) | what `buildSavePayload` builds and whether `omitScalars` drops the plain values |
| `getBaseline()` | the non-blank texts of the last `hydrate` / `rebase` / `commit`; `null` before the first (a create form) |
| `buildDeltaPayload(texts)` | the changed keys (a cleared one as `null`) in merge mode, in every save mode |
| `hasDelta(texts)`, `buildSavePayload(texts)` | a change against the baseline; the payload of the save mode, `undefined` without a change |
| `omitScalars(body, keep?)` | delta mode: the body without the plain values of the translatable fields (`keep`: a required one) |
| `rebase(newerEntity, texts)` | a newer copy arrived: untouched keys take its texts, touched keys stay as typed and stay in the next delta; the newer store is the baseline and its keys become tabs. Returns `{ stored, values, hasDelta }` |
| `commit(texts)` | after a save without an answer to rebase on: the saved texts are the baseline |

Server facts the delta mode relies on (merge mode of mgamadeus/ddd): a `null` for one key removes that key; all keys
`null` leave `{}`; `""` is stored as `""` (the package never sends it: a blank text counts as removed); a field left out
of the payload keeps its column. **Do not send the plain value of a nullable translatable field next to merge mode**:
a NULL there clears the column on MariaDB and leaves it on PostgreSQL (`omitScalars` drops it; send a `#[NotNull]`
one with the text of the locale it is stored under). The pure forms are in `./logic/pure`: `buildTranslationDeltaStore`,
`buildDeltaTranslationInfos`, `hasTranslationDelta`, `rebaseTranslations`, `storedTranslationTexts`,
`omitTranslatableScalars`, `rebaseEditedValue` (one edited value: the newer stored one unless the user changed it).

**Default.** `translationSaveMode` stays `'replace'`: forms built on 0.3.11 send the plain value of each translatable
field (`defaultValue(translations, field)`) next to `translationInfos`, which is safe only in replace mode (a nullable
one sent empty as NULL would clear the column on MariaDB), and delta mode needs a server with merge mode (current
mgamadeus/ddd). The mode only drives `buildSavePayload` and `omitScalars`; `buildPayload` and `buildChangedPayload` are
unchanged. Delta is the recommendation for every form whose record can change while it is open; the package's own
screens send no translations store (app translation values are saved one row at a time and take a newer stored value
on rows the user did not touch).

**Translations that run on the server.** `BackgroundTranslationControls` (`./translations`) draws the progress the host
reads from its api (polling its runs) instead of running requests itself: target chips, the start button ("Save and
translate" while `isDirty`: the server translates the stored texts, so the host saves first), one row per language
(`rows`: `pending`, `running`, `done`, `failed` with `failures` of reason, properties and detail), an optional
`onDismiss` once nothing runs, no cancel. `translationProgressRowsOf(parts)` folds run parts (`QUEUED`, `RUNNING`,
`COMPLETED`, `FAILED`; a failure message `REASON: property, property (detail)`) into those rows;
`endedTranslationPartIds(parts)` tells the host when to reload the record and `rebase` the form. `failureReasonLabels`
words the host's own reason codes.

```tsx
<BackgroundTranslationControls
  locales={tabs.locales} defaultLocale={tabs.defaultLocale} selected={selected} onSelectedChange={setSelected}
  onTranslate={saveThenQueue} isBusy={isQueueing || isSaving} isDirty={form.formState.isDirty}
  rows={translationProgressRowsOf(parts)} onDismiss={dismissEndedRuns}
  localeMarkers={{ fr: 2 }}            // e.g. texts whose source changed after the translation, per language or key
/>
```

`localeMarkers` (by full key or bare language; also on `TranslationControls`) draws an icon with the count on the chip
and a summary line ("The source text changed after the translation: FR (2 texts)"); `markerLabel` and
`markerSummaryLabel` (`null`: no line) word them. `TranslationControls` also takes `isDirty` for the "Save and
translate" label. Rows and markers carry `data-translation-status` and `data-translation-marker` (`tokens.json`).

## Screens on the host's API

`./workers`, `./translations`, `./issues`, `./database` and `./crons` bring whole admin screens for endpoints of the
framework. They never import a host
SDK and never reach RTK at run time: the host passes the RTK Query api it already has (`createApi` from
`@reduxjs/toolkit/query/react`, its base query carrying origin, session and refresh, e.g. `createDddBaseQuery` of
`@mgamadeus/ddd-web/api`), the entry injects its operations once and returns the hooks; every screen takes them as
`api`.

```ts
// adminApi.ts — module scope, once
import { createTranslationsApi } from '@mgamadeus/ddd-admin-ui/translations';
import { createWorkersApi } from '@mgamadeus/ddd-admin-ui/workers';

export const workersApi = createWorkersApi({ baseApi: adminApi, apiPrefix: '/api/admin/maintenance/workers' });
export const translationsApi = createTranslationsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common' });
export const issuesApi = createIssuesApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/issues' });
export const databaseApi = createDatabaseApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/databaseModels' });
export const cronsApi = createCronsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/crons' });
```

A second call with the same api and prefix returns the first result. The cache tags are the entry's own
(`AdminUiWorkers`, `AdminUiAppTranslations`, `AdminUiLanguages`, `AdminUiLocales`, `AdminUiIssues`,
`AdminUiDatabase`, `AdminUiCrons`); a write invalidates what it
changes. The screens follow the host's setup: links through `AdminUiProvider.linkComponent`, writes (restart,
generation, toggles, imports, saves) disabled under `WriteAccessProvider` with its reason, confirmations through
`useConfirm`, toasts through `notify`. Filters, tabs, windows and the drawer live in the URL when the host passes its
adapters (`urlStateAdapter`, `drawerUrlAdapter`), in component state otherwise. `createStaticWorkersApi`,
`createStaticTranslationsApi`, `createStaticIssuesApi`, `createStaticDatabaseApi` and `createStaticCronsApi` answer
fixed payloads (the showcase's `showcaseWorkersData`, `showcaseTranslationsData`, `showcaseIssuesData`,
`showcaseDatabaseData`, `showcaseCronsData`) for design reviews and tests.

### `./workers`

The screens of the worker monitoring, on Core's `WorkersControllerTrait` (mgamadeus/ddd **3.23.1** or later: the
endpoints since 3.18.0, throughput windows since 3.20.0, the recent window of a transport since 3.23.1). Since 3.35.1
the trait calls `throwForbiddenUnlessWorkersAccessAllowed()` first in every action: an application whose access rule is
not a role overrides it on its controller; the screens need nothing for it (a 403 shows as the screen's error).

| Hook | Endpoint (below `apiPrefix`) |
|---|---|
| `useOverviewQuery` | `GET /overview` |
| `useHistoryQuery` | `GET /history?from&to&stepSeconds` |
| `useTransportDetailQuery` | `GET /transports/{transport}?from&to&stepSeconds` |
| `useMessageRunsQuery`, `useProcessesQuery` | `GET /transports/{transport}/messageRuns`, `/processes` (QueryOptions) |
| `useRestartMutation` | `POST /restart` with `{}` or `{ transport }` (invalidates the live reads, the history and the runs) |

```tsx
'use client';
// app/maintenance/workers/page.tsx and app/maintenance/workers/[transport]/page.tsx
import { useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';
import { WorkersOverviewScreen, WorkerTransportScreen } from '@mgamadeus/ddd-admin-ui/workers';

const transportHref = (transport: string, tab?: string) =>
  `/maintenance/workers/${encodeURIComponent(transport)}${tab ? `?tab=${tab}` : ''}`;

export const WorkersPage = () => (
  <WorkersOverviewScreen api={workersApi} transportHref={transportHref} urlStateAdapter={useNextUrlStateAdapter({ listId: 'workers' })} />
);
export const TransportPage = ({ transport }: { transport: string }) => (
  <WorkerTransportScreen
    api={workersApi}
    transport={transport}
    backHref="/maintenance/workers"
    urlStateAdapter={useNextUrlStateAdapter({ listId: `workers.${transport}` })}
  />
);
```

The overview refreshes every 10 s (and on its refresh button) and the history every minute while the tab is visible;
a failed refresh keeps the last data under a warning with its time. The only action is the restart request (no scaling
control); its result follows each asked process against the live list until it stopped. The charts are SVG drawn by
the entry (no chart library, no optional peer), in the colour roles of `tokens.json`; a step without a reading is a gap,
never a 0. Pointing at a chart reads the same step in every chart of its section (`WorkerChartSyncGroup`), a sparkline
reads one step, count axes use whole-number ticks and duration axes round time units (`WorkerTimeChart.ticks`:
`countTicks`, `durationTicks` or the host's own). Window labels (throughput columns, the per-worker and drain-estimate
windows, the tile hints, the sparkline column) follow the window lengths of the payload; numbers follow the UI
language. Truncated errors, uncounted queues, the process range and the timeline lanes open their details in the
package tooltip (hover, keyboard focus, tap). A transport row opens the transport by pointer or keyboard (Enter /
Space on the focused row; `onOpenTransport` replaces following its link).

Links come from `AdminUiProvider.linkComponent`; a host without one passes the router link to the screen
(`linkComponent={Link}`), else the links are plain anchors (a full page load, and no `basePath`). Both screens take
`headerActions` (the host's buttons before the restart) and `renderSection(id, section)`: return `section` to keep it,
`null` to leave it out, or the host's own node in its place.

```tsx
<WorkersOverviewScreen
  api={workersApi}
  transportHref={transportHref}
  linkComponent={Link}
  headerActions={<ExportButton onExport={exportWorkers} />}
  renderSection={(id, section) => (id === 'loops' ? <HostLoops /> : section)}   // status, live, throughput, history, transports, loops
/>
<WorkerTransportScreen
  api={workersApi}
  transport={transport}
  backHref="/maintenance/workers"
  monitoringEnabled={overview?.monitoringEnabled}   // default: read from the overview query (one shared request)
  renderSection={(id, section) => section}          // facts, history, messageClasses, liveProcesses, runs, processes
/>
```

The parts stay exported for a screen of the host's own: `WorkerTransportFacts`, `workerTransportDefinitionText` (the
definition line), `WORKER_TRANSPORT_TABS` (the tabs, e.g. for a breadcrumb), `WorkerRestartButton` (`liveProcesses`
for the follow-up), `WorkersLivePanel` (`totals` for the header line, `monitoringEnabled`), `WorkerProcessRange`
(`monitoringEnabled`; above the maximum it turns to the warning colour), the charts, `WorkerHint`, and the cache tag
`WORKERS_TAG`.

Options (0.3.4): `renderSection(id, section, state)` also gets the screen's state (`WorkersOverviewSectionState`,
`WorkerTransportSectionState`); `WorkerTransportScreen listMaxTop` (and `maxTop` on the tabs) lifts the 500-row cap of
"load more" (`Infinity`: none); `workerMessageRunColumns(t)` gives the runs table's columns; `createWorkersApi({ tags:
{ provides, invalidates } })` joins the host's cache tags.

Options (0.3.7): `tags` per operation, keyed (`{ provides: { byOperation: { overview: ['HostOverview'] }, others: [...]
} }`) or as a function (`(operation, kind) => tags`, asked once per operation when the api is created); the operation
names are the hook names without `use` and `Query` / `Mutation` (`WorkersApiOperation`, `WORKERS_API_OPERATIONS`). The
list form still applies to every operation.

### `./translations` (admin screens)

The app translation keys and values with their completeness, the languages and locales, and the entity translation,
on the application's admin controllers: the modules ship the entities and services, not controller traits
(**mgamadeus/ddd-common-translations** 1.0.7 or later for the completeness and the generation, checked with 1.1.1;
**mgamadeus/ddd-common-political** 1.0.0 or later for `Language` / `Locale`, checked with 1.0.19). The paths below
`apiPrefix` are those of these controllers; `paths` renames a segment
(`createTranslationsApi({ …, paths: { appTranslations: 'appTranslations' } })`).

| Hook | Endpoint (below `apiPrefix`, default segments) |
|---|---|
| `useAppTranslationKeysQuery`, `useAppTranslationKeyQuery` | `GET app-translations/keys/list`, `GET app-translations/keys/{id}?expand=appTranslationValues` |
| `useUpdateAppTranslationKeyMutation`, `useDeleteAppTranslationKeyMutation` | `PATCH app-translations/keys` (`{ appTranslationKey }`), `DELETE app-translations/keys/{id}` |
| `useUpdateAppTranslationValueMutation`, `useDeleteAppTranslationValueMutation` | `PATCH app-translations/values` (`{ appTranslationValue }`), `DELETE app-translations/values/{id}` |
| `useAppTranslationCompletenessQuery` | `GET app-translations/keys/completeness` |
| `useGenerateAppTranslationsMutation`, `useGenerateAllAppTranslationsMutation` | `GET app-translations/keys/generate/{localeId}?writingStyle=`, `GET app-translations/keys/generate-all` |
| `useLanguagesQuery`, `useUpdateLanguageMutation`, `useImportLanguagesFromConfigMutation` | `GET languages/list`, `PATCH languages` (`{ language }`), `GET languages/importFromConfig` |
| `useLocalesQuery`, `useUpdateLocaleMutation`, `useImportLocalesFromConfigMutation` | `GET locales/list`, `PATCH locales` (`{ locale }`), `GET locales/importFromConfig` |
| `useTranslateEntitiesMutation` | `POST translations/translateEntities` (`{ entitiesToTranslate, localesToTranslate }`) |
| `useBulkDeleteAppTranslationKeysMutation` (with `bulkDelete`) | the application's bulk delete, default `POST app-translations/keys/bulk/delete` (`{ appTranslationKeyIds }`; `path`, `method`, `body` configurable) |

```tsx
'use client';
import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';
import { AppTranslationsScreen, ConfigImportCard, LocalesScreen } from '@mgamadeus/ddd-admin-ui/translations';

export const AppTranslationsPage = () => (
  <AppTranslationsScreen
    api={translationsApi}
    urlStateAdapter={useNextUrlStateAdapter({ listId: 'appTranslations' })}
    drawerUrlAdapter={useNextDrawerUrlAdapter()}
  />
);
export const LocalesPage = () => <LocalesScreen api={translationsApi} urlStateAdapter={useNextUrlStateAdapter({ listId: 'locales' })} />;
export const ImportsPage = () => <ConfigImportCard api={translationsApi} kind="languages" />;
```

`useEntityTranslator(translationsApi)` translates an entity draft into one locale per request and feeds
`useTranslationRunner` (`./logic`); `useEntitiesTranslator` sends several drafts in one request per locale and answers
one translations store per draft. `TranslatableEntityPayload.objectType` takes `string | null` (generated entity
types). `useContentLocales(translationsApi, { fallback })` gives the content locale keys of the active locales.
`ConfigImportCard` is a `MaintenanceActionCard` (`./page`): title, description, run, the outcome of the last run; a
kind of the host (countries) brings its `operation` (answers the imported rows' count) and its translated `texts`:

```tsx
<ConfigImportCard
  api={translationsApi}
  kind="countries"
  operation={async () => (await importCountries().unwrap()).countries.elements?.length ?? 0}
  texts={{ title: countriesTitle, description: countriesDescription, confirmTitle: countriesConfirmTitle, result: countriesResult }}
/>
```

In `AppTranslationsScreen` the key is a link to its drawer (`?edit=<id>`, or the host's `keyHref(key)`): a plain click
opens the drawer in place, a modified click a new tab; a row opens by pointer or keyboard (Enter / Space on the
focused row).

The keys list sorts by id (default, newest first) or key (`sort` in the URL), numbers its rows, shows cards below `md`
and in the card view, the first four values of a key with "+N" (`valuesPreviewCount`), a delete per row and in the
drawer; "Clear filters" keeps the search; the empty state offers Add. A bulk delete uses the application's endpoint when
the api has it (`createTranslationsApi({ …, bulkDelete: true })`), else one request per key, and summarises deleted and
skipped keys. The generation per locale and style asks the cost estimate first (`previewOnly`) and runs after a
confirmation (`TranslationCompleteness confirmGeneration`), only for the styles the language supports. In the drawer
the key is required, an empty template or hint is sent as `null`; values carry a country, keep the language's styles,
cannot be saved empty, count for the discard question, and are searched, filtered and ordered from two values on; the
new-value form offers only combinations the key lacks.

Host slots of `AppTranslationsScreen`:

```tsx
<AppTranslationsScreen
  api={translationsApi}
  headerActions={<Button variant="outline" onClick={openUntracked}>Untracked keys</Button>}
  moreActions={[{ id: 'sync', label: 'Key sync', onSelect: syncKeys }]}
  toolbarTrailing={<CompactToggle />}
  columns={columns => [...columns.slice(0, 3), usageColumn, ...columns.slice(3)]}
  extraFilters={<FilterText label="Folder" value={folder} onChange={setFolder} />}
  extraActiveFilterCount={folder ? 1 : 0}
  onClearExtraFilters={() => setFolder('')}
  renderCard={({ item, onActivate }) => <HostKeyCard item={item} onActivate={onActivate} />}
  displayMode={view} onDisplayModeChange={setView}                // e.g. useListViewParam('appTranslations')
  useListQuery={useKeysWithUsage}                                  // wraps api.useAppTranslationKeysQuery
  drawerEditKey="key" drawerCreateKey="newKey" urlParamNames={{ id: 'keyId' }}
/>
```

A host hook that asks what a package screen asks shares its cache entry: `buildAppTranslationKeysListArgs(filters,
sort)` (plus `top` / `skip`), `CONTENT_LOCALES_ARG` (or `useActiveLocales(api)` for the rows of `useContentLocales`),
`ACTIVE_LANGUAGES_ARG`, `ACTIVE_LOCALES_WITH_COUNTRIES_ARG`, `APP_TRANSLATIONS_LANGUAGES_ARG`; the host's own writes
invalidate the exported tags (`APP_TRANSLATIONS_TAG`, `LANGUAGES_TAG`, `LOCALES_TAG`) to refresh the package screens.

Options (0.3.4): `transformListArgs` (the request before it is sent; keep it stable), `languageFilter` ("Has a value
in": keys with a value in a language, each row showing that language's values; URL key `language`), `extraResetKey`
(changes with the host's own filters), `showGenerateAll={false}`, `showCompleteness={false}`, `cardFooter`,
`rowActions(key, defaultActions)`, `renderCard` with `parts` (`keyLink`, `values`, `actions`, `card`),
`drawerCreateValue` (e.g. `'new'` for `?create=new`), `editableValueLocale` and `valueActions` in the drawer; a host
column's `sortKey` is sorted on. `createTranslationsApi({ tags, bulkDelete: { mapResponse } })` joins host cache tags
and reads the counts of the application's own bulk delete answer.

Options (0.3.7): `languageFilter="multiple"` ("Has a value in any of these languages": a multi-select; the URL key
`language` holds the ids comma-separated, the root filter and the expand use `in`, one id filters as the single
variant). `cardSort` (default `false`; `{ labels }` names sort keys): a sort select in the toolbar while the keys show
as cards (the card view, and below `md`), listing ID, Key and the host columns' `sortKey`s, each ascending and
descending. `renderGenerationEstimate(preview, scope)` draws host content in the confirmation before a generation (the
completeness block and "Generate all missing", which then asks first too); `loadGenerationPreview(scope)` (scope
`{ kind: 'locale', localeId, writingStyle, locale }` or `{ kind: 'all' }`) loads what the renderer gets, with a
skeleton while it loads and the error when it fails; without a loader the renderer gets the package's own estimate of a
locale (`undefined` for all). `TranslationCompleteness` takes the same two props. `createTranslationsApi({ tags })`
takes the keyed or function form per operation (`TranslationsApiOperation`, `useLanguagesQuery` → `languages`).

Options (0.3.9): `confirmGenerateAll` (`boolean | 'auto'`): absent, "Generate all missing" asks exactly when
`renderGenerationEstimate` is set (as before); `true` always asks, `false` never; `'auto'` asks unless the renderer
answers `null` for `{ kind: 'all' }`: the renderer is probed before the dialog opens (with `loadGenerationPreview` the
estimate loads first and the button is busy meanwhile; a failed load asks and shows the error).
`languageFilterOptions(languages) => FilterOption[]` builds the options of the language filter from the loaded
languages (keep the active ones, label them `de · Deutsch`; a stable function); `isGenerationEstimateEmpty` is exported.

### `./issues`

The error groups of the issues registry, on Core's `IssuesControllerTrait` (mgamadeus/ddd **3.35.1** or later: the
trait and its access hook `throwForbiddenUnlessIssuesAccessAllowed()`; a 403 shows as the screen's error). The registry
fills itself from the log backend (`app:issues:sync-registry-from-log-backend`); the screen reads it and sets status.

| Hook | Endpoint (below `apiPrefix`) |
|---|---|
| `useIssueGroupsQuery` | `GET /groups/list?environment&status&search&section&release&limit&offset` |
| `useIssuesTrendQuery` | `GET /trend?environment&groupHash&status&search&section&release&from&to` |
| `useIssueGroupDetailQuery` | `GET /groups/{environment}/{groupHash}` |
| `useResolveIssueGroupMutation`, `useIgnoreIssueGroupMutation`, `useReopenIssueGroupMutation` | `POST /groups/{environment}/{groupHash}/resolve`, `/ignore`, `/reopen` (invalidate the list and the details) |

```tsx
'use client';
// adminApi.ts: export const issuesApi = createIssuesApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/issues' });
import { IssuesScreen } from '@mgamadeus/ddd-admin-ui/issues';
import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';

export const IssuesPage = () => (
  <IssuesScreen
    api={issuesApi}
    urlStateAdapter={useNextUrlStateAdapter({ listId: 'issues' })}
    drawerUrlAdapter={useNextDrawerUrlAdapter()}
  />
);
```

- **Filters**: the environment switch (the registry's environments and "All", a single environment is a line, not a
  switch), the status tabs Open / Resolved / Ignored / All with the counts of `statusCounts`, the search, the section and
  release filters, the trend window (1 hour – 30 days) and the page live in the URL (`environment`, `status`, `q`,
  `section`, `release`, `window`, `page`; the drawer in `issue=<environment>:<groupHash>`). An omitted environment is
  the registry's first; the response names it and the switch shows it.
- **Order and paging**: the groups come last seen first, as the trait sorts them (it takes no sort parameter), 50 per
  page with Previous / Next (`limit` / `offset`).
- **Trend**: bars per bucket (SVG drawn by the entry, no chart library), labelled with the step; the same environment
  and filters as the list, so a filtered trend says "sum of N of M matching groups" and "a lower bound" when truncated;
  `trendError` is a note under the chart (a 0 is not "no errors" then).
- **Health**: a stalled registry job is a warning with `lastError`; an empty list then reads "unknown", never "no
  errors". A silent collector alone is a muted line.
- **Drawer**: status, flags (new, regression), facts, the group's own trend, "Where it happens" (the issues), the last
  occurrences (application frames open with their code context and the current line marked, framework frames folded,
  client frames at the position a source map resolved, the raw stack as fallback, causes, request, console command,
  the failed job, the client and its breadcrumbs), `eventsError` in place of the occurrences, "Open in log backend"
  (only with `logBackendUrl`, a new tab), "Copy for agent" (the `app:issues:show` command and `agentJson`).
- **Status changes**: Resolve (fixed in a deploy; a later event reopens it as a regression) and Ignore (silenced for
  good), Reopen; the returned group replaces the row at once and the list is fetched again. They follow
  `WriteAccessProvider`. Counts are approximate (the collector may replay events) and say so.
- The payloads carry stack traces, request parameters and account ids: mount the screen for trusted admins only.

`createStaticIssuesApi(showcaseIssuesData)` answers the sample payloads of `./showcase` (two environments, six groups,
a stalled staging registry, every occurrence kind).

Options (0.3.3): `customTrendRange` (a "Custom" from / to window, at most 31 days, URL keys `from` / `to`),
`environmentLabels`, `headerActions`, `pagination="load-more"` (the next 50 append through the list's infinite-scroll
tail), `eventSummary`; `IssueEventDetails` shows a summary and copy actions for the stack and file:line
(`copyActions={false}` turns them off). A job's attempt reads "2 of 3" when the payload carries `maxAttempts`.

Options (0.3.7): `environmentLabels` also takes a function (`code => label | undefined`; `undefined` or `''` keeps the
code), e.g. for environments named by a pattern (`issueEnvironmentLabel(code, labels)` for a host's own view).

### `./database`

The schema diff screen on Core's `DatabaseModelsControllerTrait` (mgamadeus/ddd **3.35.1** or later: the trait, its
DTOs and the access hook `throwForbiddenUnlessDatabaseModelsAccessAllowed()` called first by every action). The
application mounts the trait on one controller of its own (e.g. `#[Route('/common/databaseModels')]`) and restricts the
path to its highest admin role; the screens need nothing else.

| Hook | Endpoint (below `apiPrefix`) |
|---|---|
| `useSchemaDiffQuery` | `GET /diff` → `{ diffs }` |
| `useApplyDiffMutation` | `POST /applyDiff` with `{ sqlTableName, expectedDiffSignature, disableForeignKeyChecks }` → `{ diffs }` |
| `useApplyDiffsMutation` | `POST /applyDiffs` with `{ sqlTableNames: string[] \| null, expectedDiffSignatures: { elements: [{ sqlTableName, signature }] }, disableForeignKeyChecks }` → `{ diffs }` |
| `useDatabaseTablesSqlQuery` | `GET /generateDatabaseTables` (text/plain, `responseHandler: 'text'`) |
| `useDoctrineModelsCodeQuery` | `GET /generateDoctrineModels` (text/plain) |
| `useDoctrineModelForEntityQuery` | `GET /generateForEntity?entityName=` (text/plain; 400 ambiguous, 404 unknown) |

```tsx
'use client';
// adminApi.ts — module scope, once
export const databaseApi = createDatabaseApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/databaseModels' });

// app/maintenance/database/page.tsx
import { SchemaDiffScreen } from '@mgamadeus/ddd-admin-ui/database';

export const SchemaDiffPage = () => <SchemaDiffScreen api={databaseApi} />;
```

- **Signature gate.** Every apply sends the `diffSignature` of every diff the screen shows (the server narrows them to
  the applied tables); a diff that changed since it was shown answers `[DIFF_SIGNATURE_MISMATCH]` and the screen shows
  "The schema changed since you loaded it" with Reload. `[DIFF_APPLY_LOCK_BUSY]` (another apply runs) says to retry in
  a few seconds; any other 400 (the large-table production guard, an invalid table list) shows the server's message; a
  404 (no pending diff) asks for a reload.
- **The answer replaces the list.** Both applies answer the diff computed afterwards: the screen shows it at once, with
  no second request (the applies invalidate no tag). Reload asks again.
- **Confirmations** through `useConfirm`: an additive table asks plainly, a destructive or mixed one needs its table name
  typed (and says to decide first whether the entity or the database is wrong), "Apply selected" and "Apply all" their
  phrases (`APPLY SELECTED`, `APPLY ALL`) with the counts per severity. "Apply all" sends `sqlTableNames: null`, or the
  unblocked table names when a blocked one is pending.
- **Blocked tables** (`directApplyBlocked`, the large-table guard): no Apply action and no checkbox, the size and rows
  against the thresholds (100 MB / 100,000 rows), the operations that force a table copy, and the online-schema-change
  path; never a bypass (the trait offers none over HTTP).
- **Schema writes disabled** (`APP_SCHEMA_WRITES_DISABLED=1` on a process that shares another stage's database): the
  trait answers 403 on both applies and on `generateDatabaseTables`. The screen shows the message and switches every
  write off from then on (a narrowed `WriteAccessProvider` with that reason); the tables SQL panel shows the refusal.
- **Generated code**: `GeneratedCodePanel` (`kind` `tables`, `models`, `entity`) requests the text routes only when
  asked, shows them read-only with copy and download, and never runs anything. `SchemaDiffScreen showGeneratedCode={false}`
  leaves the panels out.
- Writes follow the screen's `WriteAccessProvider`; the switch "Foreign key checks off while applying" sends
  `disableForeignKeyChecks` (default true, as the trait).

Options (0.3.3): only the schema-write refusal (a 403 whose message matches
`SCHEMA_WRITES_DISABLED_MESSAGE_PATTERN`) turns the screen's writes off until remount; another 403 shows the server's
message and refuses that apply only. A host that rewords `getSchemaWritesDisabledMessage()` passes
`isSchemaWritesRefusal`. A failed apply refetches the diff; "Apply all" is off while a diff has no signature
(`applyAllWithBlockedDiffs="disable"` also while one is blocked); a card shows the server's `directApplyBlockReason`
and marks a table whose diff changed since the previous load ("Changed").

### `./crons`

The Crons screen on Core's `CronsControllerTrait` (mgamadeus/ddd **3.35.1** or later: the trait, `#[CronSchedulable]`
and the access hook `throwForbiddenUnlessCronsAccessAllowed()`, which an application whose rule is not a role
overrides on its controller; a 403 shows as the screen's error).

| Hook | Endpoint (below `apiPrefix`) |
|---|---|
| `useCronsListQuery` | `GET /list` |
| `useCronExecutionsQuery` | `GET /executions/list?cronId&result&limit&offset` (`result` ALL / FAILED / RUNNING / SUCCESSFUL) |
| `useCronExecutionQuery` | `GET /executions/{executionId}` (the full output) |
| `useCronsTimelineQuery` | `GET /timeline?hours` (1–168) |
| `useCronCommandsQuery` | `GET /commands` |
| `useCronSchedulePreviewQuery` | `GET /schedule-preview?schedule` |
| `useCronQuery` | `GET /{cronId}` |
| `useCreateCronMutation` | `POST` on the prefix itself (`{ name, description, schedule, commandName, arguments, isActive }`) |
| `useUpdateCronMutation` | `PATCH /{cronId}` with the changed fields only (`arguments: ''` clears them) |
| `useDeleteCronMutation` | `DELETE /{cronId}` |
| `useActivateCronMutation`, `useDeactivateCronMutation`, `useRunCronNowMutation` | `POST /{cronId}/activate`, `/deactivate`, `/run-now` |

Cache tag `AdminUiCrons` (`LIST`, `DETAIL`, `RUNS`, `COMMANDS`): every write refetches the list and the details;
create, update and delete the commands' "used by"; delete the runs.

```tsx
'use client';
// adminApi.ts, module scope: export const cronsApi = createCronsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common/crons' });
import { CronsScreen } from '@mgamadeus/ddd-admin-ui/crons';
import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';

export const CronsPage = () => (
  <CronsScreen
    api={cronsApi}
    urlStateAdapter={useNextUrlStateAdapter({ listId: 'crons' })}
    drawerUrlAdapter={useNextDrawerUrlAdapter()}
  />
);
```

- **Server clock.** The payload's date-times are wall-clock text on the server (the zone the runner evaluates the
  schedules in). The screen shows them as they are, labelled "server time", and counts the next run down against
  `runner.serverNow` (ticking from the moment the list arrived), never against the browser clock. A paused Cron shows
  no countdown.
- **Run now queues.** `run-now` makes the Cron due; the runner's next tick (within a minute) runs it. The row says
  "Queued" until the list shows the new run. Run now is offered only for an active Cron that is not running and whose
  command exists (no Run now on `MISSING_COMMAND`); a 409 (the runner started it meanwhile, it was switched off) is shown
  with the server's message and keeps Run now off for a minute.
- **Commands.** The form offers only `/commands`: the commands marked `#[CronSchedulable]` (and the framework's own),
  with their description and the Crons that already run them; no free text. Arguments are one line without quotes; the
  composed command line is shown. The schedule has presets and a debounced live preview (`/schedule-preview`: valid or
  the server's sentence, the next 5 slots). A save sends only the changed fields; a 400 places its `validationErrors`
  on the fields they name.
- **Delete** asks with the Cron's name typed (`useConfirm` `requirePhrase`) and says the run history goes with it; not
  while the Cron runs.
- The list refreshes every 30 s while the tab is visible (`pollingIntervalMs`), the first runs page too. The details
  drawer (`?cron=<id>`) and the form (`?edit=<id>`, `?create=1`) live in the URL with `drawerUrlAdapter`; the view,
  search, runs filter and timeline window (`view`, `q`, `result`, `hours`) with `urlStateAdapter`. Charts (the duration
  bars of the last 100 ended runs, the timeline heatmap, the run strip) are drawn by the entry; no chart library. Writes
  (Add, Run now, the switch, Edit, Delete, the form's save) follow `WriteAccessProvider`.

Options (0.3.3): a status filter (URL key `status`, with "Need attention") and a Cron filter on the runs list (URL key
`runsCron`), both shown by default (`statusFilter={false}`, `runsCronFilter={false}` hide them); `sort="severity"`
(worst first); `detailsPollingIntervalMs`, `timelinePollingIntervalMs`, `outputPollingIntervalMs` (default 0; output
polls only while a run is running); `timeZone="viewer"` shows times in the viewer's zone (`serverUtcOffsetMinutes`, else
estimated from `serverNow` after hydration, rounded to 15 minutes). A stored command that cannot be scheduled stays
read-only with its reason; names stored before the kebab-case rule save unchanged and are found in either spelling.

Options (0.3.7): `detailsPollingIntervalMs` also takes a function of the shown Cron (`cron => cron.status === 'RUNNING'
? 2000 : 30000`; 0 until the Cron has loaded). `sort="severity"` breaks a status tie by the most recent failure, then
the most recent run (newest first), then by name (`compareCronsBySeverity`); `severityCompare(left, right,
defaultCompare)` replaces that order with the host's (wrap `defaultCompare` to keep it as the fallback).

Options (0.3.9): `sort="severity"` breaks a status tie by name again (the rows of one status keep their places between
refreshes); `severityTieBreak="recent"` restores the order of 0.3.7 / 0.3.8 (most recent failure, then most recent run
first). `severityStatusOrder` (default `CRON_STATUS_SEVERITY`: missing command, failing, overdue, running, ok, paused)
ranks the statuses, e.g. failing before a missing command. `compareCronsBySeverity(left, right, options)` and
`sortCrons(crons, sort, severityCompare, options)` take the same `CronSeverityOptions`.

### `./files`

A file manager for any file area of the host: the blocks know only the view models (`FileView`, `FolderView`,
`FileAreaView`, …) and one adapter. Ids and the area key are opaque (`string | number`).

```tsx
'use client';
import { FileManager, type FileManagerAdapter } from '@mgamadeus/ddd-admin-ui/files';
import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';

// module scope (or useMemo with stable dependencies): the manager calls each read hook once per render
const adapter: FileManagerAdapter = {
  useArea: areaKey => …,          // FileQueryState<FileAreaView>: quota, usage, per-file limit, allow-list, retention
  useFolders: areaKey => …,       // every folder of the area, flat
  useFiles: query => …,           // FileListState for a FileListQuery (null = skip)
  useFile: fileId => …,           // FileDetailView for the drawer (null = skip)
  useActions: () => actions,      // upload, getDownload, patchFile, moveFiles, trashFiles, createFolder, patchFolder, deleteFolder, …
  capabilities: { trash: { useTrash }, versions: {}, activity: {}, filters: { family: true, created: true, orders: ['name', 'created', 'size'] } },
};

export const FilesPage = ({ areas }) => (
  <FileManager
    adapter={adapter}
    areas={areas}
    urlStateAdapter={useNextUrlStateAdapter({ listId: 'files' })}
    drawerUrlAdapter={useNextDrawerUrlAdapter()}
    loadPdfJs={() => import('pdfjs-dist').then(pdfjs => ((pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl), pdfjs))}
  />
);
```

| Capability | Needs the actions | The manager offers |
|---|---|---|
| (always) | `upload`, `getDownload`, `patchFile`, `moveFiles`, `trashFiles`, `createFolder`, `patchFolder`, `deleteFolder` | browse, search, upload tray, rename and description, moves inside the area, folders, delete |
| `trash` (`useTrash`) | `restoreFiles`; optional `purgeFiles`, `emptyTrash` | the Trash node, restore, final delete, empty (typed confirmation) |
| `versions` | optional `uploadVersion`, `restoreVersion`, `deleteOlderVersions` | the versions in the drawer, Replace, Restore an older version, Delete older |
| `activity` (optional `useAccessEvents`) | — | the file's events in the drawer (`formatEventType` names the host's types); with `useAccessEvents` a Changes / Accesses switch (viewed, downloaded, by whom, staff or partner, the address when given) |
| `location` (`resolveLocation`) | — | the path bar resolves what the tree cannot: `drive/<id>`, a path into another area, a file's path (opens its folder and details) |
| `audience: 'partner'` | — | no staff-only control: no purge, no empty trash, no area settings or maintenance slots |
| `links` (`kinds`, `useLinkTargets`) | `setLinks`; optional `bulkLinks` | link chips, the link dialog (tri-state for several files), linked / not linked and "linked to" filters, link tabs (`context`) |
| `moveAcrossAreas` (`useMoveTargetAreas`) | `moveItems`, `previewMove` | an area picker in the move dialog, drops on other areas' roots, the confirmation from the preview |
| `filters` | — | type, created from / to, uploaded by me, the sort orders |
| `workingCopy` | — | a badge on files with `hasWorkingCopyChanges` |
| `malwareScan: { enabled: false }` | — | no scan badges (an area without a malware check) |

- **Slots:** `headerActions`, `renderAreaSettings` (the manager adds an "Area settings" button that opens it),
  `renderAreaMaintenance` (a purge, a usage link), `renderAreaPicker` (a grouped, searchable picker above the list; the
  tree then shows the open area only), `formatEventType`.
- **URL state:** `areas` lists the areas; the open one lives in the URL state (`area`) or is controlled (`areaKey` +
  `onAreaKeyChange`). The URL also holds `folder` as a path (`/Templates/Typst`; a folder id still works), `tab`
  (`trash`), `view`, the filters and `order`; the drawer is `file=<id>` and its activity tab `fileTab=accesses`.
  `urlKeys` renames them for the host (`{ area: 'space', folder: 'path', order: 'sort' }`). A change of area, folder or
  tab is a history entry (the adapter's `push`; Back and Forward step through the folders), search, filters, sort and
  view replace. A path that names no folder opens the nearest existing one with a notice; a file's path opens its
  folder and details (capability `location`).
- **Breadcrumbs and paths:** the crumbs stick to the top while the list scrolls; each folder crumb opens the folders
  beside it. A click on the last crumb, its pencil or Ctrl/Cmd+L turns them into the path bar: type or paste `/a/b`,
  `drive/<id>`, `/workspace/drive/…` or `drivespaces/<mount>/…`, complete folder names with the arrows and Tab, Enter
  goes there, a miss names the missing name. Every file and folder has "Copy path" and "Copy link" (`buildLink`
  overrides the link; default: this page with the area, path and file). `readOnlyNotice` explains a read-only area.
- **Recorded accesses:** downloads ask `getDownload` with `variant: 'ORIGINAL'`, the drawer's preview with `PREVIEW`
  and list pictures come from `thumbnailUrl` (or `THUMBNAIL`), so a server that records views and downloads never
  records a scrolled list.
- **Untrusted content:** previews draw only JPEG, PNG, GIF and WebP (or a rendition the server made) as `<img>`
  (click or the buttons zoom in steps), PDF on canvases through the host's pdf.js (`loadPdfJs`; without it "Open PDF"
  in a new tab), Markdown as markup or as its source, source files (JSON, YAML, TypeScript, PHP, …:
  `codeLanguageOfExtension`), TXT and CSV as text nodes (first 100 KB), MP4 / WebM / MOV and MP3 / WAV / OGG … in the
  browser's own player. An SVG is a picture only from the copy the server sanitised (below), in an `<img>`; its
  uploaded bytes, HTML and every other type are never rendered: icon, facts, download. Nothing is fetched
  before the file is released (`CLEAN` / `SKIPPED`), and nothing of a file is ever inserted as HTML.
- **Loaders of the host** (`FilePreviewLoaders`, props of `FileManager`, `FileDrawer`, `FilePreview`, `FileViewer`; each
  optional): `loadPdfJs`; `loadCodeHighlighter` — colours source files, e.g.
  `() => import('highlight.js/lib/common').then(module => codeHighlighterFromHighlightJs(module.default))` (the
  highlighter's output is read as tokens and drawn as text nodes; without it the code is plain); `renderMarkdown` — the
  "Preview" of a Markdown file, e.g. `source => <MarkdownPreview source={source} untrusted />` from `./markdown`
  (without it the file shows its source only). `./files` itself imports neither library.
- **`FileViewer`** shows one file on a wide surface (a canvas beside a chat, a pane): name and facts, the preview
  filling the height (`FilePreview layout="canvas"`: no box of a fixed height, PDF pages up to 1100 px wide, texts up
  to 1 MB), the choice of a stored version and Download. It reads through the same adapter (`useFile`,
  `useActions().getDownload`); the parent is a flex column that gives the height. `leading` takes a control before the
  name (a way back), `actions` controls after Download.
- **Editing a text file in place** (`FileViewer canWrite`, capability `versions` with the actions `saveText` and
  `saveTextAsCopy`; `features.editText`): Markdown, TXT, CSV and source files up to 1 MB get "Edit" — a plain text
  field (`FileTextEditor`, no editor library; a Markdown draft can be looked at as markup). Save calls
  `saveText(fileId, { text, baseVersionId })` with the version the edit started from; the adapter answers
  `{ status: 'saved', file }` or `{ status: 'conflict' }` and **must never write on top of a newer version**. On a
  conflict nothing is overwritten: the reader keeps editing, loads the newer version, or saves the draft beside the
  file (`saveTextAsCopy(fileId, { text, name })`, the adapter picks a free name when the proposed one is taken). A file
  that is no UTF-8 text, is longer than 1 MB, shows an older version or has a newer version waiting for its check is
  not offered for editing (`fileTextEditRefusalOf`); Windows line ends are written back as they were. `onTextSaved`
  and `onTextCopySaved` tell the host (e.g. to note the change in a conversation).
- **A PDF the server renders** (`FileView.hasPdfRendition`, e.g. a Word, Excel or PowerPoint document): the preview
  asks `getDownload(fileId, { variant: 'PDF_RENDITION', disposition: 'inline' })` and draws the answer with
  `PdfPreview`. The answer may carry `state: 'pending'` (the preview says so and asks again every 3 s, for at most
  3 minutes) or `state: 'failed'` ("No preview could be made …", with `message` when the server gave one).
- **An SVG as a picture** (`FileView.hasSanitizedImage`): the preview asks
  `getDownload(fileId, { variant: 'SANITIZED_IMAGE', disposition: 'inline' })` and draws the answer in an `<img>` with
  the picture zoom (kind `sanitized-image`; fitted, a vector picture fills its box, and its zoom steps count from
  that fitted size) — never as markup, never in an
  `<object>` or a frame, so nothing in it runs and nothing it names is loaded. **The adapter's duty:** the URL it
  answers serves a copy the server sanitised (no script, no handler, no reference to another resource) with a picture
  type, and never the uploaded bytes; when it cannot say so (no copy, an attachment answer) it answers
  `state: 'failed'`, and the file shows "… files have no preview here" with Download, as without the fact. A vector
  file is asked for with that variant only: no thumbnail and no other fact makes its bytes a preview.
- **`FileManager variant="compact"`** is the manager on a narrow surface that gives the height (a canvas beside a
  chat): no folder tree and no quota, folders are walked through the list and the breadcrumbs, a file opens in place
  in `FileViewer` with a way back instead of in the drawer; upload, new folder, rename, move and trash appear by the
  same rights as on the page (`canWrite`, `writesAllowed`, the adapter's capabilities). Without URL adapters the
  manager keeps its state itself; `initialState` says where it starts (`{ folder: '12' }`). Its table shows the
  name, the status, the size and the row's actions only; a file is renamed from its row (`FileNameDialog`), and a
  viewer without the write right does not see the write actions at all.
- **Uploads:** `uploadWithProgress(transport, request, callbacks)` sends one multipart request with progress, renews a
  session once after a 401 and refuses while writes are off; an adapter that uploads straight to a store implements
  `upload` itself. The tray runs three at a time and checks type, size and quota before (`precheckUpload`).
- **Drag and drop** is the browser's own (no library); keyboard and touch use the Move dialog.
- `createStaticFileManagerAdapter(showcaseFilesData)` answers fixed payloads (writes refused) for reviews and tests.

### The cloud drive screen

The drive screen of `mgamadeus/ddd-clouddrive` is the npm package `@mgamadeus/ddd-clouddrive` (`./screen`), built on
`./files`; it was the entry `./clouddrive` until 0.5.x.

### The sandbox screen

The workspaces of `mgamadeus/ddd-agent-sandbox` are the npm package `@mgamadeus/ddd-agent-sandbox` (`./screen`),
built on this package's blocks; it was the entry `./sandbox` until 0.6.x.

## Design studio

`./design-studio` exports `designStudioComponents`, the `components` value the provider of
`@mgamadeus/ddd-design-studio` takes (targets studio **0.7.x**, checked against 0.7.3). Every slot maps to the block of
the same name: the shadcn-style primitives (`Button` … `DropdownMenuSeparator`), `Combobox`, `SearchField` and
`StatusBadge` from `./list`, `QuickFilterPills` from `./glass`, `PageHeader`, `StatusCallout`, `CardGrid` and
`PageSections` from `./page`.

```tsx
import { designStudioComponents } from '@mgamadeus/ddd-admin-ui/design-studio';

<DesignStudioProvider components={designStudioComponents} /* api, router, paths, … */ />;
// one slot of your own: components={{ ...designStudioComponents, Button: MyButton }}
```

The entry never imports the studio and adds no dependency: `DesignStudioComponentsContract` is a structural copy of
the studio's `DesignStudioComponents`, and the map is typed against it; the studio passes a subset of each block's
props, so the map is assignable to the studio's own type. A later studio minor that adds or changes a slot needs a new
release of this entry. The host's `TooltipProvider` (part of `AdminUiProvider`) and theme apply as for every block.

## Showcase

`./showcase` is a development page, not a screen block: mount it on a route of the host, below `AdminUiProvider`, to
see every block in the host's theme and tokens, light and dark side by side (each pane's dialogs and menus open inside
it).

```tsx
'use client';
import { Showcase } from '@mgamadeus/ddd-admin-ui/showcase';

export const ShowcaseScreen = () => (
  <Showcase
    // only a host with the optional peer sonner passes it; without it the section says it is skipped
    loadNotifySonner={() => import('@mgamadeus/ddd-admin-ui/notify-sonner')}
    sections={[{ id: 'host', title: 'Host blocks', content: <HostBlocks /> }]}
  />
);
```

It needs none of the optional peers: `./notify-sonner` loads only through `loadNotifySonner` (lazily, skipped when the
import fails), `./next` is described, never imported. `themes` limits the panes, `omit` leaves package sections out.
Its texts are developer-facing English and not part of `i18n-keys.json`. `SHOWCASE_COVERAGE` lists per entry the
components it draws and why the others are not drawn alone; the package's checks compare it with the exports.

A list rendered on the server hydrates without a mismatch: the stored grid/table view (`useListViewParam`) and the
saved filters of a list (`useUrlListState` with an adapter's `restore`) are read from browser storage only after
hydration, and applied in the render right after it. A list that mounts on the client (no server HTML) reads them in
its first render, so it never renders or requests twice. `useHydrated()` (`./logic`) gives the same switch to host
code.

A URL change from outside the list (Back / Forward, a link to the same page with other filters, a host write) reaches
its inputs; the echo of its own write does not (0.3.4). `useNextUrlStateAdapter({ listId, restore: false })` brings no
saved state back; `savedKeys` (the list's own keys) keeps a drawer's `edit`, another list's filters and host parameters
out of the saved state.

## Shell and navigation

`./shell` is the application frame; its content comes from the host. ONE navigation tree (types in `./logic`) feeds
the sidebar, the mobile menu, the breadcrumbs and the document title:

```tsx
'use client';
import { m } from '@mgamadeus/ddd-admin-ui/i18n';
import type { NavigationItem } from '@mgamadeus/ddd-admin-ui/logic';
import { AccountMenu, AppShell, LanguageMenu, type UseEntityLabel } from '@mgamadeus/ddd-admin-ui/shell';

const NAVIGATION: NavigationItem<'item'>[] = [
  { key: 'home', label: m('Home'), href: '/', exact: true, icon: House },
  {
    key: 'catalog', label: m('Catalog'), icon: Boxes, children: [
      { key: 'items', label: m('Items'), href: '/items', icon: Shapes, badge: waiting, crumbs: [
        { segment: 'create', label: m('Create item') },
        { segment: ':itemId', entity: 'item', children: [{ segment: 'details', label: m('Details') }] },
      ] },
      { key: 'reports', label: m('Reports'), href: '/reports', lockedReason: m('Not in your plan') },
    ],
  },
  { key: 'old', label: m('Old screen'), href: 'https://old.example/screen', external: true },
];
// the page's own query, so the crumb sends no request of its own
const useEntityLabel: UseEntityLabel<'item'> = ({ id }) => { const query = useItemQuery(id); return { text: query.data?.name, isLoading: query.isLoading }; };

<AppShell navigation={NAVIGATION} canAccess={item => rights.allows(item.key)} useEntityLabel={useEntityLabel}
  brand={<Link href="/" aria-label="Home"><Logo /></Link>} documentTitle={{ appName: 'Admin' }}
  topBarEnd={<><LanguageMenu languages={languages} current={code} onChange={setCode} /><AccountMenu name={user.name} entries={accountEntries} /></>}>
  {children}
</AppShell>
```

- **Entries**: a leaf has `href` (`exact` for an overview whose siblings live below it), optional `badge` (work
  waiting), `lockedReason` (a commercial lock: still a link, marked), `external` (a plain `<a>`, marked "Opens outside
  this app"); a group has `children` (groups nest) and optionally its own `href` (its label links, the caret toggles).
  Labels are UI texts, translated when rendered.
- **Breadcrumbs** (`resolveCrumbs`): the groups as text (a link when a group has its own page), the entry as a link,
  then per leaf `crumbs` — child segments as literals or `:params` (a literal wins), each with a fixed `label`, a
  `label(segment, t, params)`, or an `entity` key named by the host's `useEntityLabel` hook (the id while it loads). A
  route without label adds no crumb; `link: false` keeps a crumb as text. Narrow trails fold into an ellipsis menu
  (container queries, no measurement).
- **Rights**: `canAccess(item)` hides refused items from the sidebar (a group left empty disappears); the breadcrumbs
  resolve against the whole tree and show a refused crumb as text. Presentation only: the server still checks.
- **Pathname and links**: the provider's `usePathname` (`useNextPathname`) and `linkComponent` (sticky parameters with
  `withStickyParams`); no router import in the blocks. `AppShell.pathname` overrides.
- **Collapse**: the foot row and `[` toggle the icon rail (not while typing or in a dialog or menu, not below `lg`),
  remembered in localStorage per `collapsedStorageKey`, applied right after hydration (the server renders the full
  column). The rail shows groups as flyout menus.
- **Document title**: `documentTitle={{ appName }}` keeps `document.title` on the page (`Details · Blue widget · Admin`);
  `resolveDocumentTitle(pathname, navigation, { appName })` gives the same text on the server.
- **Background**: `background={<ShaderBackground />}` from `./shell-background` (lazy WebGL, nothing with reduced
  motion or without WebGL). The page background then sits on `<html>`.
- **RTL**: logical sides throughout; with Radix's `Direction.Provider dir="rtl"` the menus and the mobile sheet open
  from the right.
- **Host looks** (all optional): `navRowClassName` / `navRailRowClassName`, `childIconsInList={false}`,
  `menuButtonClassName`, `mobileMenuClassName`, `mobileMenuHeaderClassName`, `style`, `contentStyle`,
  `contentAttributes` and `data-*` on the root; `onCollapsedChange` / `markDocumentCollapsed` (`data-shell-collapsed` on
  `<html>`) for fixed elements outside the frame. `AccountMenu` takes `avatar` (an own node; `AccountAvatar icon`),
  `avatarClassName` and `beforeEntries`; `LanguageMenu` `triggerAriaLabel`, `LanguageMenuSub` `triggerLabel`;
  `documentTitle` `formatTitle` and `reassert` (written again after a router changes the title); `ShaderBackground`
  `displacementScale`, `displacementCells`, `blob1Opacity`, `blob2Opacity`.
- **More crumbs** (0.3.3): `leadingCrumbs` (scope crumbs before the tree; they never name the page in the title),
  `queryCrumbs` on a leaf or route (a tab from the query string; pass `search`: a router's pathname has no query),
  `canAccessCrumb` (rights per crumb, segments included), `crumbOnly` (a page in the trail but not in the menus; use it
  instead of hiding a page through `canAccess`), `crumbLink: false` / `crumbHidden` on leaves and groups (a redirect, a
  silent level), `foldWidths` for the folding thresholds; `useEntityLabel` may answer with a `node` (a muted id), `link:
  false` and a `state` (`data-crumb-state`).
- **Parts alone and more looks** (0.3.3): `ShellNavDisplayProvider` lets `ShellSidebar`, `ShellNavList`, `ShellNavRail`
  and `ShellMobileMenu` draw like inside `AppShell`; `mobileMenuHeader`, `navBadgeClassName`, `navChildListClassName`,
  `navListClassName`, `sidebarNavClassName`, `navigationLoading` (skeleton rows), `navOpenGroupKeys` /
  `onNavOpenGroupKeysChange` (controlled open groups: store what it reports, or a route change cannot open its group),
  `railFlyoutClassName`, `railGroupPageRow={false}`, `topBarClassName` / `topBarRowClassName`, `collapsedStorageValues`,
  `collapseShortcutOptions`. `AccountMenu` `triggerVariant="avatar"`, `contentClassName`, `header`, `itemClassName`,
  `afterEntries`, entry `before`; `LanguageMenu` `icon`, `iconVisibility`, `contentClassName`, `heading`,
  `renderOption`. `ShaderBackground` `displacementScale={[x, y]}`, `displacementZeroMean`, `displacementImage`
  (same-origin or served with CORS), `paused`.
- **Options (0.3.9)**: `contentElement="div"` (pages that bring their own `<main>`; the skip link's target stays),
  `topBarAttributes`, `sidebarAttributes` (`data-*`) and `sidebarClassName` (also `data-*` on `ShellSidebar`).
  Rows: `navGroupRowHover="row"` (a group row with its own page tints as a whole, not link and caret apart),
  `navGroupToggleClassName`, `navActiveRowClassName`, `navActiveGroupClassName`, `navRowClassNameFor(item)`; rail:
  `railFlyoutItemClassName`, `railFlyoutActiveItemClassName`, `railTooltipDelayMs` (on `ShellNavDisplayProvider`:
  `groupRowHover`, `groupToggleClassName`, `activeRowClassName`, `activeGroupClassName`, `rowClassNameFor`, the rail
  names as they are, `linkProps`). Links: `navLinkProps` (an object or `({ key, href }) => props`, e.g.
  `{ prefetch: false }`) and an item's own `linkProps` reach the host's link component on every in-app link of the
  shell (rows, rail, flyouts, mobile menu, breadcrumbs, account entries; an item's `linkProps` on its rows), never on
  `external` entries; no second link provider. Mobile menu: `mobileMenuOverlayClassName`, `mobileMenuCloseButton` (a
  button that closes it; `false`: none), `mobileMenuNavClassName`, `mobileMenuFooterClassName`,
  `mobileMenuDescription` (its `aria-describedby`); the same without the prefix on `ShellMobileMenu`.
  `ShellBreadcrumbs` `itemClassName`, `ariaLabel`, `foldBy="viewport"` (the fold widths measure the window: media
  queries); pass it as `breadcrumbs={<ShellBreadcrumbs … />}`. `AccountMenu` `triggerAriaLabel`, `initials`,
  `avatarFallbackOnError` (a failing image shows the initials; `fallbackOnError` on `AccountAvatar`), entry
  `className`; `LanguageMenu` / `LanguageMenuSub` `optionClassName`, `checkClassName`, `allowReselect` (`onChange` for
  the current language too). `ShaderBackground` `displacementImageSize` (the texture a host image is resampled to, a
  power of two from 16 to 2048, default 256), `displacementImagePlaceholder` (`noise` as before, `none`, or a CSS colour
  until the image has loaded), `observeAttributes` (default `class`, `style`, `data-theme` on `<html>` and `<body>`) and
  `data-*` on the layer.

## Texts

The UI language lives in one store: `setTranslations(languageCode, writingStyle, bundle)` (or the provider's
`translations` adapter) sets it, `useTranslate().t` and `translateText` read it, `m('…')` marks a text for extraction
without translating it. A key is the English text, or `<text>__<context>` with a context.

A text rendered with a context is marked with it: `m('Failed', { context: 'import-status' })` (`m` returns the text;
the context reaches the renderer separately, e.g. as `StatusDefinition.context` or the map context of
`defineStatusMap(map, { context })`). Extractors read the call statically: the first argument of `t(…)`,
`translateText(…)` or `m(…)` as a string literal, an optional second argument `{ … }` without nested braces whose
`context:` is a string literal, and `<Translate context="…">text</Translate>`; the key is `<text>__<context>`. A
context held in a variable, or only on the map, is invisible to an extractor, so each label carries its literal.

The package ships its texts (all entries except `./showcase`) as [`i18n-keys.json`](./i18n-keys.json) (`./i18n-keys.json`): every key with its text,
context, translator hint and the files that use it, sorted by key. A host's text export merges this manifest instead of
scanning the package (one usage per key, the hints with the host's own hint precedence). `ddd-admin-ui-i18n-manifest
--check` verifies that the installed package's manifest matches its built files (`--dir <package>` checks another
copy).

## Agent skill

```bash
npx ddd-admin-ui link-skills   # or: pnpm exec ddd-admin-ui link-skills
```

Symlinks the skills shipped in `.claude/skills/` of the installed package (`ddd-admin-ui-specialist`) into the
project's `.claude/skills/`. Idempotent; repoints an existing symlink, never touches a real file or directory.

## Versioning

0.x: each minor may break. Pin the exact version while the package is in 0.x (`"@mgamadeus/ddd-admin-ui": "0.3.12"`,
`pnpm add -E` / `npm install -E`); modules peer on the version they were tested with. Stable releases are published
under the `latest` dist-tag, pre-releases (`x.y.z-…`) under `next`. Changes per release: [CHANGELOG.md](CHANGELOG.md).

## Development

```bash
pnpm install
pnpm typecheck
pnpm test                       # unit tests beside the sources, script tests and a failing fixture per check-package rule
pnpm build                      # tsc → dist, declaration specifiers, stylesheets, manifests and shipped scripts
pnpm test:render                # after the build: list snapshot (as in 0.1.0-rc.2), form actions snapshot (as in 0.1.0-rc.5), write access, status contexts, the showcase, the shell
node scripts/check-package.mjs --dir .
pnpm pack --pack-destination "$TMPDIR" && test/consumer/run.sh "$TMPDIR"/mgamadeus-ddd-admin-ui-*.tgz pnpm "$TMPDIR/consumer-pnpm"
```

| Command | What it does |
|---|---|
| `node scripts/build.mjs` (`pnpm build`) | removes `dist`, `tsc -p tsconfig.build.json` (one JS and declaration file per source file, directives kept, `.js` specifiers), rewrites the declarations' specifiers to `.js`, copies CSS, JSON and the shipped scripts into `dist` |
| `node scripts/check-package.mjs --dir <package root or extracted tarball>` | the 13 package rules: exports and bins, directives, specifiers, no app alias, deny list (`--deny a,b` or `CHECK_PACKAGE_DENY`; `--require-deny-list` on release), declared dependencies, entry edges and reach, module state once, `files` and `sideEffects`, declarations in a strict consumer, no tests, fresh text manifest, tokens |
| `node scripts/tokens-utilities.mjs [--write]` | checks (or regenerates) the `utilities` lists of `tokens.json` from the source |
| `pnpm test:render` | server-renders list tables, bodies and badges from the build: without the optional table props the markup equals `test/consumer/fixtures/plain/list-snapshot.html` (taken from 0.1.0-rc.2); `FormActions`, `FormSubmitButton`, `AddEntityButton`, `EntityListBulkBar` and the headers without the props of 0.1.0-rc.6 equal `form-actions-snapshot.html` (taken from 0.1.0-rc.5); `WriteAccessProvider` disables the write controls; a status map's translation context reaches `StatusBadge`; the showcase renders (light, dark, every section) and its coverage list matches the exports; the `./workers`, `./translations`, `./issues`, `./database` and `./crons` screens render on the sample payloads and write access disables their writes; the shell renders from one navigation (sidebar, breadcrumbs, title, rights predicate) |
| `node scripts/build-i18n-manifest.mjs [--check]` (`pnpm i18n:manifest`) | regenerates `i18n-keys.json` from the source and `i18n/hints.json`; run it after changing a text or the version |
| `node scripts/check-tokens.mjs <css> [tokens.json]` | the host check above (shipped as `ddd-admin-ui-check-tokens`) |
| `node scripts/check-radix.mjs [host folder]` | the Radix copy check above (shipped as `ddd-admin-ui-check-radix`) |
| `node scripts/check-contrast.mjs <css> [tokens.json]` | the contrast check above (shipped as `ddd-admin-ui-check-contrast`) |

Source files import each other with explicit `.ts` / `.tsx` extensions and never through a directory. The consumer
tests (`test/consumer/run.sh <tarball> <npm|pnpm> <workDir>`) install the packed tarball into a project without the
optional peers and into a Next 16 app, and check imports, strict type checks, the production build and CSS, hydration,
form labels across entries, nested overlays, form dialogs, the save shortcut, header slots, confirmations and the
shell (collapse, shortcut, mobile menu, breadcrumbs, title, RTL) in headless Chrome.

## License

MIT
