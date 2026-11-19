'use client';

// The options of 0.3.9 in the browser: the shell with the whole group row tinting on hover, a described mobile menu,
// an account avatar falling back to its initials and a language menu that reports the current language again; a table
// with tracks whose selection cell takes its track and whose select-all cell is a target; a host confirmation service
// that shows text only with node descriptions routed to the package dialog; "Generate all missing" that starts without
// asking when the estimate renderer answers null.
import { Boxes, FileText, Home, Shapes } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@mgamadeus/ddd-admin-ui/primitives';
import { EntityListTable, type EntityListColumn } from '@mgamadeus/ddd-admin-ui/list';
import { type ConfirmOptions, type NavigationItem, useConfirm, useRowSelection } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { AccountMenu, AppShell, LanguageMenu } from '@mgamadeus/ddd-admin-ui/shell';
import { showcaseTranslationsData } from '@mgamadeus/ddd-admin-ui/showcase';
import { AppTranslationsScreen, createStaticTranslationsApi } from '@mgamadeus/ddd-admin-ui/translations';

const NAVIGATION: NavigationItem[] = [
  { key: 'home', label: 'Home', href: '/options-039', exact: true, icon: Home },
  {
    key: 'catalog',
    label: 'Catalog',
    href: '/options-039/catalog',
    icon: Boxes,
    children: [
      { key: 'items', label: 'Items', href: '/options-039/catalog/items', icon: Shapes },
      { key: 'reports', label: 'Reports', href: '/options-039/catalog/reports', icon: FileText },
    ],
  },
];
const LANGUAGES = [
  { code: 'en', nativeName: 'English' },
  { code: 'de', nativeName: 'Deutsch' },
];

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = Array.from({ length: 6 }, (_, index) => ({ id: `row-${index + 1}`, name: `Row ${index + 1}` }));
const translationsApi = createStaticTranslationsApi(showcaseTranslationsData);

/** A host confirmation service that shows text only: it records the call and answers true. */
const textOnlyConfirm = (options: ConfirmOptions) => {
  const probe = document.getElementById('host-confirm-probe');
  if (probe) probe.dataset.calls = `${Number(probe.dataset.calls ?? '0') + 1}:${String(options.description)}`;
  return Promise.resolve(true);
};

const ConfirmButtons = () => {
  const confirm = useConfirm();
  const [answer, setAnswer] = useState('');
  return (
    <div className="flex gap-2">
      <Button
        type="button"
        id="confirm-node"
        onClick={async () =>
          setAnswer(String(await confirm({ title: 'With a node', description: <ul id="confirm-node-list"><li>First line</li></ul>, confirmLabel: 'Go' })))
        }
      >
        Node description
      </Button>
      <Button type="button" id="confirm-text" onClick={async () => setAnswer(String(await confirm({ title: 'With text', description: 'Plain text' })))}>
        Text description
      </Button>
      <output id="confirm-answer" data-answer={answer} />
    </div>
  );
};

export function Options039Fixture() {
  const [reselects, setReselects] = useState(0);
  const selection = useRowSelection({ items: ROWS, getKey: row => row.id });
  const columns = useMemo<EntityListColumn<Row>[]>(
    () => [
      { id: 'name', header: 'Name', cell: row => row.name, width: '200px' },
      { id: 'value', header: 'Value', cell: () => 'Value', width: '1fr' },
    ],
    []
  );
  return (
    <AppShell
      navigation={NAVIGATION}
      collapsedStorageKey="fixture.options-039"
      brand={<span>Fixture</span>}
      navGroupRowHover="row"
      mobileMenuDescription="Every page of the fixture"
      topBarEnd={
        <>
          <LanguageMenu languages={LANGUAGES} current="en" onChange={() => setReselects(count => count + 1)} allowReselect />
          <AccountMenu name="Alex Example" avatarUrl="/missing-avatar.png" avatarFallbackOnError entries={[]} />
        </>
      }
    >
      <div className="space-y-6 p-6">
        <output id="reselect-probe" data-count={reselects} />
        <div id="track-table" style={{ maxWidth: 720 }}>
          <EntityListTable
            items={ROWS}
            getRowKey={row => row.id}
            columns={columns}
            selection={selection}
            selectionHitArea="cell"
            selectionColumnWidth={56}
            className="rounded-xl border"
          />
        </div>
        <output id="selection-probe" data-keys={selection.selectedKeys.join(',')} />
        <AdminUiProvider confirm={textOnlyConfirm} confirmWithRichDescription="package">
          <ConfirmButtons />
          <output id="host-confirm-probe" />
        </AdminUiProvider>
        <AppTranslationsScreen
          api={translationsApi}
          asSpecimen
          showCompleteness={false}
          confirmGenerateAll="auto"
          renderGenerationEstimate={(_preview, scope) => (scope.kind === 'all' ? null : <p>estimate</p>)}
        />
      </div>
    </AppShell>
  );
}
