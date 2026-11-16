'use client';

// SegmentedControl in the browser: roles, both activation modes, right to left, a disabled option with its reason, a
// description, icon-only names and tooltips, and the drag preview (one change on release, none on cancel).
import { LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';
import { SegmentedControl, type SegmentedControlOption } from '@mgamadeus/ddd-admin-ui/primitives';
import '../germanUi';

const PERIODS: SegmentedControlOption[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week', description: 'Seven days', badge: 7 },
  { value: 'month', label: 'Month', disabled: true, disabledReason: 'Not enough data yet' },
  { value: 'year', label: 'Year' },
];

const useTracked = (initial: string) => {
  const [value, setValue] = useState(initial);
  const [changes, setChanges] = useState<string[]>([]);
  return {
    value,
    changes,
    onValueChange: (next: string) => {
      setValue(next);
      setChanges(previous => [...previous, next]);
    },
  };
};

const Probe = ({ id, value, changes }: { id: string; value: string; changes: string[] }) => (
  <output id={id} data-value={value} data-changes={changes.join(',')}>
    {value} ({changes.length})
  </output>
);

export function SegmentedFixture() {
  const automatic = useTracked('day');
  const manual = useTracked('day');
  const rtl = useTracked('day');
  const icons = useTracked('grid');
  const drag = useTracked('a');
  const narrow = useTracked('today');
  return (
    <main className="space-y-6 p-6">
      <div id="automatic">
        <SegmentedControl aria-label="Period" options={PERIODS} value={automatic.value} onValueChange={automatic.onValueChange} />
        <Probe id="automatic-probe" value={automatic.value} changes={automatic.changes} />
      </div>
      <div id="manual">
        <SegmentedControl
          aria-label="Period (manual)"
          activation="manual"
          options={PERIODS}
          value={manual.value}
          onValueChange={manual.onValueChange}
        />
        <Probe id="manual-probe" value={manual.value} changes={manual.changes} />
      </div>
      <div id="rtl" dir="rtl">
        <SegmentedControl aria-label="Period (right to left)" options={PERIODS} value={rtl.value} onValueChange={rtl.onValueChange} />
        <Probe id="rtl-probe" value={rtl.value} changes={rtl.changes} />
      </div>
      <div id="icons">
        <SegmentedControl
          aria-label="View"
          iconOnly
          options={[
            { value: 'grid', label: 'Grid view', icon: <LayoutGrid /> },
            { value: 'table', label: 'Table view', icon: <List /> },
          ]}
          value={icons.value}
          onValueChange={icons.onValueChange}
        />
      </div>
      <div id="narrow" style={{ width: 358, maxWidth: "100%" }}>
        <SegmentedControl
          aria-label="Narrow"
          options={[
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'This week' },
            { value: 'month', label: 'This month' },
            { value: 'quarter', label: 'This quarter' },
            { value: 'year', label: 'This year', translate: false },
          ]}
          value={narrow.value}
          onValueChange={narrow.onValueChange}
        />
      </div>
      <div id="drag">
        <SegmentedControl
          aria-label="Drag"
          height={40}
          options={[
            { value: 'a', label: 'Alpha', className: 'w-28' },
            { value: 'b', label: 'Beta', className: 'w-28' },
            { value: 'c', label: 'Gamma', className: 'w-28' },
            { value: 'd', label: 'Delta', className: 'w-28' },
          ]}
          value={drag.value}
          onValueChange={drag.onValueChange}
        />
        <Probe id="drag-probe" value={drag.value} changes={drag.changes} />
      </div>
    </main>
  );
}
