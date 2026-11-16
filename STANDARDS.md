# STANDARDS — how every list and detail screen is built

One presentation everywhere: a screen keeps its data and behaviour and takes its look from the blocks. Delete the
local copy when you adopt a block; never keep a screen-local `FilterField`, `Muted`, `StatusBadge`, tab shell, date
helper or checkbox column. Request bodies and filter strings stay exactly as they are.

Where the names below come from (setup and the entry list: [`README.md`](./README.md)):

| Entry | Names used here |
|---|---|
| `@mgamadeus/ddd-admin-ui/logic` | `useUrlListState`, `useRowSelection`, `useEntityDrawer`, `drawerKey`, `defineStatusMap`, `formatDate`, `formatDateTime`, `runSequentialWithSummary`, `nextListSort`, `parseListSort`, `formatListSort` |
| `@mgamadeus/ddd-admin-ui/list` | `EntityListToolbar`, `EntityListBody`, `EntityListTable`, `EntityListViewToggle`, `EntityListBulkBar`, `FilterPanel`, `FilterText`, `FilterSelect`, `FilterMultiSelect`, `FilterDateRange`, `YES_NO_FILTER_OPTIONS`, `StatusBadge`, `IdCell`, `DateCell`, `BooleanCell`, `ImageCell`, `EmptyValue`, `orEmpty`, `MultiSelect`, `ChipToggleGroup`, `Combobox`, `Tag` |
| `@mgamadeus/ddd-admin-ui/page` | `EntityListPage`, `PageToolbar`, `ExportButton`, `AddEntityButton`, `EntityDetailShell`, `SectionHeader`, `DefinitionList`, `EditableCard`, `IconValue`, `IconValueRow`, `PageSections`, `CardGrid`, `PageFrame`, `PageHeader` |
| `@mgamadeus/ddd-admin-ui/form` | `FormDrawer`, `FormActions`, `FormField`, `FormSection`, `useConfirmDialog` |
| `@mgamadeus/ddd-admin-ui/glass` | `QuickFilterPills`, `CollapsibleCard`, `GlassGroup`, `ActionRow` |
| `@mgamadeus/ddd-admin-ui/primitives` | `Button`, `Card`, `CardContent` |
| `@mgamadeus/ddd-admin-ui/next` | `useNextUrlStateAdapter`, `useNextDrawerUrlAdapter`, `useListViewParam` |

Every screen renders below `AdminUiProvider`.

## 1. List state — `useUrlListState`

One hook for search + filters, in the URL, 350 ms debounce. Keys = URL parameter names, a module constant.

```tsx
import { useUrlListState } from '@mgamadeus/ddd-admin-ui/logic';
import { useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';   // or the host's own `UrlStateAdapter`

const LIST_KEYS = ['q', 'workspaceId', 'status', 'createdFrom', 'createdTo'] as const;

const list = useUrlListState(LIST_KEYS, { adapter: useNextUrlStateAdapter({ listId: 'admin.projects' }), uncounted: ['q'] });
// inputs:   list.values.q / list.setValue('q', value)
// request:  build the filter string from list.debounced (never from list.values)
// multi:    list.getList('status') / list.setList('status', next)  → `?status=RUNNING,PAUSED`
// reset:    list.clear()   counts: list.activeFilterCount (panel), list.isActive (empty state)
```

The screen renders inside `<Suspense>`. Build filters with the `@mgamadeus/ddd-web/query` builders.
`listId` is the list's stable id (a module constant) under which the host adapter remembers the list: e.g. the view in
localStorage, the filters in this tab's sessionStorage.

## 2. Toolbar and filters

Search left, Filters toggle with count, one "Clear filters", scope pickers in `trailing`, view toggle last, bulk bar
below. Filters go **only** in the panel (never in `trailing`, never as an inline header row).

