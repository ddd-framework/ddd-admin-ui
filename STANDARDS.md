# STANDARDS — how every list and detail screen is built

One presentation everywhere: a screen keeps its data and behaviour and takes its look from the blocks. Delete the
local copy when you adopt a block; never keep a screen-local `FilterField`, `Muted`, `StatusBadge`, tab shell, date
helper or checkbox column. Request bodies and filter strings stay exactly as they are.

Where the names below come from (setup and the entry list: [`README.md`](./README.md)):

| Entry | Names used here |
|---|---|
| `@mgamadeus/ddd-admin-ui/logic` | `useUrlListState`, `useRowSelection`, `useEntityDrawer`, `drawerKey`, `defineStatusMap`, `formatDate`, `formatDateTime`, `runSequentialWithSummary`, `nextListSort`, `parseListSort`, `formatListSort`, `useConfirm`, `WriteAccessProvider`, `useWriteAccess` |
| `@mgamadeus/ddd-admin-ui/list` | `EntityListToolbar`, `EntityListBody`, `EntityListTable`, `EntityListViewToggle`, `EntityListBulkBar`, `FilterPanel`, `FilterText`, `FilterSelect`, `FilterMultiSelect`, `FilterDateRange`, `YES_NO_FILTER_OPTIONS`, `StatusBadge`, `IdCell`, `DateCell`, `BooleanCell`, `ImageCell`, `EmptyValue`, `orEmpty`, `MultiSelect`, `ChipToggleGroup`, `Combobox`, `Tag` |
| `@mgamadeus/ddd-admin-ui/page` | `EntityListPage`, `PageToolbar`, `ExportButton`, `AddEntityButton`, `EntityDetailShell`, `SectionHeader`, `DefinitionList`, `EditableCard`, `IconValue`, `IconValueRow`, `PageSections`, `CardGrid`, `PageFrame`, `PageHeader`, `MaintenanceActionCard` |
| `@mgamadeus/ddd-admin-ui/form` | `FormDrawer`, `FormDialog`, `FormActions`, `FormField`, `FormSection`, `FormHeader`, `useConfirmDialog` |
| `@mgamadeus/ddd-admin-ui/glass` | `QuickFilterPills`, `CollapsibleCard`, `GlassGroup`, `ActionRow` |
| `@mgamadeus/ddd-admin-ui/primitives` | `Button`, `Card`, `CardContent`, `SegmentedControl`, `FormActionsSlotProvider`, `FormActionsSlot` |
| `@mgamadeus/ddd-admin-ui/workers` | `createWorkersApi`, `WorkersOverviewScreen`, `WorkerTransportScreen` |
| `@mgamadeus/ddd-admin-ui/translations` | `createTranslationsApi`, `AppTranslationsScreen`, `LanguagesScreen`, `LocalesScreen` |
| `@mgamadeus/ddd-admin-ui/issues` | `createIssuesApi`, `IssuesScreen` |
| `@mgamadeus/ddd-admin-ui/database` | `createDatabaseApi`, `SchemaDiffScreen` |
| `@mgamadeus/ddd-admin-ui/crons` | `createCronsApi`, `CronsScreen` |
| `@mgamadeus/ddd-admin-ui/next` | `useNextUrlStateAdapter`, `useNextDrawerUrlAdapter`, `useListViewParam`, `useNextPathname` |
| `@mgamadeus/ddd-admin-ui/shell` | `AppShell`, `ShellBreadcrumbs`, `ShellDocumentTitle`, `AccountMenu`, `LanguageMenu`, `LanguageMenuSub`, `UseEntityLabel` |
| `@mgamadeus/ddd-admin-ui/shell-background` | `ShaderBackground` |
| `@mgamadeus/ddd-admin-ui/data` | `MetricTile`, `MetricGrid`, `DeltaText`, `NoteList`, `relativeChange` |
| `@mgamadeus/ddd-admin-ui/markdown` | `renderMarkdownEditor`, `MarkdownEditor`, `MarkdownPreview` |

Every screen renders below `AdminUiProvider`. A screen that may not write sets that once with `WriteAccessProvider`
(§ 15).

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
fit, already translated). Write controls follow the screen's `WriteAccessProvider` (§ 15); a write the blocks cannot
know (a menu item, a row button) takes `disabled={!writeAccess.allowed}` from `useWriteAccess()`. Reading controls
(Export) stay enabled.

