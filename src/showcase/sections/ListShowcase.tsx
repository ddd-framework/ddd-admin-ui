'use client';

import { Archive, CheckCircle2, CircleX, Inbox, Star } from 'lucide-react';
import { useState } from 'react';

import {
  BooleanCell,
  ChipToggleGroup,
  Combobox,
  type ComboboxOption,
  CopyButton,
  DateCell,
  EmptyValue,
  EntityListBody,
  EntityListBulkBar,
  EntityListCard,
  type EntityListColumn,
  EntityListEmpty,
  EntityListGrid,
  EntityListGridSkeleton,
  EntityListLoadMore,
  EntityListTable,
  EntityListToolbar,
  EntityListViewToggle,
  FilterDateRange,
  FilterField,
  FilterMultiSelect,
  FilterPanel,
  FilterSelect,
  FilterText,
  IdCell,
  ImageCell,
  MultiSelect,
  SearchField,
  StatusBadge,
  Tag,
  YES_NO_FILTER_OPTIONS,
} from '../../list/index.ts';
import { defineStatusMap, type EntityListSort, type ListDisplayMode, useLatestSearch, useRowSelection } from '../../logic/index.ts';
import { Input } from '../../primitives/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';
import { ListAdditionsShowcase } from './ListAdditionsShowcase.tsx';

export interface ShowcaseRow {
  id: number;
  name: string;
  owner: string;
  status: 'ACTIVE' | 'PAUSED' | 'FAILED';
  featured: boolean;
  created: string;
}

export const SHOWCASE_STATUS = defineStatusMap({
  ACTIVE: { label: 'Active', tone: 'success', icon: CheckCircle2 },
  PAUSED: { label: 'Paused', tone: 'warning', icon: Archive, description: 'Paused by an owner' },
  FAILED: { label: 'Failed', tone: 'danger', icon: CircleX },
});

export const SHOWCASE_ROWS: ShowcaseRow[] = Array.from({ length: 6 }, (_, index) => ({
  id: 101 + index,
  name: `Sample item ${index + 1}`,
  owner: index % 2 === 0 ? 'Alex Example' : '',
  status: (['ACTIVE', 'PAUSED', 'FAILED'] as const)[index % 3] as ShowcaseRow['status'],
  featured: index % 2 === 1,
  created: `2026-0${(index % 9) + 1}-1${index} 10:00:00`,
}));

const OPTIONS = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

const GROUPED_OPTIONS: ComboboxOption[] = [
  { value: 'north', label: 'North', group: 'Regions', badge: <Tag size="sm">12</Tag> },
  { value: 'south', label: 'South', group: 'Regions', badge: <Tag size="sm">3</Tag> },
  { value: 'ops', label: 'Operations', group: 'Teams', description: 'Day-to-day running' },
  { value: 'sales', label: 'Sales', group: 'Teams' },
];

const CITIES = ['Amsterdam', 'Athens', 'Berlin', 'Bern', 'Brussels', 'Lisbon', 'London', 'Madrid', 'Oslo', 'Paris', 'Prague', 'Rome', 'Vienna'];

/** A fake server: answers after a delay that is longer for shorter terms, so answers arrive out of order. */
const searchCities = (term: string, signal: AbortSignal) =>
  new Promise<ComboboxOption[]>((resolve, reject) => {
    const timer = setTimeout(
      () => resolve(CITIES.filter(city => city.toLowerCase().includes(term.toLowerCase())).map(city => ({ value: city.toLowerCase(), label: city }))),
      Math.max(150, 900 - term.length * 250)
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('aborted', 'AbortError'));
    });
  });

const ComboboxSamples = () => {
  const [plain, setPlain] = useState('beta');
  const [grouped, setGrouped] = useState('');
  const [created, setCreated] = useState<ComboboxOption[]>([]);
  const [tag, setTag] = useState('');
  const [city, setCity] = useState('rome');
  const cities = useLatestSearch(searchCities, CITIES.slice(0, 5).map(name => ({ value: name.toLowerCase(), label: name })));
  return (
    <>
      <Combobox aria-label="Combobox" options={OPTIONS} value={plain} onChange={setPlain} className="w-56" />
      <Combobox
        aria-label="Grouped, clearable"
        placeholder="Region or team"
        options={GROUPED_OPTIONS}
        value={grouped}
        onChange={setGrouped}
        clearable
        className="w-56"
        popoverClassName="w-72"
      />
      <Combobox
        aria-label="With create"
        placeholder="Tag"
        options={[...OPTIONS, ...created]}
        value={tag}
        onChange={setTag}
        onRequestCreate={term => {
          const option = { value: term.toLowerCase(), label: term };
          setCreated(previous => [...previous, option]);
          setTag(option.value);
        }}
        className="w-56"
      />
      <Combobox
        aria-label="Server search"
        placeholder="City"
        options={cities.results}
        onSearch={cities.onSearch}
        isSearching={cities.isSearching}
        selectedOption={{ value: 'rome', label: 'Rome' }}
        value={city}
        onChange={setCity}
        clearable
        className="w-56"
      />
    </>
  );
};