```tsx
<EntityListToolbar
  search={{ value: list.values.q, onChange: value => list.setValue('q', value), placeholder: 'Search name or ID' }}
  filters={
    <FilterPanel>
      <FilterText label="ID" inputMode="numeric" value={list.values.id} onChange={value => list.setValue('id', value)} />
      <FilterSelect label="Workspace" allLabel="All workspaces" options={workspaceOptions} value={list.values.workspaceId}
        onChange={value => list.setValue('workspaceId', value)} />
      <FilterMultiSelect label="Status" options={STATUS_OPTIONS} value={list.getList('status')}
        onChange={next => list.setList('status', next)} />
      <FilterDateRange label="Created" from={list.values.createdFrom} to={list.values.createdTo}
        onFromChange={value => list.setValue('createdFrom', value)} onToChange={value => list.setValue('createdTo', value)} />
    </FilterPanel>
  }
  activeFilterCount={list.activeFilterCount}
  onClearFilters={list.clear}
  viewToggle={<EntityListViewToggle displayMode={displayMode} onDisplayModeChange={setDisplayMode} />}
  bulkBar={bulkBar}
/>
```

- `FilterSelect`: `''` = All (`allLabel`), searchable automatically from 10 options (`searchable` to force).
- Yes / No filters: `options={YES_NO_FILTER_OPTIONS}` (`'1'` / `'0'`).
- Body: `isSearchActive={list.isActive}` and `onClearSearch={list.clear}` on `EntityListBody`.
- A view that owns its data and states (a tree with its own query): `EntityListBody.renderOwnView(mode)`, drawn in the
  card as is. While an own view is shown the host omits search, filters and clear from the toolbar.
- Search modes (e.g. an AI search next to the text search): the mode switch goes in `search.leading` (it replaces the
  magnifier at the same spot, ≤ 24 px), Enter / Escape in `search.onKeyDown`. Never lay a control over the field from
  outside.

## 3. Page toolbar (header actions)

Order: outline secondaries → `ExportButton` → `MoreActionsMenu` (rare / maintenance) → **one** primary
`AddEntityButton` ("Add <Entity>", singular, top right; `label` replaces the whole text when an entity name does not
fit, already translated). Every write control `disabled={!writesAllowed}`.

```tsx
<EntityListPage
  title="Projects"
  headerActions={
    <PageToolbar
      exportAction={<ExportButton onExport={handleExport} disabled={!writesAllowed} />}
      moreActions={[{ id: 'recalc', label: 'Recalculate totals', icon: <RefreshCw />, onSelect: handleRecalc,
        disabled: !writesAllowed }]}
      primaryAction={<AddEntityButton entity="Project" href="/projects/create" linkComponent={Link}
        disabled={!writesAllowed} />}
    >
      <Button variant="outline" onClick={openImport}>Import</Button>
    </PageToolbar>
  }
  toolbar={…}
>
```

`ExportButton` label defaults to "Export to Excel"; a returned promise shows the spinner.

## 4. Selection and bulk actions

```tsx
const selection = useRowSelection({
  items: list.items,                       // useGrowingWindowList().items
  getKey: task => toNumericId(task.id),  // a host helper
  resetKey: filterString ?? '',            // new filters → empty selection
  disabled: busy,
});

const handleBulkDelete = async () => {
  if (!writesAllowed || !(await confirm({ title: `Delete ${selection.count} task(s)?`, confirmVariant: 'destructive',
    confirmLabel: 'Delete' }))) return;
  setBusy(true);
  await runSequentialWithSummary(selection.selectedKeys, id => deleteTask({ taskId: id }).unwrap(),
    { progress: 'Deleting', done: 'Deleted', noun: 'task' });
  setBusy(false);
  selection.clear();
};

const bulkBar = (
  <EntityListBulkBar
    selection={selection}
    actions={[{ id: 'recreate', label: 'Recreate', icon: <RotateCcw />, onClick: handleBulkRecreate }]}
    onDelete={handleBulkDelete}
    disabled={!writesAllowed}
    busy={busy}
  />
);

<EntityListBody … selection={selection} />
```

Never a hand-made checkbox column, never `Promise.all` for bulk writes. A job that needs a result summary or a typed
confirmation uses the host's dialogs.

## 5. Columns and cells

Order: [select] → image → **ID** → name (link) → relations → type / attributes → **Status** → flags → Start / End →
**Created / Updated** → **Actions**. Title Case headers. Every table with a detail route sets `rowAction`.