```tsx
const writeAccess = useWriteAccess();     // from the screen's WriteAccessProvider (§ 15)

<EntityListPage
  title="Projects"
  headerActions={
    <PageToolbar
      exportAction={<ExportButton onExport={handleExport} />}
      moreActions={[{ id: 'recalc', label: 'Recalculate totals', icon: <RefreshCw />, onSelect: handleRecalc,
        disabled: !writeAccess.allowed }]}
      primaryAction={<AddEntityButton entity="Project" href="/projects/create" linkComponent={Link} />}
    >
      <Button variant="outline" onClick={openImport}>Import</Button>
    </PageToolbar>
  }
  toolbar={…}
>
```

`ExportButton` label defaults to "Export to Excel"; a returned promise shows the spinner. `AddEntityButton` with `href`
is a link and stays enabled whatever the write access (the create screen guards itself); with `onClick` it is a button
and follows the write access.

## 4. Selection and bulk actions

```tsx
const selection = useRowSelection({
  items: list.items,                       // useGrowingWindowList().items
  getKey: task => toNumericId(task.id),  // a host helper
  resetKey: filterString ?? '',            // new filters → empty selection
  disabled: busy,
  isSelectable: canDelete,                 // optional: other rows get a disabled checkbox, "select all" skips them
});

const confirm = useConfirm();               // the provider's dialog: nothing to render in the screen
const handleBulkDelete = async () => {
  if (!writeAccess.allowed || !(await confirm({ title: `Delete ${selection.count} task(s)?`, confirmVariant: 'destructive',
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
    busy={busy}
  />
);

<EntityListBody … selection={selection} />
```

The bar's actions and Delete follow the write access; an action that only reads (export, copy ids) passes
`ignoreWriteAccess`. Never a hand-made checkbox column, never `Promise.all` for bulk writes. A typed confirmation is
`confirm({ …, requirePhrase: entity.name })`; a job that needs a result summary uses the host's dialogs.

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
        disabled={!writeAccess.allowed} …><Trash2 /></Button>
    </div>
  ) },
];
```

- Empty = `<EmptyValue />` / `orEmpty(value)` → `—`. Never `-`, `N/A`, `''` or a local `Muted`.
- Dates: `DateCell` in tables, `formatDateTime` / `formatDate` in text. Never raw strings, never
  `toLocaleString()`, never `new Date(value)`.
- Numbers and ids: the host's formatters (one per kind), never ad-hoc `toFixed` calls.
- Copy next to a value outside the ID column: `CopyButton` (`value`, `label`, `reveal="hover"` in rows, `notify` for a
  toast).
- A row that looks different (archived, muted): `rowClassName={(item, index) => …}` on the table or body.
- Small lists inside a card or section: `EntityListEmpty size="compact"` (one inline line, no 64 px block).

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
  sorted → ascending → descending → not sorted (`null`: the request's default order). `sortStart: 'desc'` on a column
  starts it descending (dates: newest first); `sortRequired` on the table never returns to unsorted (the third click
  goes back to the first direction). An end-aligned sortable header puts the arrow before the label, so the label lines
  up with the numbers. The table never sorts rows itself; the screen maps the key to its request. One sort at a time;
  keep it in the URL list state as one value (`formatListSort` / `parseListSort`, `key:asc`; `nextListSort` takes the
  same cycle).
- **Row index.** `showRowIndex`: a leading `#` column, 1-based among the loaded rows.
- **Empty state action.** `emptyAction` on the body: one outlined button (size `sm`) under the empty and the no-results
  state, e.g. Add next to "Clear search".
- **Keyboard rows.** `rowKeyboardActivation` (opt-in): a row with a `rowAction` is a tab stop and Enter or Space on the
  focused row runs it. For lists whose rows have no labelled control of their own that opens them; a row with a link
  or an open button needs none.
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

Status text never uses a hand-picked darker shade: the badges, callouts, deltas and field errors read the host's text
roles (`--success-text`, `--warning-text`, `--destructive-text`, `--info-text`; unset = the status colour) and the badge
tints its soft surfaces (`--<status>-soft`; unset = the status colour at 15 %). A host whose status colours are fill
colours sets the text roles once, light and dark (README › Host setup › Status text); a screen keeps
`text-success` / `StatusBadge`.

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