const COLUMNS: EntityListColumn<ShowcaseRow>[] = [
  { id: 'image', header: 'Image', cell: () => <ImageCell src={null} alt="" />, className: 'w-16' },
  { id: 'id', header: 'ID', cell: row => <IdCell id={row.id} copyable />, className: 'w-24' },
  { id: 'name', header: 'Name', cell: row => <span className="font-medium">{row.name}</span> },
  { id: 'owner', header: 'Owner', cell: row => row.owner || <EmptyValue /> },
  { id: 'status', header: 'Status', cell: row => <StatusBadge value={row.status} map={SHOWCASE_STATUS} /> },
  { id: 'featured', header: 'Featured', cell: row => <BooleanCell value={row.featured} /> },
  { id: 'created', header: 'Created', cell: row => <DateCell value={row.created} /> },
];

const SIZED_COLUMNS: EntityListColumn<ShowcaseRow>[] = [
  { id: 'id', header: 'ID', cell: row => row.id, width: '80px', pin: 'start', sortKey: 'id' },
  { id: 'name', header: 'Name', cell: row => row.name, width: '2fr', minWidth: 200, sortKey: 'name' },
  { id: 'owner', header: 'Owner', cell: row => row.owner || <EmptyValue />, width: '1fr', minWidth: 180 },
  { id: 'status', header: 'Status', cell: row => <StatusBadge value={row.status} map={SHOWCASE_STATUS} />, width: '140px' },
  { id: 'created', header: 'Created', cell: row => <DateCell value={row.created} />, width: '180px', sortKey: 'created', align: 'end' },
];

/** Failed rows cannot be selected in the showcase (a disabled checkbox; select all skips them). */
const isRowSelectable = (row: ShowcaseRow) => row.status !== 'FAILED';
const rowClassName = (row: ShowcaseRow) => (row.status === 'PAUSED' ? 'text-muted-foreground' : undefined);

const renderCard = ({ item }: { item: ShowcaseRow }) => (
  <article className="surface space-y-2 rounded-2xl p-4">
    <p className="font-bold">{item.name}</p>
    <StatusBadge value={item.status} map={SHOWCASE_STATUS} />
  </article>
);

