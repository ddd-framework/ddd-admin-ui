'use client';

// A list table with column tracks, pinned columns, sortable headers, a row index and selection (checked in the
// browser at three widths: no overflow, overflow with the start pin honoured, phone width with the start pin declined).
import { useState } from 'react';
import { EntityListBody, type EntityListColumn, EntityListToolbar, StatusBadge } from '@mgamadeus/ddd-admin-ui/list';
import { defineStatusMap, type EntityListSort, formatListSort, useRowSelection } from '@mgamadeus/ddd-admin-ui/logic';
import { EntityListPage } from '@mgamadeus/ddd-admin-ui/page';
import '../germanUi';

interface Row {
  id: number;
  name: string;
  email: string;
  city: string;
  phone: string;
  country: string;
  notes: string;
  created: string;
  status: 'DONE' | 'FAILED';
}

const STATUS = defineStatusMap(
  { DONE: { label: 'Done', tone: 'success' }, FAILED: { label: 'Failed', tone: 'danger' } },
  { context: 'import-status' },
);

const ROWS: Row[] = Array.from({ length: 30 }, (_, index) => ({
  id: 1001 + index,
  name: `Sample entry ${index + 1}`,
  email: `entry${index + 1}@example.com`,
  city: 'Springfield',
  phone: '+1 555 0100',
  country: 'Exampleland',
  notes: 'A longer note that wraps inside its track instead of widening the column',
  created: '2026-03-04',
  status: index % 3 === 0 ? 'FAILED' : 'DONE',
}));

const COLUMNS: EntityListColumn<Row>[] = [
  { id: 'id', header: 'ID', cell: row => row.id, width: '80px', pin: 'start', sortKey: 'id' },
  { id: 'name', header: 'Name', cell: row => row.name, width: '2fr', minWidth: 200, sortKey: 'name' },
  { id: 'email', header: 'Email', cell: row => row.email, width: '1fr', minWidth: 220 },
  { id: 'city', header: 'City', cell: row => row.city, width: '1fr' },
  { id: 'phone', header: 'Phone', cell: row => row.phone, width: '1fr', minWidth: 160 },
  { id: 'country', header: 'Country', cell: row => row.country, width: '1fr', minWidth: 140 },
  { id: 'notes', header: 'Notes', cell: row => row.notes, width: '2fr', minWidth: 240 },
  { id: 'created', header: 'Created', cell: row => row.created, width: '140px', sortKey: 'created', sortStart: 'desc', align: 'end' },
  { id: 'status', header: 'Status', cell: row => <StatusBadge value={row.status} map={STATUS} />, width: '120px' },
  {
    id: 'actions',
    header: 'Actions',
    cell: row => <button type="button">Edit {row.id}</button>,
    width: '120px',
    pin: 'end',
    align: 'end',
  },
];

/** Every fifth row cannot be selected: a disabled checkbox; select all and the count skip it. */
const isSelectable = (row: Row) => row.id % 5 !== 0;

export function SizedList() {
  const [sort, setSort] = useState<EntityListSort | null>(null);
  const selection = useRowSelection({ items: ROWS, getKey: row => row.id, isSelectable });
  return (
    <EntityListPage title="Entries" toolbar={<EntityListToolbar trailing={<output id="sort">{formatListSort(sort)}</output>} />}>
      <EntityListBody
        displayMode="table"
        columns={COLUMNS}
        items={ROWS}
        getRowKey={row => String(row.id)}
        selection={selection}
        sort={sort}
        onSortChange={setSort}
        showRowIndex
      />
    </EntityListPage>
  );
}
