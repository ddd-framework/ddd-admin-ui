# Changelog

All notable changes to `@mgamadeus/ddd-admin-ui`. 0.x: each minor may break; pin the exact version while the package
is in 0.x prereleases.

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