/** The `./list` section. */
export const ListShowcase = () => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [single, setSingle] = useState('');
  const [text, setText] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [displayMode, setDisplayMode] = useState<ListDisplayMode>('table');
  const [sort, setSort] = useState<EntityListSort | null>({ key: 'name', direction: 'asc' });
  const [chips, setChips] = useState<string[]>(['alpha']);
  const [multi, setMulti] = useState<string[]>(['alpha', 'gamma']);
  const selection = useRowSelection({ items: SHOWCASE_ROWS, getKey: row => row.id, isSelectable: isRowSelectable });
  const activeFilterCount = status.length + (single ? 1 : 0) + (text ? 1 : 0);
  const clear = () => {
    setQuery('');
    setStatus([]);
    setSingle('');
    setText('');
  };
  return (
    <div className="space-y-8">
      <EntityListCard
        label="Showcase list"
        toolbar={
          <EntityListToolbar
            search={{ value: query, onChange: setQuery, placeholder: 'Search name or ID' }}
            filters={
              <FilterPanel>
                <FilterText label="Text" value={text} onChange={setText} />
                <FilterSelect label="Flag" allLabel="All" options={YES_NO_FILTER_OPTIONS} value={single} onChange={setSingle} />
                <FilterMultiSelect label="Status" options={OPTIONS} value={status} onChange={setStatus} />
                <FilterDateRange label="Created" from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
                <FilterField label="Custom field" htmlFor="showcase-filter-field">
                  <Input id="showcase-filter-field" placeholder="Any control" />
                </FilterField>
              </FilterPanel>
            }
            activeFilterCount={activeFilterCount}
            onClearFilters={clear}
            viewToggle={<EntityListViewToggle<never> displayMode={displayMode} onDisplayModeChange={setDisplayMode} />}
            bulkBar={
              <EntityListBulkBar
                selection={selection}
                actions={[{ id: 'archive', label: 'Archive', icon: <Archive />, onClick: () => selection.clear() }]}
                onDelete={() => selection.clear()}
              />
            }
          />
        }
      >
        <EntityListBody
          displayMode={displayMode}
          columns={COLUMNS}
          items={SHOWCASE_ROWS}
          getRowKey={row => String(row.id)}
          renderCard={renderCard}
          selection={selection}
          rowAction={() => null}
          rowClassName={rowClassName}
        />
      </EntityListCard>

      <Sample title="EntityListTable with tracks, pins, sort and row index">
        <EntityListCard label="Sized table" className="w-full">
          <EntityListTable
            columns={SIZED_COLUMNS}
            items={SHOWCASE_ROWS}
            getRowKey={row => String(row.id)}
            sort={sort}
            onSortChange={setSort}
            showRowIndex
          />
        </EntityListCard>
      </Sample>

      <Samples>
        <Sample title="EntityListTable loading, empty, error">
          <EntityListCard label="Loading" className="w-full">
            <EntityListTable columns={COLUMNS} items={[]} getRowKey={row => String(row.id)} isLoading skeletonRows={2} />
          </EntityListCard>
          <EntityListCard label="Empty" className="w-full">
            <EntityListTable columns={COLUMNS} items={[]} getRowKey={row => String(row.id)} emptyMessage="Nothing here yet" />
          </EntityListCard>
          <EntityListCard label="Error" className="w-full">
            <EntityListTable columns={COLUMNS} items={[]} getRowKey={row => String(row.id)} error="Could not load the list." />
          </EntityListCard>
        </Sample>
        <Sample title="EntityListGrid, skeleton, load more, empty">
          <EntityListGrid items={SHOWCASE_ROWS.slice(0, 2)} getRowKey={row => String(row.id)} renderCard={renderCard} className="w-full" />
          <div className="w-full">
            <EntityListGridSkeleton count={2} />
          </div>
          <EntityListLoadMore hasMore isFetchingMore onLoadMore={() => {}} />
          <EntityListEmpty message="No results" icon={<Inbox />} onClearSearch={() => {}} />
          <EntityListEmpty message="Could not load" tone="error" />
          <EntityListEmpty message="Nothing linked yet" size="compact" icon={<Inbox />} action={<CopyButton value="compact" label="Copy text" />} />
        </Sample>
        <Sample title="StatusBadge, Tag, cells">
          <StatusBadge value="ACTIVE" map={SHOWCASE_STATUS} />
          <StatusBadge value="PAUSED" map={SHOWCASE_STATUS} />
          <StatusBadge value="FAILED" map={SHOWCASE_STATUS} />
          <StatusBadge tone="highlight" label="Featured" icon={Star} />
          <StatusBadge value={null} map={SHOWCASE_STATUS} />
          <Tag>Default</Tag>
          <Tag tone="primary">Primary</Tag>
          <Tag tone="brand" size="sm">
            Brand
          </Tag>
          <IdCell id={4711} copyable />
          <DateCell value="2026-03-04" format="date" />
          <BooleanCell value={false} showFalse />
          <EmptyValue />
          <span className="group inline-flex items-center gap-1 text-sm">
            https://example.com/share/42
            <CopyButton value="https://example.com/share/42" label="Copy link" reveal="hover" notify />
          </span>
          <CopyButton value="ABC-123" label="Copy code" notify="Code copied" />
        </Sample>
        <Sample title="Pickers">
          <SearchField value={query} onChange={setQuery} placeholder="SearchField" aria-label="SearchField" />
          <ChipToggleGroup aria-label="Chips" options={OPTIONS} value={chips} onChange={setChips} />
          <ComboboxSamples />
          <MultiSelect aria-label="MultiSelect" options={OPTIONS} value={multi} onChange={setMulti} className="w-72" />
          <FilterDateRange label="Created" hideLabel from={from} to={to} onFromChange={setFrom} onToChange={setTo} fromLabel="Created after" toLabel="Created before" />
        </Sample>
      </Samples>
      <ListAdditionsShowcase />
    </div>
  );
};
