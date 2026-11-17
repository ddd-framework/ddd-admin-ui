'use client';

import { Archive, FolderInput, Pencil } from 'lucide-react';
import { useState } from 'react';

import {
  actionsColumn,
  ClearFiltersButton,
  Combobox,
  dateColumn,
  EntityListBody,
  EntityListBulkBar,
  EntityListCard,
  FilterCountBadge,
  FilterDateRange,
  FilterToggleButton,
  idColumn,
  ImageCell,
  moneyColumn,
  numberColumn,
  statusColumn,
  textColumn,
} from '../../list/index.ts';
import { useRowSelection } from '../../logic/index.ts';
import { Button } from '../../primitives/index.ts';
import { SHOWCASE_ROWS, SHOWCASE_STATUS, type ShowcaseRow } from './ListShowcase.tsx';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

const PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#94a3b8"/><circle cx="48" cy="40" r="18" fill="#e2e8f0"/></svg>'
)}`;

// built on render: ListShowcase imports this file, so its constants are not ready at module evaluation
const factoryColumns = () => [
  idColumn<ShowcaseRow>({ id: 'id', header: 'ID', value: row => row.id, width: '72px' }),
  textColumn<ShowcaseRow>({ id: 'name', header: 'Name', value: row => row.name, width: '2fr', minWidth: 160, sortKey: 'name' }),
  statusColumn<ShowcaseRow>({ id: 'status', header: 'Status', value: row => row.status, map: SHOWCASE_STATUS, width: '1fr' }),
  numberColumn<ShowcaseRow>({ id: 'count', header: 'Items', value: row => row.id * 13, format: { maximumFractionDigits: 0 }, width: '100px' }),
  moneyColumn<ShowcaseRow>({ id: 'total', header: 'Total', value: row => row.id * 9.5, currency: 'EUR', width: '120px' }),
  dateColumn<ShowcaseRow>({ id: 'created', header: 'Created', value: row => row.created, width: '1fr' }),
  actionsColumn<ShowcaseRow>({
    cell: row => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${row.name}`}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Archive ${row.name}`}>
          <Archive />
        </Button>
      </div>
    ),
  }),
];

const SECTIONS = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'archive', label: 'Archive' },
  { id: 'later', label: 'Later', disabled: true },
];

/** The list blocks of 0.2.0: date presets, bulk menus, column factories, toolbar parts, cell options. */
export const ListAdditionsShowcase = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterCount, setFilterCount] = useState(2);
  const [picked, setPicked] = useState('');
  const selection = useRowSelection({ items: SHOWCASE_ROWS, getKey: row => row.id });
  return (
    <Samples>
      <Sample title="FilterDateRange with presets">
        <FilterDateRange
          label="Created"
          presets
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onRangeChange={range => {
            setFrom(range.from);
            setTo(range.to);
          }}
        />
      </Sample>
      <Sample title="Filter toggle, count and clear outside the toolbar">
        <FilterToggleButton open={filtersOpen} onOpenChange={setFiltersOpen} activeFilterCount={filterCount} />
        <ClearFiltersButton activeFilterCount={filterCount} onClear={() => setFilterCount(0)} />
        <Button variant="outline" size="sm" onClick={() => setFilterCount(count => count + 1)}>
          Filters <FilterCountBadge count={filterCount} />
        </Button>
      </Sample>
      <Sample title="EntityListBulkBar: menu, confirm with the count, hint, more on the server">
        <Button variant="outline" size="sm" onClick={() => selection.setAllLoadedSelected(true)}>
          Select all loaded
        </Button>
        <div className="w-full">
          <EntityListBulkBar
            selection={selection}
            moreOnServer
            actions={[
              {
                id: 'move',
                label: 'Move',
                icon: <FolderInput />,
                choices: SECTIONS,
                choicesLabel: 'Move to',
                onChoose: () => selection.clear(),
              },
              {
                id: 'archive',
                label: 'Archive',
                icon: <Archive />,
                confirm: { title: 'Archive %count% rows?', confirmLabel: 'Archive' },
                onClick: () => selection.clear(),
              },
              { id: 'export', label: 'Export', disabled: true, hint: 'Export needs a filter first', onClick: () => {} },
            ]}
          />
        </div>
      </Sample>
      <Sample title="Combobox with server texts, ImageCell options">
        <Combobox
          translate={false}
          aria-label="Owner"
          options={[
            { value: 'a', label: 'Ana Example', group: 'Team one' },
            { value: 'b', label: 'Ben Example', group: 'Team two' },
          ]}
          value={picked}
          onChange={setPicked}
          className="w-56"
        />
        <ImageCell src={PLACEHOLDER} alt="" fit="cover" />
        <ImageCell src={PLACEHOLDER} alt="" bordered={false} objectFit="cover" size="lg" />
      </Sample>
      <div className="lg:col-span-2">
        <Sample title="Column factories, actions sized to their content and pinned, table from lg">
          <EntityListCard label="Factory columns" className="w-full">
            <EntityListBody
              displayMode="table"
              columns={factoryColumns()}
              items={SHOWCASE_ROWS}
              getRowKey={row => String(row.id)}
              renderCard={({ item }) => <div className="rounded-xl border p-3 text-sm">{item.name}</div>}
              tableBreakpoint="lg"
            />
          </EntityListCard>
        </Sample>
      </div>
    </Samples>
  );
};