```tsx
const columns: EntityListColumn<Project>[] = [
  { id: 'image', header: 'Image', cell: c => <ImageCell src={mediaSizedUrl(c.coverImage?.publicUrl, 'SMALL')} alt="" />,
    className: 'w-16' },
  { id: 'id', header: 'ID', cell: c => <IdCell id={c.id} copyable />, className: 'w-20' },
  { id: 'name', header: 'Name', cell: c => <Link href={projectRoute(c.id)} className="font-medium hover:underline">
    {c.name}</Link> },
  { id: 'workspace', header: 'Workspace', cell: c => orEmpty(c.workspace?.name) },
  { id: 'status', header: 'Status', cell: c => <StatusBadge value={c.status} map={PROJECT_STATUS} /> },
  { id: 'archived', header: 'Archived', cell: c => <BooleanCell value={c.archived} /> },
  { id: 'start', header: 'Start', cell: c => <DateCell value={c.startDate} format="date" /> },
  { id: 'created', header: 'Created', cell: c => <DateCell value={c.changeHistory?.createdTime} /> },
  { id: 'updated', header: 'Updated', cell: c => <DateCell value={c.changeHistory?.modifiedTime} /> },
  { id: 'actions', header: <span className="sr-only">Actions</span>, className: 'w-24 text-right', cell: c => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.name}`} …><Pencil /></Button>
      <Button variant="ghost" size="icon-sm" aria-label={`Delete ${c.name}`} className="text-destructive"
        disabled={!writesAllowed} …><Trash2 /></Button>
    </div>
  ) },
];
```

- Empty = `<EmptyValue />` / `orEmpty(value)` → `—`. Never `-`, `N/A`, `''` or a local `Muted`.
- Dates: `DateCell` in tables, `formatDateTime` / `formatDate` in text. Never raw strings, never
  `toLocaleString()`, never `new Date(value)`.
- Numbers and ids: the host's formatters (one per kind), never ad-hoc `toFixed` calls.
- Copy next to a value outside the ID column: a copy button on `useCopyToClipboard`.

### Wide tables: tracks, pins, sort, row index

All optional; a table that uses none of them keeps the content-sized layout.

```tsx
const [sort, setSort] = useState<EntityListSort | null>(() => parseListSort(list.values.sort, ['name', 'created']));
// or in the URL list state: list.setValue('sort', formatListSort(next))

const columns: EntityListColumn<Project>[] = [
  { id: 'id', header: 'ID', cell: c => <IdCell id={c.id} />, width: '96px', pin: 'start', sortKey: 'id' },
  { id: 'name', header: 'Name', cell: c => c.name, width: '2fr', minWidth: 200, sortKey: 'name' },
  { id: 'owner', header: 'Owner', cell: c => orEmpty(c.owner?.name), width: '1fr' },
  { id: 'created', header: 'Created', cell: c => <DateCell value={c.changeHistory?.createdTime} />, width: '160px',
    sortKey: 'created' },
  { id: 'actions', header: <span className="sr-only">Actions</span>, cell: c => <RowActions project={c} />,
    width: '96px', pin: 'end', align: 'end' },
];

<EntityListBody … columns={columns} sort={sort} onSortChange={setSort} showRowIndex selection={selection} />
```

- **Tracks.** One column with `width` gives every column a track (default `1fr`): share columns (`'2fr'`) divide the
  free width and never go below `minWidth` (default 120 px), fixed columns (`'120px'`) keep their length. When the
  minimums exceed the visible width the table scrolls sideways inside its card; the page never does. In a table with
  tracks a width class in `className` does not size the column, and cell text wraps inside its track.
- **Pins.** `pin: 'end'` always holds (a row's actions). `pin: 'start'` is a request: honoured only while the table
  overflows (by 120 px or more) and the pinned columns take less than a third of the visible width; otherwise the column
  scrolls like the others. The selection column and the row index always pin in a table that uses tracks, pins or the
  row index. A pinned cell paints the card surface and its edge only while content scrolls under it.
- **Sort.** `sortKey` makes the header a button (with `aria-sort` on the sorted header); a click moves the sort on: not
  sorted → ascending → descending → not sorted (`null`: the request's default order). The table never sorts rows
  itself; the screen maps the key to its request. One sort at a time; keep it in the URL list state as one value
  (`formatListSort` / `parseListSort`, `key:asc`).
- **Row index.** `showRowIndex`: a leading `#` column, 1-based among the loaded rows.
- `align: 'center' | 'end'` aligns header and cells (numbers and actions `end`).

