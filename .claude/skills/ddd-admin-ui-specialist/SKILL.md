---
name: ddd-admin-ui-specialist
description: "Build admin screens with @mgamadeus/ddd-admin-ui and extend the package. Covers entries and import matrix, host setup (AdminUiProvider above every page, theme.css and components.css, tokens.json with ddd-admin-ui-check-tokens, one Radix copy with ddd-admin-ui-check-radix), list pages with URL filters, grid/table view, selection and bulk actions, wide tables (column tracks, pins, sortable headers, row index), detail shells, form drawers with conditions, server errors and the unsaved-changes guard, translations on full locale::style keys, media fields, toasts, layers, the portal container, the text manifest i18n-keys.json and text contexts, server vs client files, and adding a block. Use when building or reviewing a list, detail or form screen with these blocks, a page fails with Tooltip must be used within TooltipProvider, a wide table squeezes or needs pinned columns or sorting, a colour, layer or overlay misbehaves, translations lose a style variant, URL filters get lost, or a block is added."
metadata:
  author: mgamadeus
  version: 0.1.0
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
| the sort in the URL | `formatListSort` / `parseListSort` / `nextListSort` (`key:asc`) | logic |
| a view that loads its own data (a tree) in the list card | `EntityListBody.renderOwnView` | list |
| an entity detail with tabs | `EntityDetailShell` (+ `SectionHeader`, `DefinitionList`) | page |
| a form page or drawer | `Form` + `FormField` / `FormSection` + `FormActions`, in `FormDrawer` | form |
| drawer state in the URL (`?edit=<id>`, `?create=1`) | `useEntityDrawer` with `useNextDrawerUrlAdapter` | logic, next |
| a text per content locale | `useEntityTranslations` + `FormTranslatableInput` / `FormTranslatableMarkdown` | logic, translations |
| a media reference | `FormMediaItemField` (+ the host's `MediaItemPickerDialog`) | media |
| a confirmation | `useConfirmDialog` (returns `{ confirm, dialog }`) | form |
| a toast | `notify.success / info / error / loading / submitError` | logic |

## Rules that fail silently

- **Provider above every page.** `AdminUiProvider` renders the tooltip provider, the portal container and registers
  the notification adapter. Without it a date cell throws ("`Tooltip` must be used within `TooltipProvider`") and
  `notify` does nothing (one warning outside production).
- **CSS and tokens.** `theme.css` and `components.css` after `@import 'tailwindcss'`; every property of `tokens.json`
  on `:root` (themed ones also under `.dark`). Run `ddd-admin-ui-check-tokens <built css>` after a theme change: a
  missing colour role means a utility without a rule, so the element is simply transparent.
- **One Radix copy.** `radix-ui` is a peer; single `@radix-ui/*` packages of the host match the versions `radix-ui`
  pins. Two copies of one Radix package keep separate focus traps and outside-click layers (an overlay closes the wrong
  one, focus jumps). Run `ddd-admin-ui-check-radix` in the host after dependency changes.
- **Layers.** Overlays stack with `z-(--layer-overlay)` and `z-(--layer-popover)` (both 50 by default; a later portal
  paints on top), sticky bars with `--layer-sticky` (20), sticky headers with `--layer-raised` (10). A host raises them
  on `:root`; `PortalContainerProvider` / the provider's `portalContainer` moves every portal.
- **Import boundary.** Blocks import only the entries the matrix in `README.md` allows, never app code. Only `./next`
  imports `next/*`, only `./notify-sonner` imports `sonner`; `./logic` pure files run without React.
- **Translation keys.** Keys are full `locale::style` (`de::FORMAL`, `de::INFORMAL`). Never collapse them to the
  language: the payload of `useEntityTranslations` sends every loaded key back; a cleared text removes its key.
- **URL state.** Build requests from `list.debounced`, never `list.values`. All writes (filters, view, drawer) go
  through the one URL writer, so writes in the same tick merge; never `router.replace` the search parameters by hand.
  Screens reading search parameters render inside `<Suspense>`.
- **Wide tables.** Tracks are opt-in per table: one `width` gives every column a track (default `1fr`, minimum 120
  px); the table then scrolls sideways inside its card instead of squeezing. `pin: 'end'` always holds; `pin: 'start'`
  only while the table overflows by 120 px or more and the pinned columns stay under a third of the visible width. The
  table never sorts rows: map `sortKey` to the request. Sizes are measured after hydration only.
- **Text contexts are literals.** `m('Failed', { context: 'import-status' })`: extractors (the package manifest and
  host exports) read the text and the context as string literals; a context only on the status map or in a variable is
  not exported. Put the same context on the definition or the map so `StatusBadge` translates with it.
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
const { confirm, dialog } = useConfirmDialog();
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
  {dialog}
</FormDrawer>
```

### Translations and media in one form

```tsx
const tabs = useEntityTranslations({ fields: ['name'], locales: ['en::FORMAL', 'de::FORMAL'], defaultLocale: 'en::FORMAL' });

<Form form={form} onSubmit={save}>
  <FormErrors error={submitError} />
  <FormTranslatableInput<Values> name="translations.name" label="Display name" tabs={tabs} />
  <FormMediaItemField<Values> name="image" label="Image" alt="" onOpenPicker={openPicker} />
</Form>
```

A server violation on `translations.name` shows with the field's label ("Display name: …").

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
