'use client';

// The blocks of 0.2.0 in the browser: date presets, bulk menus with a confirmation, the side-by-side drawer, a
// content-sized pinned actions column, the segmented control's option height, translatable limits, the colour field,
// the route error and the markdown editor (loaded after hydration).
import { useState } from 'react';
import { ColorValueField, FormDrawer } from '@mgamadeus/ddd-admin-ui/form';
import {
  actionsColumn,
  EntityListBulkBar,
  EntityListCard,
  EntityListTable,
  FilterDateRange,
  textColumn,
} from '@mgamadeus/ddd-admin-ui/list';
import { useRowSelection } from '@mgamadeus/ddd-admin-ui/logic';
import { MarkdownPreview, renderMarkdownEditor } from '@mgamadeus/ddd-admin-ui/markdown';
import { RouteError } from '@mgamadeus/ddd-admin-ui/page';
import { Button, SegmentedControl } from '@mgamadeus/ddd-admin-ui/primitives';
import { TranslatableInput, TranslatableMarkdown } from '@mgamadeus/ddd-admin-ui/translations';

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 4 }, (_, index) => ({ id: index + 1, name: `Row ${index + 1}` }));
const COLUMNS = [
  textColumn<Row>({ id: 'name', header: 'Name', value: row => row.name, width: '1fr', minWidth: 900 }),
  actionsColumn<Row>({
    cell: row => (
      <span data-actions={row.id} className="inline-flex gap-1">
        <Button size="sm" variant="outline">
          Edit
        </Button>
        <Button size="sm" variant="outline">
          Archive this row
        </Button>
      </span>
    ),
  }),
];
const LOCALES = [
  { key: 'en::FORMAL', languageCode: 'en', writingStyle: 'FORMAL' as const, label: 'EN' },
  { key: 'de::FORMAL', languageCode: 'de', writingStyle: 'FORMAL' as const, label: 'DE' },
];

export const BlocksFixture = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [moved, setMoved] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageClicks, setPageClicks] = useState(0);
  const [segment, setSegment] = useState('a');
  const [texts, setTexts] = useState<Record<string, string>>({ 'en::FORMAL': 'Short', 'de::FORMAL': 'Viel zu lang für das Feld' });
  const [locale, setLocale] = useState('en::FORMAL');
  const [markdown, setMarkdown] = useState<Record<string, string>>({ 'en::FORMAL': '**Bold**' });
  const [color, setColor] = useState<string | null>('#aabbcc');
  const [retries, setRetries] = useState(0);
  const selection = useRowSelection({ items: ROWS, getKey: row => row.id });

  return (
    <main className="space-y-8 p-6">
      <section id="dates">
        <FilterDateRange
          label="Created"
          presets
          today="2026-11-17"
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
          onRangeChange={range => {
            setFrom(range.from);
            setTo(range.to);
          }}
        />
        <output id="dates-probe" data-from={from} data-to={to} />
      </section>

      <section id="bulk">
        <Button id="select-all" onClick={() => selection.setAllLoadedSelected(true)}>
          Select all
        </Button>
        <EntityListBulkBar
          selection={selection}
          moreOnServer
          actions={[
            {
              id: 'move',
              label: 'Move',
              choices: [
                { id: 'inbox', label: 'Inbox' },
                { id: 'later', label: 'Later' },
              ],
              choicesLabel: 'Move to',
              confirm: { title: 'Move %count% rows?', confirmLabel: 'Move' },
              onChoose: choice => setMoved(choice.id),
            },
            { id: 'export', label: 'Export', disabled: true, hint: 'Filter first', onClick: () => {} },
          ]}
        />
        <output id="bulk-probe" data-moved={moved} />
      </section>

      <section id="table" style={{ width: 700 }}>
        <EntityListCard label="Rows">
          <EntityListTable columns={COLUMNS} items={ROWS} getRowKey={row => String(row.id)} />
        </EntityListCard>
      </section>

      <section id="segmented">
        <SegmentedControl
          aria-label="Bereich"
          translate={false}
          value={segment}
          onValueChange={setSegment}
          height={40}
          heightOf="option"
          className="gap-1 p-1"
          options={[
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta', badge: <span data-plain-badge>3</span> },
          ]}
          badgeStyle="unstyled"
        />
      </section>

      <section id="limits">
        <TranslatableInput
          label="Title"
          value={texts}
          onChange={setTexts}
          locales={LOCALES}
          activeLocale={locale}
          onActiveLocaleChange={setLocale}
          maxLength={10}
        />
        <Button id="focus-over" onClick={() => import('@mgamadeus/ddd-admin-ui/translations').then(module => module.focusFirstOverLimitTranslation(document.getElementById('limits')))}>
          Show first over limit
        </Button>
      </section>

      <section id="color">
        <ColorValueField label="Accent" format="hex-alpha" value={color} onChange={setColor} />
        <output id="color-probe" data-value={String(color)} />
      </section>

      <section id="markdown">
        <TranslatableMarkdown
          label="Body"
          value={markdown}
          onChange={setMarkdown}
          locales={LOCALES}
          activeLocale="en::FORMAL"
          onActiveLocaleChange={() => {}}
          renderEditor={renderMarkdownEditor({ rows: 6 })}
        />
        <div id="preview">
          <MarkdownPreview source={'Hello <img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" onerror="window.__xss = 1"><script>window.__xss = 2</script>'} />
        </div>
      </section>

      <section id="route-error">
        <RouteError variant="inline" onRetry={() => setRetries(count => count + 1)} />
        <output id="retry-probe" data-retries={retries} />
      </section>

      <section id="drawer">
        <Button id="open-drawer" onClick={() => setDrawerOpen(true)}>
          Open drawer
        </Button>
        <Button id="page-button" onClick={() => setPageClicks(count => count + 1)}>
          Page button {pageClicks}
        </Button>
        <output id="drawer-probe" data-clicks={pageClicks} data-open={drawerOpen ? '1' : '0'} />
        <FormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Beside the page" modal={false}>
          <p>Drawer body</p>
        </FormDrawer>
      </section>
    </main>
  );
};
