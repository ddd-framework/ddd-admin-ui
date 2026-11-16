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
pnpm add @mgamadeus/ddd-admin-ui @mgamadeus/ddd-web radix-ui react react-dom lucide-react react-hook-form zod
# optional, per entry: next (./next), sonner (./notify-sonner); the host's Tailwind 4 build compiles the CSS
```

## Entries

| Entry | What it holds | May import (besides React and its peers) |
|---|---|---|
| `./logic` | pure helpers (`formatDate`, `defineStatusMap`, conditions, schemas, `notify`, `runSequential`), React hooks without markup (`useUrlListState`, `useEntityDrawer`, `useRowSelection`, `useEntityTranslations`, …), browser helpers (`prepareImageFile`) | `./i18n` |
| `./i18n` | the UI text store (`m`, `translateText`, `setTranslations`), `useTranslate`, `<Translate>`, number / date formats of the UI locale, server-message translation | — |
| `./primitives` | buttons, inputs, selects, dialogs, sheets, popovers, menus, tooltips, tables, badges, `SegmentedControl`, `cn`, the portal container | `./i18n` |
| `./list` | entity list card, toolbar, search, filters, table, grid, load-more, status badge, cells, multi-select, combobox, bulk bar | logic, i18n, primitives |
| `./page` | page header and frame, `EntityListPage`, detail shell and header, tabs, section header, definition list, page toolbar, editable card, status callout, entity metadata | logic, i18n, primitives; from list only `EmptyValue`, `EntityListEmpty`, `EntityListCard` |
| `./form` | `Form`, `FormField`, `FormSection`, `FormActions`, `FormDrawer`, `FormHeader`, `FormWrapper`, `FormJumpBar`, `FormErrors`, `FormSubmitButton`, `useConfirmDialog` | logic, i18n, primitives; from page only `DetailHeader`, `EntityMetadata` |
| `./translations` | `TranslatableInput`, `TranslatableMarkdown` (editor injected), their form-bound variants, `TranslationControls` | logic, i18n, primitives; from form only `fieldLabels`, `useConfirmDialog` |
| `./media` | `MediaItemField`, `FormMediaItemField`, `MediaItemPickerDialog`, `MediaPreview` | logic, i18n, primitives, list, form |
| `./glass` | `GlassPill`, `QuickFilterPills`, `CollapsibleCard`, `GlassGroup`, `ActionRow` | logic, i18n, primitives |
| `./provider` | `AdminUiProvider`, `useAdminUi`, `defaultStorageKey` | logic, i18n, primitives; types only from media and translations |
| `./next` | Next.js adapters: `useNextUrlStateAdapter`, `useNextDrawerUrlAdapter`, `useListViewParam`, the one URL writer (`queueSearchParamsWrite`) | logic, provider; the only entry importing `next/*` |
| `./notify-sonner` | `sonnerNotifications` (the notification adapter on `sonner`) and its `Toaster` | logic; the only entry importing `sonner` |
| `./showcase` | `Showcase`: a development page drawing every block in the host theme, light and dark, one section per entry, the host's sections appended; `SHOWCASE_COVERAGE` | logic, i18n, primitives, list, page, form, translations, media, glass; never `./next` or `./notify-sonner` |
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
| `radix-ui` | peer | `^1.8.1` — one copy per app, as with React (see below) |
| `class-variance-authority`, `cmdk`, `clsx`, `tailwind-merge` | dependencies | imported inside `./primitives` only |

Without `next` or `sonner` every entry except `./next` and `./notify-sonner` imports and type-checks.

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
   colour is the `border` role. `components.css` sets the four `--layer-*` defaults (`raised` 10, `sticky` 20,
   `overlay` 50, `popover` 50) and the two optional properties of `SegmentedControl` (`--segmented-control-radius`
   9999px, `--segmented-control-duration` 200ms) with zero specificity in the lowest cascade layer, so any host value
   wins. Check a built
   stylesheet against the contract:

   ```sh
   npx ddd-admin-ui-check-tokens <built css file or folder> [tokens.json]
   ```

   It names every missing utility, property, `.dark` value, layer default or data attribute, and every colour value
   that does not fit its use. A role property that the stylesheet reads only inside a channel function
   (`hsl(var(--card))`, `rgb(var(--card) / 0.5)`) may hold channels such as `0 0% 100%` (the bridge of a host whose
   theme stores HSL channels); a property read anywhere else (`background-color: var(--card)`, `color-mix()`,
   `light-dark()`, or passed on to another custom property that is read so) must hold a colour.

3. **Provider** above every page. Blocks draw tooltips (a date cell shows the relative time on hover), so a page
   without the provider fails with "`Tooltip` must be used within `TooltipProvider`".

   ```tsx
   'use client';
   import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';
   import { sonnerNotifications, Toaster } from '@mgamadeus/ddd-admin-ui/notify-sonner';
   import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';

   export const Providers = ({ children }: { children: React.ReactNode }) => (
     <AdminUiProvider
       notifications={sonnerNotifications}
       tooltipDelayMs={150}
       useUrlStateAdapter={useNextUrlStateAdapter}
       useDrawerUrlAdapter={useNextDrawerUrlAdapter}
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
   `preserveSearchParams` (search parameters the URL writer never removes). Without a notification adapter `notify.*`
   does nothing and warns once outside production.

4. **Confirmations.** Blocks that ask before a step open the package's confirm dialog (`useConfirmDialog`). A host
   with its own confirmation service passes it as `confirm` (`(options: ConfirmOptions) => Promise<boolean>`, a stable
   function): `FormDrawer` ("Discard changes?") and `TranslatableInput` / `TranslatableMarkdown` and their form-bound
   variants ("Clear all translations?"). The package dialog then does not render. The host's dialog must come from the
   same Radix copy as the blocks (see Peers).

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

0.x: each minor may break. Pin the exact version while the package is in 0.x prereleases; modules peer on the version
they were tested with. Pre-releases (`x.y.z-…`) are published under the `next` dist-tag. Changes per release:
[CHANGELOG.md](CHANGELOG.md).

## Development

```bash
pnpm install
pnpm typecheck
pnpm test                       # unit tests beside the sources, script tests and a failing fixture per check-package rule
pnpm build                      # tsc → dist, declaration specifiers, stylesheets, manifests and shipped scripts
pnpm test:render                # after the build: list snapshot (as in 0.1.0-rc.2), status contexts, the showcase
node scripts/check-package.mjs --dir .
pnpm pack --pack-destination "$TMPDIR" && test/consumer/run.sh "$TMPDIR"/mgamadeus-ddd-admin-ui-*.tgz pnpm "$TMPDIR/consumer-pnpm"
```

| Command | What it does |
|---|---|
| `node scripts/build.mjs` (`pnpm build`) | removes `dist`, `tsc -p tsconfig.build.json` (one JS and declaration file per source file, directives kept, `.js` specifiers), rewrites the declarations' specifiers to `.js`, copies CSS, JSON and the shipped scripts into `dist` |
| `node scripts/check-package.mjs --dir <package root or extracted tarball>` | the 13 package rules: exports and bins, directives, specifiers, no app alias, deny list (`--deny a,b` or `CHECK_PACKAGE_DENY`; `--require-deny-list` on release), declared dependencies, entry edges and reach, module state once, `files` and `sideEffects`, declarations in a strict consumer, no tests, fresh text manifest, tokens |
| `node scripts/tokens-utilities.mjs [--write]` | checks (or regenerates) the `utilities` lists of `tokens.json` from the source |
| `pnpm test:render` | server-renders list tables, bodies and badges from the build: without the optional table props the markup equals `test/consumer/fixtures/plain/list-snapshot.html` (taken from 0.1.0-rc.2); a status map's translation context reaches `StatusBadge`; the showcase renders (light, dark, every section) and its coverage list matches the exports |
| `node scripts/build-i18n-manifest.mjs [--check]` (`pnpm i18n:manifest`) | regenerates `i18n-keys.json` from the source and `i18n/hints.json`; run it after changing a text or the version |
| `node scripts/check-tokens.mjs <css> [tokens.json]` | the host check above (shipped as `ddd-admin-ui-check-tokens`) |
| `node scripts/check-radix.mjs [host folder]` | the Radix copy check above (shipped as `ddd-admin-ui-check-radix`) |

Source files import each other with explicit `.ts` / `.tsx` extensions and never through a directory. The consumer
tests (`test/consumer/run.sh <tarball> <npm|pnpm> <workDir>`) install the packed tarball into a project without the
optional peers and into a Next 16 app, and check imports, strict type checks, the production build and CSS, hydration,
form labels across entries and nested overlays in headless Chrome.

## License

MIT