## 6. Status badges

One family map per enum, defined once in the host with `defineStatusMap` (e.g. `PROJECT_STATUS`, `SYNC_STATUS` +
a `syncStatusOf` mapper for a boolean). A new enum gets a map there.

```tsx
<StatusBadge value={task.status} map={TASK_STATUS} />
<StatusBadge value={syncStatusOf(job.succeeded)} map={SYNC_STATUS} />
<StatusBadge tone="highlight" label="Featured" icon={Zap} />   // one-off flag
```

A word that means something else elsewhere (`Failed`, `Open`) gets a translation context, on the map or on one
definition (the definition's wins), and every label is marked with the same context so text exports find the key:

```tsx
const IMPORT_STATUS = defineStatusMap(
  { FAILED: { label: m('Failed', { context: 'import-status' }), tone: 'danger', icon: CircleX }, … },
  { context: 'import-status' },
);
```

Tones: `neutral` not started / inactive · `info` finished / informational · `success` running / active / done ·
`warning` paused / pending / needs action · `danger` failed / cancelled · `highlight` featured flag · `brand` identity.
Always with an icon.

## 7. Multi-select inputs

- Filters: `FilterMultiSelect` (above).
- Forms (roles, teams, languages): `MultiSelect` inside `FormField`; a short fixed set (≤ ~8, fully visible):
  `ChipToggleGroup`.

```tsx
<FormField name="roles" label="Roles">
  {({ field, control, disabled }) => (
    <MultiSelect id={control.id} options={ROLE_OPTIONS} value={field.value} onChange={field.onChange}
      aria-label="Roles" maxChips={Infinity} disabled={disabled} />
  )}
</FormField>

<ChipToggleGroup aria-label="Supported Languages" options={localeOptions} value={value} onChange={onChange} />
<ChipToggleGroup mode="single" aria-label="Interval" options={INTERVALS} value={interval} onChange={setInterval} />
```

Single searchable select (not a filter): `Combobox`.

## 8. Detail screens — `EntityDetailShell`

Every entity detail uses the shell: back + centred title + description + actions, `EntityMetadata` (ID, Created,
Updated), centred segmented route tabs, loading and error. Full width (§ 10); the header is `DetailHeader`, `nested`
inside another shell.

```tsx
export const ProjectShell = ({ projectId, children }: ProjectShellProps) => {
  const pathname = usePathname();
  const query = useProjectQuery(projectId);
  const project = query.data?.project;
  return (
    <EntityDetailShell
      title={project?.name}
      fallbackTitle={`Project #${projectId}`}
      description={project?.workspace?.name}
      back={{ href: '/projects', label: 'Back to projects' }}
      linkComponent={Link}
      metadata={{ id: project?.id, changeHistory: project?.changeHistory }}
      tabs={PROJECT_TABS.map(tab => ({ id: tab.segment, label: tab.label, href: projectRoute(projectId, tab.segment) }))}
      currentPath={pathname}
      tabsLabel="Project sections"
      isLoading={query.isLoading}
      error={!query.isLoading && !project ? (query.isError ? 'This project could not be loaded.' : 'Project not found.') : undefined}
      actions={<PageToolbar moreActions={…} />}
    >
      {children}
    </EntityDetailShell>
  );
};
```

Inside a tab:

```tsx
<SectionHeader title="Members" description="People working on this project"
  tabs={[{ id: 'people', label: 'People' }, { id: 'teams', label: 'Teams' }]}
  activeTab={tab} onTabSelect={setTab} actions={<ExportButton onExport={exportMembers} />} />

<Card><CardContent>
  <DefinitionList columns={3} items={[
    { label: 'Access Code', value: workspace.accessCode },
    { label: 'Start', value: <DateCell value={workspace.startDate} format="date" /> },
    { label: 'Description', value: workspace.description, wide: true },
  ]} />
