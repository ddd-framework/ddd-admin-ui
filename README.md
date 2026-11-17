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
| `./i18n` | the UI text store (`m`, `translateText`, `setTranslations`), `useTranslate`, `<Translate>`, number / date formats of the UI locale, server-message translation | — |
| `./primitives` | buttons, inputs, selects, dialogs, sheets, popovers, menus, tooltips, tables, badges, `SegmentedControl`, `cn`, the portal container, the link component and pathname hook contexts, the header slot of form actions (`FormActionsSlotProvider`, `FormActionsSlot`) | `./i18n` |
| `./list` | entity list card, toolbar, search, filters, table, grid, load-more, status badge, cells, multi-select, combobox, bulk bar, column factories (`textColumn`, `moneyColumn`, `actionsColumn`, …), the toolbar's filter toggle, count and clear as blocks | logic, i18n, primitives |
| `./page` | page header and frame, `EntityListPage`, detail shell and header, tabs, section header, definition list, page toolbar, editable card, status callout, entity metadata, route states (`RouteError`, `RouteLoading`), `MaintenanceActionCard` | logic, i18n, primitives; from list only `EmptyValue`, `EntityListEmpty`, `EntityListCard` |
| `./form` | `Form`, `FormField`, `FormSection`, `FormActions`, `FormDrawer`, `FormDialog`, `FormHeader`, `FormWrapper`, `FormJumpBar`, `FormErrors`, `FormSubmitButton`, `useConfirmDialog`, `ColorValueField` | logic, i18n, primitives; from page only `DetailHeader`, `EntityMetadata` |
| `./translations` | `TranslatableInput`, `TranslatableMarkdown` (editor injected), their form-bound variants, `TranslationControls`, `focusFirstOverLimitTranslation`; the admin screens on the host's api (`createTranslationsApi`): `AppTranslationsScreen` with `AppTranslationKeyDrawer` and `TranslationCompleteness`, `LanguagesScreen`, `LocalesScreen`, `ConfigImportCard`, `useEntityTranslator`, `useContentLocales` | logic, i18n, primitives, list, page; from form only `fieldLabels`, `useConfirmDialog`, `Form`, `FormActions`, `FormDrawer`, `FormField`, `FormSubmitButton` |
| `./workers` | the screens of the worker monitoring on the host's api (`createWorkersApi`): `WorkersOverviewScreen`, `WorkerTransportScreen` and their parts (tiles, live panel, throughput and transport tables, history charts as SVG, message runs, processes, restart request), the status maps, the payload types | logic, i18n, primitives, list, page |
| `./media` | `MediaItemField`, `FormMediaItemField`, `MediaItemPickerDialog`, `MediaPreview`, `ImageCropDialog` (crop surface: file and aspect options in; cropped blob, skip or cancel out) | logic, i18n, primitives, list, form |
| `./glass` | `GlassPill`, `QuickFilterPills`, `CollapsibleCard`, `GlassGroup`, `ActionRow` | logic, i18n, primitives |
| `./shell` | the application frame `AppShell` (top bar with slots, sidebar with groups, badges and locks, the icon rail and its `[` shortcut, the mobile menu, the content frame), `ShellBreadcrumbs`, `ShellDocumentTitle`, `AccountMenu`, `LanguageMenu`, their parts and hooks (`useSidebarCollapsed`, `useShellShortcut`) | logic, i18n, primitives |
| `./shell-background` | `ShaderBackground`: the animated WebGL background (loaded lazily; a host that does not import the entry pays nothing) | — |
| `./provider` | `AdminUiProvider` (also the dialog behind `useConfirm`), `useAdminUi`, `defaultStorageKey` | logic, i18n, primitives; types only from media and translations |
| `./next` | Next.js adapters: `useNextUrlStateAdapter`, `useNextDrawerUrlAdapter`, `useNextPathname`, `useListViewParam`, the one URL writer (`queueSearchParamsWrite`) | logic, provider; the only entry importing `next/*` |
| `./notify-sonner` | `sonnerNotifications` (the notification adapter on `sonner`) and its `Toaster` | logic; the only entry importing `sonner` |
| `./showcase` | `Showcase`: a development page drawing every block in the host theme, light and dark, one section per entry, the host's sections appended; `SHOWCASE_COVERAGE`; the sample payloads of the screens (`showcaseWorkersData`, `showcaseTranslationsData`) | logic, i18n, primitives, list, page, form, translations, media, glass, data, workers, shell, shell-background; never `./next`, `./notify-sonner` or `./markdown` (its section loads through `loadMarkdown`) |
| `./data` | key figures: `MetricTile` (label, value, delta, hint, sparkline slot, skeleton), `MetricTileSkeleton`, `MetricGrid`, `DeltaText`, `NoteList`, the delta helpers `resolveDelta`, `relativeChange`, `deltaDirectionOf`, `deltaToneOf` | logic, i18n, primitives |
| `./markdown` | `MarkdownEditor`, `MarkdownPreview` (sanitised), `renderMarkdownEditor` (the `renderEditor` slot of `./translations` and `AdminUiProvider.renderMarkdownEditor`); loads `@uiw/react-md-editor` and `rehype-sanitize` after hydration | logic, i18n, primitives; translations type-only; the only entry reaching its optional peers |
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
   [`tokens.json`](./tokens.json): the 31 colour roles, `--nav-h`, `--content-max`, `--radius`, the surface and glass
   alphas and shadows, `--glass-control-shadow`. Dark mode is a `.dark` class on an ancestor; the default border
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

   The package lists the light status pairs (`success` on `card`, and `success`, `warning`, `destructive`, `info` on
   their 15 % tints): status colours used as text or on their tint, themed by each host, until an emphasis role exists.

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

