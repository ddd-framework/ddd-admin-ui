'use client';

// The options of 0.3.2 in the browser: range selection with Shift and the select cell as a hit target, the header that
// sticks to the page while the body scrolls sideways, a dialog whose clicks stay inside it and its result state, and
// the segmented control on a coloured bar.
import { useMemo, useState } from 'react';
import { FormDialog } from '@mgamadeus/ddd-admin-ui/form';
import { EntityListTable, type EntityListColumn } from '@mgamadeus/ddd-admin-ui/list';
import { useRowSelection } from '@mgamadeus/ddd-admin-ui/logic';
import { Button, SegmentedControl } from '@mgamadeus/ddd-admin-ui/primitives';

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 40 }, (_, index) => ({ id: `row-${index + 1}`, name: `Row ${index + 1}` }));

export function OptionsFixture() {
  const selection = useRowSelection({ items: ROWS, getKey: row => row.id, rangeSelection: true });
  const columns = useMemo<EntityListColumn<Row>[]>(
    () => [
      { id: 'name', header: 'Name', cell: row => row.name, width: '240px' },
      { id: 'a', header: 'First value', cell: () => 'Value', width: '240px' },
      { id: 'b', header: 'Second value', cell: () => 'Value', width: '240px' },
      { id: 'c', header: 'Third value', cell: () => 'Value', width: '240px' },
    ],
    []
  );
  const [outsideClicks, setOutsideClicks] = useState(0);
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [period, setPeriod] = useState('week');
  return (
    <main className="space-y-6 p-4">
      <div id="bar" className="rounded-xl bg-primary p-2 text-primary-foreground">
        <SegmentedControl
          aria-label="Period"
          tone="current"
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: 'day', label: 'Day' },
            { value: 'week', label: 'Week' },
          ]}
        />
      </div>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: a probe of clicks that must not arrive */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a probe of clicks that must not arrive */}
      <div id="dialog-host" data-outside-clicks={outsideClicks} onClick={() => setOutsideClicks(count => count + 1)}>
        <Button type="button" id="open-dialog" onClick={event => { event.stopPropagation(); setOpen(true); setResult(null); }}>
          Open dialog
        </Button>
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title="Create key"
          description="The key is shown once."
          submitLabel="Create"
          isPending={false}
          isolateEvents
          data-probe="options-dialog"
          result={result ? <p id="dialog-result">{result}</p> : undefined}
          onSubmit={() => setResult('key-123')}
        >
          <p id="dialog-text">Plain text inside the dialog</p>
        </FormDialog>
      </div>
      <output id="selection-probe" data-count={selection.count} data-keys={selection.selectedKeys.join(',')} />
      <EntityListTable
        items={ROWS}
        getRowKey={row => row.id}
        columns={columns}
        selection={selection}
        selectionHitArea="cell"
        stickyHeader="page"
        className="rounded-xl border"
      />
    </main>
  );
}