</CardContent></Card>
```

Create screens: no `metadata` id yet → the strip renders nothing. Edit screens outside a shell keep
`<EntityMetadata id={…} changeHistory={…} />` right under their `FormHeader`.

## 9. Host-specific shared components

Host-specific shared components (the markdown editor passed to `FormTranslatableMarkdown` as `renderEditor`, a
colour input, copy buttons, dialogs, number / id formatters) are documented by the host; the blocks take them as props
or render slots and never import them.

## 10. Clouds look — surfaces, tabs, titles, read-first cards

The look lives in the blocks; a screen never re-draws it.

- **No main panel.** Page titles and toolbars sit on the cloud background; content goes into cards. Never wrap a page
  in a big white box, never hand-draw `rounded-xl border bg-card` — use `Card` (primitives), `FormSection`,
  `EditableCard` or, for a custom frame (a chat column, a map), the `.surface rounded-2xl` classes.
- **Surfaces** are translucent (88 %) with a 12 px blur and the soft three-layer shadow, no border. Nested surfaces
  drop the blur by themselves. Menus, popovers, dialogs and sheets stay opaque.
- **Widths and inset** come from the shell: every page is full width at the one page inset
  (`PAGE_INSET_CLASS`, shared by the shell column, `PageFrame` and `EntityListPage`); only a one-column `FormWrapper`
  (narrow) stays `max-w-2xl` — its `FormHeader` sits outside the wrapper. Never add a page-level `max-w-*`, never a
  hand-made `data-page-frame` / `--app-gap` frame (use `PageFrame`).
- **Headers**: `PageHeader` (lists, dashboards, maintenance, frames) or `DetailHeader` (via `EntityDetailShell` /
  `FormHeader`: details and form pages). Inside another entity's shell pass `nested` (an `h2`). Never a raw `h1`.
- **List cards**: every list — page or detail tab — is an `EntityListCard` (`label`, `toolbar`, body); never a
  `section.surface` with a hand-made toolbar row. Header → card gap comes from `SectionHeader` (never `className="mb-0"`
  in a `space-y-*` stack: it removes the gap).
- **Tabs** are the segmented pill control: `EntityDetailShell` centres them under the centred title; standalone tab
  bars use `EntityTabs` as is; sub-tabs of a section are `SectionHeader tabs`
  (compact). Never a hand-made underline or pill bar.
- **Two-tone titles**: wrap the brand part in `<em>` — `title={<>Item <em>Types</em></>}` (pass `label="Item Types"` to
  `EntityListPage` then). Only where a title earns it (Home, section headers), not on every list.
- **Sticky glass bars**: page forms get them from `FormActions` (`sticky={false}` inside a dialog); the bulk bar from
  `EntityListBulkBar`.

```tsx
<PageSections>
  <section>
    <SectionHeader title={<>General <em>settings</em></>} />
    <CardGrid>
      <EditableCard title="Access" onEdit={openAccessForm} editLabel="Edit access" editDisabled={!writesAllowed}>
        <IconValueRow>
          <IconValue icon={<KeyRound />}>{workspace.accessCode ?? <EmptyValue />}</IconValue>
          <IconValue icon={<Calendar />}><DateCell value={workspace.startDate} format="date" /></IconValue>
        </IconValueRow>
      </EditableCard>
      <EditableCard title="Languages" onEdit={openLanguagesForm} editLabel="Edit languages" editDisabled={!writesAllowed}>
        <div className="flex flex-wrap gap-2">
          {locales.map(locale => <Tag key={locale} tone={locale === defaultLocale ? 'primary' : 'default'}>{locale}</Tag>)}
        </div>
      </EditableCard>
    </CardGrid>
  </section>
</PageSections>
```

## 11. Glass tone — quick filters, collapsible cards, group panels

Blocks in `glass/`.

```tsx
// Status quick filters on the clouds: the same list key as the panel's Status field.
<EntityListPage
  belowHeader={
    <QuickFilterPills aria-label="Status quick filters" allLabel="All Statuses" options={STATUS_OPTIONS}
      value={list.values.status} onChange={value => list.setValue('status', value)} />
  }
  …
/>
// multi: mode="multi" value={list.getList('status')} onChange={next => list.setList('status', next)}