## Dates in native inputs

`<input type="date">` and `type="datetime-local"` hold wall-clock text. Translate it with an explicit zone, `'local'`
(the browser's clock) or `'utc'`: `toDateInputValue(date, zone)` / `fromDateInputValue(text, zone)` and
`toDateTimeInputValue` / `fromDateTimeInputValue` (`./logic`). Empty or invalid gives `''` / `null`; no arithmetic. A
local time skipped when the clocks go forward resolves an hour later, a repeated one to its first occurrence.

## Screens on the host's API

`./workers` and `./translations` bring whole admin screens for endpoints of the framework. They never import a host
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
```

A second call with the same api and prefix returns the first result. The cache tags are the entry's own
(`AdminUiWorkers`, `AdminUiAppTranslations`, `AdminUiLanguages`, `AdminUiLocales`); a write invalidates what it
changes. The screens follow the host's setup: links through `AdminUiProvider.linkComponent`, writes (restart,
generation, toggles, imports, saves) disabled under `WriteAccessProvider` with its reason, confirmations through
`useConfirm`, toasts through `notify`. Filters, tabs, windows and the drawer live in the URL when the host passes its
adapters (`urlStateAdapter`, `drawerUrlAdapter`), in component state otherwise. `createStaticWorkersApi` /
`createStaticTranslationsApi` answer fixed payloads (the showcase's `showcaseWorkersData` /
`showcaseTranslationsData`) for design reviews and tests.

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
| `useRestartMutation` | `POST /restart` with `{}` or `{ transport }` (invalidates the live reads) |

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

The overview refreshes every 10 s and the history every minute while the tab is visible; the only action is the
restart request (no scaling control). The charts are SVG drawn by the entry (no chart library, no optional peer), in
the colour roles of `tokens.json`; a step without a reading is a gap, never a 0.

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
`useTranslationRunner` (`./logic`); `useContentLocales(translationsApi, { fallback })` gives the content locale keys of
the active locales. `ConfigImportCard` is a `MaintenanceActionCard` (`./page`): title, description, run, the outcome of
the last run.

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

0.x: each minor may break. Pin the exact version while the package is in 0.x (`"@mgamadeus/ddd-admin-ui": "0.2.0"`,
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
| `pnpm test:render` | server-renders list tables, bodies and badges from the build: without the optional table props the markup equals `test/consumer/fixtures/plain/list-snapshot.html` (taken from 0.1.0-rc.2); `FormActions`, `FormSubmitButton`, `AddEntityButton`, `EntityListBulkBar` and the headers without the props of 0.1.0-rc.6 equal `form-actions-snapshot.html` (taken from 0.1.0-rc.5); `WriteAccessProvider` disables the write controls; a status map's translation context reaches `StatusBadge`; the showcase renders (light, dark, every section) and its coverage list matches the exports; the `./workers` and `./translations` screens render on the sample payloads and write access disables their writes; the shell renders from one navigation (sidebar, breadcrumbs, title, rights predicate) |
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
