# STANDARDS — how every list and detail screen is built

One presentation everywhere: a screen keeps its data and behaviour and takes its look from the blocks. Delete the
local copy when you adopt a block; never keep a screen-local `FilterField`, `Muted`, `StatusBadge`, tab shell, date
helper or checkbox column. Request bodies and filter strings stay exactly as they are.

Where the names below come from (setup and the entry list: [`README.md`](./README.md)):

| Entry | Names used here |
|---|---|
| `@mgamadeus/ddd-admin-ui/logic` | `useUrlListState`, `useRowSelection`, `useEntityDrawer`, `drawerKey`, `defineStatusMap`, `formatDate`, `formatDateTime`, `runSequentialWithSummary` |
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

const LIST_KEYS = ['q', 'worldId', 'status', 'createdFrom', 'createdTo'] as const;

const list = useUrlListState(LIST_KEYS, { adapter: useNextUrlStateAdapter({ listId: 'admin.campaigns' }), uncounted: ['q'] });
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
      <FilterSelect label="World" allLabel="All Worlds" options={worldOptions} value={list.values.worldId}
        onChange={value => list.setValue('worldId', value)} />
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
- Search modes (e.g. an AI search next to the text search): the mode switch goes in `search.leading` (it replaces the
  magnifier at the same spot, ≤ 24 px), Enter / Escape in `search.onKeyDown`. Never lay a control over the field from
  outside.

## 3. Page toolbar (header actions)

Order: outline secondaries → `ExportButton` → `MoreActionsMenu` (rare / maintenance) → **one** primary
`AddEntityButton` ("Add <Entity>", singular, top right; `label` replaces the whole text when an entity name does not
fit, already translated). Every write control `disabled={!writesAllowed}`.

```tsx
<EntityListPage
  title="Campaigns"
  headerActions={
    <PageToolbar
      exportAction={<ExportButton onExport={handleExport} disabled={!writesAllowed} />}
      moreActions={[{ id: 'recalc', label: 'Recalculate rankings', icon: <RefreshCw />, onSelect: handleRecalc,
        disabled: !writesAllowed }]}
      primaryAction={<AddEntityButton entity="Campaign" href="/campaigns/create" linkComponent={Link}
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
  getKey: track => toNumericId(track.id),  // a host helper
  resetKey: filterString ?? '',            // new filters → empty selection
  disabled: busy,
});

const handleBulkDelete = async () => {
  if (!writesAllowed || !(await confirm({ title: `Delete ${selection.count} track(s)?`, confirmVariant: 'destructive',
    confirmLabel: 'Delete' }))) return;
  setBusy(true);
  await runSequentialWithSummary(selection.selectedKeys, id => deleteTrack({ trackId: id }).unwrap(),
    { progress: 'Deleting', done: 'Deleted', noun: 'track' });
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
const columns: EntityListColumn<Campaign>[] = [
  { id: 'image', header: 'Image', cell: c => <ImageCell src={mediaSizedUrl(c.coverImage?.publicUrl, 'SMALL')} alt="" />,
    className: 'w-16' },
  { id: 'id', header: 'ID', cell: c => <IdCell id={c.id} copyable />, className: 'w-20' },
  { id: 'name', header: 'Name', cell: c => <Link href={campaignRoute(c.id)} className="font-medium hover:underline">
    {c.name}</Link> },
  { id: 'world', header: 'World', cell: c => orEmpty(c.world?.name) },
  { id: 'status', header: 'Status', cell: c => <StatusBadge value={c.status} map={CAMPAIGN_STATUS} /> },
  { id: 'landingpage', header: 'Landing Page', cell: c => <BooleanCell value={c.landingpageEnabled} /> },
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

## 6. Status badges

One family map per enum, defined once in the host with `defineStatusMap` (e.g. `CAMPAIGN_STATUS`, `DELIVERY_STATUS` +
a `deliveryStatusOf` mapper for a boolean). A new enum gets a map there.

```tsx
<StatusBadge value={challenge.status} map={CHALLENGE_STATUS} />
<StatusBadge value={deliveryStatusOf(push.sentSuccessfully)} map={DELIVERY_STATUS} />
<StatusBadge tone="highlight" label="Electric" icon={Zap} />   // one-off flag
```

Tones: `neutral` not started / inactive · `info` finished / informational · `success` running / active / done ·
`warning` paused / pending / needs action · `danger` failed / cancelled · `highlight` featured flag · `brand` identity.
Always with an icon.

## 7. Multi-select inputs

- Filters: `FilterMultiSelect` (above).
- Forms (roles, worlds, languages): `MultiSelect` inside `FormField`; a short fixed set (≤ ~8, fully visible):
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

Every entity detail (World, Campaign, Challenge, Account, Partner, Track, Ticket …) uses the shell: back + centred
title + description + actions, `EntityMetadata` (ID, Created, Updated), centred segmented route tabs, loading and
error. Full width (§ 10); the header is `DetailHeader`, `nested` inside another shell.

```tsx
export const CampaignShell = ({ campaignId, children }: CampaignShellProps) => {
  const pathname = usePathname();
  const query = useCampaignQuery(campaignId);
  const campaign = query.data?.campaign;
  return (
    <EntityDetailShell
      title={campaign?.name}
      fallbackTitle={`Campaign #${campaignId}`}
      description={campaign?.world?.name}
      back={{ href: '/campaigns', label: 'Back to campaigns' }}
      linkComponent={Link}
      metadata={{ id: campaign?.id, changeHistory: campaign?.changeHistory }}
      tabs={CAMPAIGN_TABS.map(tab => ({ id: tab.segment, label: tab.label, href: campaignRoute(campaignId, tab.segment) }))}
      currentPath={pathname}
      tabsLabel="Campaign sections"
      isLoading={query.isLoading}
      error={!query.isLoading && !campaign ? (query.isError ? 'This campaign could not be loaded.' : 'Campaign not found.') : undefined}
      actions={<PageToolbar moreActions={…} />}
    >
      {children}
    </EntityDetailShell>
  );
};
```

Inside a tab:

```tsx
<SectionHeader title="Rankings" description="Top riders of this challenge"
  tabs={[{ id: 'accounts', label: 'Accounts' }, { id: 'teams', label: 'Teams' }]}
  activeTab={tab} onTabSelect={setTab} actions={<ExportButton onExport={exportRankings} />} />