// A collapsible group inside a form card (fields stay mounted unless `forceMount={false}`).
<CollapsibleCard density="compact" defaultOpen={false} title="Primary" description="Buttons, links…"
  meta={<span className="size-6 rounded-md border" style={{ backgroundColor: preview }} />}>
  …fields…
</CollapsibleCard>

// A grouped to-do list on the clouds: glass group (no shadow) + solid rows.
<GlassGroup title="Running" count={cards.length} limit={8} emptyText="No tasks">
  {cards.map(card => (
    <Link key={card.id} href={…}><ActionRow as="span" interactive title={card.name} description={card.context}
      tone={TASK_STATUS[card.status].tone} toneLabel={TASK_STATUS[card.status].label} /></Link>
  ))}
</GlassGroup>
```

- Never invent counts for pills; pass `count` only when the screen already has it.
- A glass container (`GlassGroup`, glass `CollapsibleCard`) casts no shadow; its solid rows do.
- Status inside rows and tables stays `StatusBadge`; the `ActionRow` dot is labelled (`toneLabel`).

## 12. Side drawers — `useEntityDrawer` + `FormDrawer`

**Drawer** when all hold: no own tabs or sub-lists · ≤ ~15 fields · edited from its list · no large working surface
(map, conversation, preview + send). **Page** otherwise. Entities with a drawer also create in it (the list's Add
button).

```tsx
// The list screen (inside <Suspense>): drawer state in the URL next to the filters — `?edit=<id>` / `?create=1`.
const drawer = useEntityDrawer({ adapter: useNextDrawerUrlAdapter() });   // ./next, or the host's own adapter

<AddEntityButton entity="Supplier" onClick={drawer.openCreate} disabled={!writesAllowed} />
rowAction={supplier => () => drawer.openEdit(id)}
<Link href={supplierEditRoute(id)} onClick={drawer.editLinkClick(id)}>{supplier.name}</Link>   // middle click = new tab
<SupplierFormDrawer drawer={drawer} />

// The module's drawer: loads the entity for the header, renders the existing form inside.
const shown = drawer.shown;                                   // stays set while the close animation runs
const id = shown?.mode === 'edit' ? shown.id : undefined;
const query = useGet…Query({ …, id: id ?? '' }, { skip: id === undefined });
const entity = id ? (query.currentData?.supplier ?? null) : null;   // currentData: never the previous row's
<FormDrawer open={drawer.isOpen} onClose={drawer.close} title={entity?.name ?? `Supplier #${id}`}
  metadata={entity ? { id: entity.id, changeHistory: entity.changeHistory } : undefined}>
  <SupplierForm key={drawerKey(shown)} supplier={entity} onClose={drawer.close} />
</FormDrawer>
```

- **One form, no copy.** The page form takes `onClose` instead of routing: Cancel = `confirmDiscard()` then
  `onClose()`; a save resets the form's baseline (`form.reset(values, { keepValues: true })`), toasts and calls
  `onClose()`. `FormActions` moves into the drawer's pinned footer by itself (change status left, buttons right); the
  ✕, Esc and an overlay click ask "Discard changes?" through `useUnsavedChangesGuard`. Request bodies stay as they are.
- **Header**: entity title + `EntityMetadata variant="inline"` (ID · Created · Updated, one line) via `metadata`;
  create passes a `description` instead. Entity actions that are no save (e.g. "Open as customer", "Reset password")
  go into `headerActions` (outline `sm` buttons at the right end of the header); the save stays in the footer.
- **History**: opening pushes an entry (Back closes the drawer); `close()` pops it when this page opened the drawer and
  removes the parameter otherwise (a link, a reload). A create that turns into the new entity's edit uses
  `openEdit(newId, { replace: true })`. The writes are shallow (`history.pushState`): the list stays mounted.
- **Detail routes** (`/<entity>/:id`, `/create`) can stay as redirects to the list with the parameter. Route helpers
  (`supplierEditRoute`) live in a non-client file (a server page calls them).
- A list hosting two drawers passes its own `editKey` / `createKey`.
- **Confirm**: the drawer asks through the package dialog; a host with its own confirmation service passes
  `confirm={hostConfirm}` (stable function, same Radix copy). The same prop exists on the translatable fields.
- One column inside the drawer (≤ 760 px): no `md:grid-cols-2` form grids.
