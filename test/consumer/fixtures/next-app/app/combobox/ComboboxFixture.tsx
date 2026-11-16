'use client';

// Combobox in the browser: a server search whose answers arrive out of order (the block never shows a stale term's
// options), a picked value outside the results, the reset on close, keyboard through groups and the create row,
// clearing.
import { useState } from 'react';
import { Combobox, type ComboboxOption } from '@mgamadeus/ddd-admin-ui/list';
import { useLatestSearch } from '@mgamadeus/ddd-admin-ui/logic';
import '../germanUi';

// A server that ignores aborts and answers shorter terms later: the answer to 'a' arrives after the one to 'ab'. Every
// term asked for is logged on `window` for the browser check.
const search = (term: string) =>
  new Promise<ComboboxOption[]>(resolve => {
    const log = ((window as unknown as { comboboxSearches?: string[] }).comboboxSearches ??= []);
    log.push(term);
    setTimeout(
      () => resolve([1, 2].map(index => ({ value: `${term}-${index}`, label: `Result ${index} for “${term}”` }))),
      term.length === 1 ? 900 : 100,
    );
  });

const GROUPED: ComboboxOption[] = [
  { value: 'north', label: 'North', group: 'Regions' },
  { value: 'south', label: 'South', group: 'Regions' },
  { value: 'ops', label: 'Operations', group: 'Teams' },
  { value: 'sales', label: 'Sales', group: 'Teams', badge: <span>3</span> },
];

export function ComboboxFixture() {
  const results = useLatestSearch(search, [{ value: 'first', label: 'First' }]);
  const [server, setServer] = useState('outside');
  const [grouped, setGrouped] = useState('');
  const [created, setCreated] = useState<string[]>([]);
  const [kept, setKept] = useState('north');
  return (
    <main className="space-y-6 p-6">
      <div id="server">
        <Combobox
          aria-label="Server search"
          options={results.results}
          onSearch={results.onSearch}
          isSearching={results.isSearching}
          selectedOption={{ value: 'outside', label: 'Picked outside the results' }}
          value={server}
          onChange={setServer}
          className="w-64"
        />
        <output id="server-value" data-value={server} />
      </div>
      <div id="grouped">
        <Combobox
          aria-label="Grouped"
          options={GROUPED}
          value={grouped}
          onChange={setGrouped}
          clearable
          onRequestCreate={term => setCreated(previous => [...previous, term])}
          className="w-64"
        />
        <output id="grouped-value" data-value={grouped} data-created={created.join('|')} />
      </div>
      <div id="kept">
        <Combobox aria-label="Not clearable" options={GROUPED} value={kept} onChange={setKept} className="w-64" />
        <output id="kept-value" data-value={kept} />
      </div>
    </main>
  );
}