- Long or server-side lists: `onSearch` + `isSearching` with `useLatestSearch` (the block debounces, never shows a stale
  term's options, resets the search on close); a picked value outside the current results passes `selectedOption`.
- `clearable` for an optional value (a clear control; picking the picked option clears it); without it a pick is kept.
  An option whose value is `''` and means something ("No parent") stays an ordinary option.
- Headings with `group`, a count or status after the label with `badge`, a "Create “…”" row with `onRequestCreate`.
- A date range in a toolbar row or table header: `FilterDateRange hideLabel` with `fromLabel` / `toLabel`.

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

A summary card or side panel lists facts as divided rows, label left and value right: `layout="rows"`.

Every link a block renders (tabs, the back link, the Add button, breadcrumb links) goes through the host's link component, set once as
`AdminUiProvider.linkComponent` (a block's own `linkComponent` prop still wins). A host with sticky search parameters
wraps its router link with `withStickyParams(href, names, currentSearch)`.

Edit screens put the form's actions into the header with `formActionsSlot` on the shell: `FormActions` (default
`placement="auto"`) portals there as the pill, after `actions`, and floats under the top bar once the header scrolls
away (while the form is in view); the portalled Save stays linked to its form (`form` attribute), ⌘S still submits.
A nested shell with `formActionsSlot` takes the actions of its own forms. A form page with `FormHeader formActionsSlot`
(or a host header rendering `FormActionsSlot`) wraps header and form in one `FormActionsSlotProvider`; of several
slots the one closest above the form wins. `placement="row"` keeps the actions in the form.

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
- **Sticky glass bars**: page forms get them from `FormActions` (in a header slot when the page has one, § 8; inside a
  dialog the plain row comes by itself); the bulk bar from `EntityListBulkBar`.

```tsx
<PageSections>
  <section>
    <SectionHeader title={<>General <em>settings</em></>} />
    <CardGrid>
      <EditableCard title="Access" onEdit={openAccessForm} editLabel="Edit access" editDisabled={!writeAccess.allowed}>
        <IconValueRow>
          <IconValue icon={<KeyRound />}>{workspace.accessCode ?? <EmptyValue />}</IconValue>
          <IconValue icon={<Calendar />}><DateCell value={workspace.startDate} format="date" /></IconValue>
        </IconValueRow>
      </EditableCard>
      <EditableCard title="Languages" onEdit={openLanguagesForm} editLabel="Edit languages" editDisabled={!writeAccess.allowed}>
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

<AddEntityButton entity="Supplier" onClick={drawer.openCreate} />   // a button: follows the write access
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
  `confirm={hostConfirm}` (stable function, same Radix copy). The same prop exists on the translatable fields. Screen
  code asks with `useConfirm()` (§ 14).
  `ConfirmOptions.description` may be a React node; the package's own confirmations always pass plain text, so a
  service that renders text only can show them.
  A description (`ConfirmOptions`, `FormDialog`, `FormDrawer`, `MediaItemPickerDialog`) may be block content: a string or
  number renders in the `<p>`, anything else in a `<div>` with the same classes and `aria-describedby` wiring.
- One column inside the drawer (≤ 760 px): no `md:grid-cols-2` form grids.

## 13. One value out of a few — `SegmentedControl`

| Need | Use |
|---|---|
| switch what one area shows, without own panels or routes (a period, a scope, a chart metric, a view mode) | `SegmentedControl` (`./primitives`) |
| sections of an entity with their own content or route | `EntityTabs` / `EntityDetailShell` tabs / `SectionHeader tabs` |
| quick filters on the clouds, "All" allowed, counts | `QuickFilterPills` |
| several values on at once (languages, weekdays) | `ChipToggleGroup` (or `MultiSelect` when the set grows) |
| the list's grid / table switch | `EntityListViewToggle` |

```tsx
<SegmentedControl aria-label="Period" value={period} onValueChange={setPeriod} options={[
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month', description: 'Calendar month' },
  { value: 'year', label: 'Year', disabled: !hasYearData, disabledReason: 'Not enough data yet' },
]} />
```

- Always exactly one value; 2–5 short options. More, or long labels: a select.
- `activation="manual"` when a change is expensive (loads data): arrows move the focus, Space / Enter select.
- `iconOnly` keeps the label as the accessible name and shows it as a tooltip (needs `AdminUiProvider`).
- In a row with form controls use `height={36}` (the height of a select trigger).
- On a phone the control keeps its size and scrolls inside itself (the selected and the focused option stay in view);
  with more than three options or long labels prefer `fullWidth` with short labels, or a select.
- Labels are English UI texts, translated by the control (`context` for an ambiguous word, marked as literal
  `m('Open', { context: 'filter' })`); already translated text (names from the server) passes `translate: false`.
- A disabled option says why (`disabledReason`); a count goes in `badge` and, when it matters, in `description`.

## 14. Short forms in a dialog, confirmations — `FormDialog`, `useConfirm`

A form of a few fields that belongs to the screen it is opened from (rename, move, a reason for a delete) is a
`FormDialog`; anything larger is a drawer (§ 12) or a page.

```tsx
const form = useForm<RenameValues>({ defaultValues: { name: item.name } });
const rename = useRenameMutation();

<FormDialog<RenameValues>
  open={open}
  onOpenChange={setOpen}
  title="Rename item"
  form={form}                                   // optional: FormField works inside; without it, plain state
  onSubmit={async values => {
    try { await rename.mutateAsync(values); setOpen(false); } catch (error) { notify.submitError(toFormSubmitError(error, 'Could not save')); }
  }}
  submitLabel="Save"
  pendingLabel="Saving…"
  isPending={rename.isPending}
  isDirty={form.formState.isDirty}             // a close request asks "Discard changes?"
>
  <FormField<RenameValues, 'name'> name="name" label="Name" required>
    {({ field, control }) => <Input {...control} {...field} />}
  </FormField>
</FormDialog>
```

- A real `<form>`: Enter in a text field and ⌘S submit it; a dialog opened from it is its own form.
- While pending (or while the promise `onSubmit` returns runs) Escape, the backdrop and Cancel do nothing. After a
  failed save the handler shows the error and the dialog is usable again; the screen closes it after a success.
- `submitVariant="destructive"` for an irreversible submit, `submitDisabled` while nothing can be saved.

Confirmations ask through the provider: `const confirm = useConfirm()` (`./logic`) and
`if (!(await confirm({ title, description, confirmLabel, confirmVariant: 'destructive' }))) return;`. Nothing renders
in the screen; calls queue and each answers once; the focus returns to the control that asked. A deletion that must
not happen by accident names the entity: `requirePhrase: entity.name` (the confirm button stays off until it is typed,
`requirePhraseLabel` replaces the label). A host with its own confirmation service passes it as
`AdminUiProvider confirm`; `useConfirmDialog` stays for a block that renders its own dialog.

## 15. Write access — `WriteAccessProvider`

```tsx
<WriteAccessProvider value={{ allowed: canEdit, reason: canEdit ? undefined : 'This workspace is read-only' }}>
  <ProjectScreen />
</WriteAccessProvider>
```

A presentation aid, set once per screen (or per section; a nested provider can only narrow, never allow again; an
outer denial without a reason takes the reason of a nested denial, so a section can explain a lock set above it):
`FormSubmitButton`, `FormDialog`'s submit, the actions and Delete of `EntityListBulkBar` and `AddEntityButton` as a
button are disabled while `allowed` is `false`, with `reason` as their title. A link never is (`AddEntityButton href`).
A control that only reads (a search submit, an export bulk action) passes `ignoreWriteAccess`. Other write controls
read `useWriteAccess()` (`disabled={!writeAccess.allowed}`).

It replaces no guard: every write handler keeps its own check (`if (!writeAccess.allowed) return;`), and the server
checks every request. Without a provider writes are allowed.

## 16. Date presets, bulk menus, column factories, table breakpoint

```tsx
// A date filter with presets: all time, today, last 7 / 30 days, custom (or the host's list). One write per pick.
<FilterDateRange label="Created" presets from={list.values.createdFrom} to={list.values.createdTo}
  onFromChange={value => list.setValue('createdFrom', value)} onToChange={value => list.setValue('createdTo', value)}
  onRangeChange={range => { list.setValue('createdFrom', range.from); list.setValue('createdTo', range.to); }} />

// Columns from factories: id, sort key and filter are separate inputs; formats are explicit.
const columns = [
  idColumn<Order>({ id: 'id', header: 'ID', value: o => o.id, width: '88px' }),
  textColumn<Order>({ id: 'customer', header: 'Customer', value: o => o.customer?.name, sortKey: 'customer.name', width: '2fr' }),
  moneyColumn<Order>({ id: 'total', header: 'Total', value: o => o.total, currency: o => o.currency, width: '120px' }),
  dateColumn<Order>({ id: 'created', header: 'Created', value: o => o.changeHistory?.createdTime, sortKey: 'created', sortStart: 'desc' }),
  actionsColumn<Order>({ cell: o => <RowActions order={o} /> }),   // width 'content', pinned to the end
];

// Bulk actions with sub-choices, a confirmation with the count, a hint on a disabled action.
<EntityListBulkBar selection={selection} moreOnServer={list.hasMore} actions={[
  { id: 'move', label: 'Move', choices: sections, choicesLabel: 'Move to', onChoose: choice => moveSelected(choice.id),
    confirm: { title: m('Move %count% rows?'), confirmLabel: m('Move') } },
  { id: 'activate', label: 'Activate', disabled: allActive, hint: m('Every selected row is active already'), onClick: activate },
]} />
```

- **Date presets** write the same `YYYY-MM-DD` bounds as typed dates, so "Clear filters" (both bounds `''`) is "All time"
  and the URL keeps two keys. The filter derives the preset from the bounds (a range that matches no preset is custom);
  a host that wants "Last 7 days" to roll forward keeps `preset` / `onPresetChange` itself. "Today" is the viewer's
  local day (`today` overrides it).
- **Bulk summaries**: a run returns `skipSequential(reason)` for a row it leaves alone; the toast says
  `Deleted 3 of 5 tracks · 2 skipped` (or the host's clauses per reason through `skipReasons`). A bulk endpoint's
  answer uses `bulkSummaryText({ succeeded, failed, skipped }, labels)`.
- **Factories** return plain `EntityListColumn`s; mix them with hand-written columns. `moneyColumn` requires a currency,
  `numberColumn` takes explicit `Intl.NumberFormatOptions` or the host's formatter; nothing falls back to a locale
  default. A column with `width: 'content'` is as wide as its widest cell (a row's actions).
- **Breakpoint**: a list with cards shows the table from `md`; `tableBreakpoint="lg"` (many columns) or `"always"` on
  `EntityListBody`, and the same value on `EntityListViewToggle`.
- **Outside the package toolbar** (a host filter sheet, a custom row): `FilterToggleButton`, `FilterCountBadge`,
  `ClearFiltersButton` are the toolbar's own controls.
- `EntityListEmpty`: the built-in "Clear search" is an outline `sm` button (`xs` when compact); give a host `action` the
  same size, or set `clearSearchSize`.
- `DateCell` formats in the provider's `formatLocale` when set (a cell's `locale` wins); `ImageCell` takes `bordered`
  and `objectFit`.

## 17. Translatable texts: language tabs and limits

```tsx
const tabs = useEntityTranslations({ fields: ['name', 'description'], locales, defaultLocale: 'en::FORMAL',
  tabModel: 'language', initialLocale: uiLanguageCode });

<FormTranslatableInput<Values> name="translations.name" label="Name" tabs={tabs} maxLength={80} />
// on submit: refuse when overLimitKeys(values.translations.name, 80).length > 0, then
focusFirstOverLimitTranslation(formElement);
```

- **Keys stay full** (`locale::style`, the backend's `#[Translatable]` keys). With `tabModel: 'language'` each tab edits
  one key, chosen the same way every time (the default locale for its language, else a stored key before an offered
  one, in `styleOrder`) and named on the tab when it is not FORMAL (`DE · Informal`); the language's other keys stay in
  the value and go back unchanged. Every loaded key is sent back; a cleared text removes only its key.
- **Limits** count code points (`countCodePoints`; `countText` for another count). The counter sits under the field, an
  over-limit tab is marked, the field is `aria-invalid`; nothing is cut and a stored value over the limit stays. The
  host sets defaults once (`AdminUiProvider textLimits={{ singleLine: 120, multiline: 2000 }}`); a field's
  `maxLength` wins. The helper searches only the container it gets (the form or dialog that was submitted).

## 18. Key figures — `MetricTile`, `MetricGrid`, `DeltaText`, `NoteList`

```tsx
<MetricGrid columns={4} isLoading={query.isLoading}>
  <MetricTile label="Visitors" icon={<Users aria-hidden />} value={formatUiNumber(stats.visitors)}
    delta={<DeltaText value={relativeChange(stats.visitors, stats.previousVisitors)} format="percent"
      title="Against the previous 30 days" />}
    hint={`Previous: ${formatUiNumber(stats.previousVisitors)}`} sparkline={<HostSparkline points={stats.series} />} />
  <MetricTile label="Errors" value={formatUiNumber(stats.errors)} delta={<DeltaText value={stats.errorChange} preference="lower" />} />
</MetricGrid>
<NoteList notes={[{ id: 'sampled', text: 'Figures are sampled every 15 minutes.' }]} />
```

- Values come formatted (`formatUiNumber`, the host's money formatter); a tile never formats or loads.
- `DeltaText`: `preference="lower"` where down is good (costs, errors, durations), `"none"` where neither side is;
  zero is neutral; `format="percent"` takes a fraction (`relativeChange`), a currency passes its code explicitly.
  Arrow, sign and a hidden word carry the direction, never the colour alone.
- The sparkline is the host's chart in the `sparkline` slot; the package ships no chart library.
- Notes qualify the figures (sampling, a missing source); a state of the page is a `StatusCallout`.
- After a palette change run `ddd-admin-ui-check-contrast <built css>`: the declared pairs must reach AA in both themes
  (status text on the card, the page and its soft surface; set the text roles where the status colours are fills).

## 19. Markdown, route states, image crop, colour values, the drawer beside the page

- **Markdown fields**: `renderEditor={renderMarkdownEditor({ rows: 12 })}` from `./markdown` (or once as
  `AdminUiProvider.renderMarkdownEditor`); read-only text: `MarkdownPreview`, the same sanitising (raw HTML parsed, then
  GitHub's rules plus images; a single newline is a line break). Never `dangerouslySetInnerHTML` for user markdown.
- **Route states**: Next `error.tsx` renders `<RouteError onRetry={reset} onReport={host report} />` inside the shell;
  `loading.tsx` renders `<RouteLoading variant="list" | "detail" | "form" />`. Layouts above them stay mounted.
- **Image crop**: a picked image goes through `ImageCropDialog` (aspect options from the host, `allowSkip` for "Use
  original"); `onResult` gives a blob for the host's upload adapter. Minimum sizes and per-use presets are checked by the
  host on the result; heavy normalisation can run in a host worker through `output.runInWorker`, whose worker calls
  `renderNormalizedImage`.
- **Colour values**: `ColorValueField` with an explicit `format` (`hex`, or `hex-alpha` when the backend stores an
  alpha); it writes normalised values only (`#rrggbb` / `#rrggbbaa`), `null` for none with `clearable`.
- **Master-detail drawer**: `FormDrawer modal={false}` from `md` up (`nonModalFrom`) sits beside the page without an
  overlay; the page stays clickable, picking another row swaps the drawer's content, a click outside never closes it.
  Below that width it is the modal drawer.
- **Server texts in pickers**: `translate={false}` on `Combobox`, `QuickFilterPills` or `SegmentedControl` (and per
  option) for names from the server; UI texts stay translated.

## 20. Framework screens — `./workers`, `./translations`, `./issues`, `./database`, `./crons`

The worker monitoring, the translation admin, the issues registry, the schema diff and the Crons are package screens:
mount them, do not rebuild them.

```tsx
// once, at module scope: the operations are injected into the host's RTK Query api
export const workersApi = createWorkersApi({ baseApi: adminApi, apiPrefix: '/api/admin/maintenance/workers' });
export const translationsApi = createTranslationsApi({ baseApi: adminApi, apiPrefix: '/api/admin/common' });

<WorkersOverviewScreen api={workersApi} transportHref={transportHref} urlStateAdapter={useNextUrlStateAdapter({ listId: 'workers' })} />
<LocalesScreen api={translationsApi} urlStateAdapter={useNextUrlStateAdapter({ listId: 'locales' })} />
```

- Pass the host's URL adapters (`urlStateAdapter`, `drawerUrlAdapter`), so windows, tabs, filters and drawers are
  links; without them the state is local to the screen.
- Gate writes with the screen's `WriteAccessProvider` like any other screen: restart, generation, toggles, imports and
  saves follow it.
- A maintenance action of the host (a backfill, an import) is a `MaintenanceActionCard` (`./page`): the screen owns the
  request and the confirmation (`useConfirm`), the card shows run, pending and the last outcome.
- Charts of the workers screens are the entry's SVG charts (`WorkerTimeChart`, `WorkerSparkline`): a `null` reading
  is a gap, never a 0; no chart library is added for them. Charts of one window go into one `WorkerChartSyncGroup`
  (shared hover); counts take `countTicks`, durations `durationTicks`.
- A section the host needs in its own code goes through the screen's `renderSection` (keep, replace, leave out), its
  buttons through `headerActions`; never fork the screen for one section.
- The issues screen is `IssuesScreen` on `createIssuesApi({ baseApi, apiPrefix: '/api/admin/common/issues' })`: pass the
  URL adapters (filters, window, page and the open group become links); status changes follow the screen's
  `WriteAccessProvider`. Mount it for trusted admins only (payloads carry stack traces and account ids); a host rule that
  is not a role goes into the trait's `throwForbiddenUnlessIssuesAccessAllowed()`.
- The schema diff is `SchemaDiffScreen` (`./database`) on `createDatabaseApi`: mount it for the highest admin role only;
  never add an Apply action for a blocked table or a guard bypass, and never apply without the shown signatures (the
  screen sends them). A process sharing another stage's database sets `APP_SCHEMA_WRITES_DISABLED=1`; the screen shows
  the 403 and stays read-only.
- Crons: `createCronsApi` + `CronsScreen` (`urlStateAdapter`, `drawerUrlAdapter`). Times are the server's clock; never
  compare them with the browser's. Run now is a queue request, not a run: never show it as a result.
- On the framework screens, the details of a truncated value and the reason an action is disabled are the package
  tooltip (hover, keyboard focus, tap; the reason also as screen-reader text), never a native `title`; a list whose
  rows open by `rowAction` sets `rowKeyboardActivation`.

## 21. Application frame — `AppShell` and one navigation

One module of the host owns the navigation tree (`NavigationItem[]`, a module constant with `m()`-marked labels); the
area layout renders `AppShell` with it once, so route changes keep the frame mounted. Never a second list for the
breadcrumbs, the mobile menu or the tab title: they all resolve the same tree.

```tsx
// area layout (client): the frame, its slots, the rights predicate, the entity names
<AppShell
  navigation={ADMIN_NAVIGATION}
  canAccess={canSee}                               // stable: useCallback over the session's rights
  useEntityLabel={useAdminEntityLabel}             // module-level hook: the page's own query per entity kind
  collapsedStorageKey="admin.sidebar.collapsed"    // one per area
  brand={<HomeLink />}
  topBarEnd={<><LanguageMenu … /><AccountMenu … /></>}
  mobileMenuFooter={<AccountSummary name={user.name} />}
  documentTitle={{ appName: t('Admin') }}
>
  {children}
</AppShell>
```

- **Crumbs live on the leaf** (`crumbs`): every page below an entry adds its segment there — `create`, `:itemId` with
  `entity: 'item'`, the tabs as literal children. A page that is only a redirect gets `link: false`. A new entry or
  segment in the tree gets its crumb and its title for free.
- **Entity names** come from the host hook with the same arguments as the page's own query (one cache entry, no extra
  request); while it loads the crumb shows a skeleton, without a name the id.
- **Rights**: `canAccess` removes what the viewer may not open from the sidebar; the crumb of such a page stays as
  text. Hiding is presentation — the server refuses the request.
- **Locks and badges**: `lockedReason` for a commercial lock (the entry stays a link, its page explains), `badge` only
  for work with a deadline (a zero renders nothing).
- **Links and pathname** come from the provider (`linkComponent` with `withStickyParams`, `usePathname={useNextPathname}`);
  the frame imports no router.
- **Background**: `ShaderBackground` from `./shell-background`, passed as `background`; a host without it never loads
  it.
- **Page widths and insets** stay the page's (`PageFrame`, `EntityListPage`): `<main>` has no padding of its own.