<Card><CardContent>
  <DefinitionList columns={3} items={[
    { label: 'Access Code', value: world.accessCode },
    { label: 'Start', value: <DateCell value={world.startDate} format="date" /> },
    { label: 'Description', value: world.description, wide: true },
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
- **Two-tone titles**: wrap the brand part in `<em>` — `title={<>Bike <em>Types</em></>}` (pass `label="Bike Types"` to
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
          <IconValue icon={<KeyRound />}>{world.accessCode ?? <EmptyValue />}</IconValue>
          <IconValue icon={<Calendar />}><DateCell value={world.startDate} format="date" /></IconValue>
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
<GlassGroup title="Running" count={cards.length} limit={8} emptyText="No challenges">
  {cards.map(card => (
    <Link key={card.id} href={…}><ActionRow as="span" interactive title={card.name} description={card.context}
      tone={CHALLENGE_STATUS[card.status].tone} toneLabel={CHALLENGE_STATUS[card.status].label} /></Link>
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

<AddEntityButton entity="Sponsor" onClick={drawer.openCreate} disabled={!writesAllowed} />
rowAction={sponsor => () => drawer.openEdit(id)}
<Link href={sponsorEditRoute(id)} onClick={drawer.editLinkClick(id)}>{sponsor.name}</Link>   // middle click = new tab
<SponsorFormDrawer drawer={drawer} />

// The module's drawer: loads the entity for the header, renders the existing form inside.
const shown = drawer.shown;                                   // stays set while the close animation runs
const id = shown?.mode === 'edit' ? shown.id : undefined;
const query = useGet…Query({ …, id: id ?? '' }, { skip: id === undefined });
const entity = id ? (query.currentData?.sponsor ?? null) : null;   // currentData: never the previous row's
<FormDrawer open={drawer.isOpen} onClose={drawer.close} title={entity?.name ?? `Sponsor #${id}`}
  metadata={entity ? { id: entity.id, changeHistory: entity.changeHistory } : undefined}>
  <SponsorForm key={drawerKey(shown)} sponsor={entity} onClose={drawer.close} />
</FormDrawer>
```

- **One form, no copy.** The page form takes `onClose` instead of routing: Cancel = `confirmDiscard()` then
  `onClose()`; a save resets the form's baseline (`form.reset(values, { keepValues: true })`), toasts and calls
  `onClose()`. `FormActions` moves into the drawer's pinned footer by itself (change status left, buttons right); the
  ✕, Esc and an overlay click ask "Discard changes?" through `useUnsavedChangesGuard`. Request bodies stay as they are.
- **Header**: entity title + `EntityMetadata variant="inline"` (ID · Created · Updated, one line) via `metadata`;
  create passes a `description` instead. Entity actions that are no save (e.g. "Open as partner", "Reset password")
  go into `headerActions` (outline `sm` buttons at the right end of the header); the save stays in the footer.
- **History**: opening pushes an entry (Back closes the drawer); `close()` pops it when this page opened the drawer and
  removes the parameter otherwise (a link, a reload). A create that turns into the new entity's edit uses
  `openEdit(newId, { replace: true })`. The writes are shallow (`history.pushState`): the list stays mounted.
- **Detail routes** (`/<entity>/:id`, `/create`) can stay as redirects to the list with the parameter. Route helpers
  (`sponsorEditRoute`) live in a non-client file (a server page calls them).
- A list hosting two drawers passes its own `editKey` / `createKey`.
- **Confirm**: the drawer asks through the package dialog; a host with its own confirmation service passes
  `confirm={hostConfirm}` (stable function, same Radix copy). The same prop exists on the translatable fields.
- One column inside the drawer (≤ 760 px): no `md:grid-cols-2` form grids.
