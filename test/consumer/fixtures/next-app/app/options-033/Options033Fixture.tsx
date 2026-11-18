'use client';

// The options of 0.3.3 in the browser: one continuous scroll-edge overlay over header and body, Shift with a press in
// the select cell selecting no page text, pinned cells of a row without an action keeping the surface on hover, a dialog
// whose presses stay inside it and whose single-line fields do not submit on Enter, and one text per language that
// keeps its edited key and a leading space while typing.
import { useMemo, useState } from 'react';
import { FormDialog } from '@mgamadeus/ddd-admin-ui/form';
import { EntityListTable, type EntityListColumn } from '@mgamadeus/ddd-admin-ui/list';
import { useRowSelection } from '@mgamadeus/ddd-admin-ui/logic';
import { Button, Input } from '@mgamadeus/ddd-admin-ui/primitives';
import { type LanguageTextsChange, TranslatableLanguageInput } from '@mgamadeus/ddd-admin-ui/translations';

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 12 }, (_, index) => ({ id: `row-${index + 1}`, name: `Row ${index + 1}` }));
const noAction = () => null;

export function Options033Fixture() {
  const selection = useRowSelection({ items: ROWS, getKey: row => row.id, rangeSelection: true });
  const columns = useMemo<EntityListColumn<Row>[]>(
    () => [
      { id: 'name', header: 'Name', cell: row => row.name, width: '160px', pin: 'start' },
      { id: 'a', header: 'First value', cell: () => 'Value', width: '320px' },
      { id: 'b', header: 'Second value', cell: () => 'Value', width: '320px' },
      { id: 'c', header: 'Third value', cell: () => 'Value', width: '320px' },
      { id: 'actions', header: 'Actions', cell: () => 'Edit', width: '96px', pin: 'end' },
    ],
    []
  );
  const [presses, setPresses] = useState(0);
  const [open, setOpen] = useState(false);
  const [submits, setSubmits] = useState(0);
  const [change, setChange] = useState<LanguageTextsChange>({
    texts: { en: 'Hello', de: 'Hallo' },
    store: { 'en::FORMAL': 'Hello', 'de::FORMAL': 'Hallo', 'de::INFORMAL': 'Hallo du' },
  });
  const [language, setLanguage] = useState('de');
  return (
    <main className="space-y-6 p-4">
      <div id="table-host" style={{ maxWidth: 640 }}>
        <EntityListTable
          items={ROWS}
          getRowKey={row => row.id}
          columns={columns}
          selection={selection}
          selectionHitArea="cell"
          rowAction={noAction}
          rowHover="action"
          pinEdge="overlay"
          className="h-80 rounded-xl border"
        />
      </div>
      <output id="selection-probe" data-keys={selection.selectedKeys.join(',')} />
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a probe of presses that must not arrive */}
      <div id="dialog-host" data-presses={presses} onPointerDown={() => setPresses(count => count + 1)}>
        <Button type="button" id="open-dialog" onPointerDown={event => event.stopPropagation()} onClick={() => setOpen(true)}>
          Open dialog
        </Button>
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title="Rename"
          description="Enter does not submit here."
          descriptionProps={{ id: 'dialog-description-probe' }}
          submitLabel="Save"
          isPending={false}
          isolateEvents
          submitOnEnter={false}
          onSubmit={() => setSubmits(count => count + 1)}
        >
          <Input id="dialog-input" aria-label="Name" defaultValue="Name" />
        </FormDialog>
      </div>
      <output id="submit-probe" data-submits={submits} />
      <TranslatableLanguageInput
        label="Title"
        texts={change.texts}
        store={change.store}
        onChange={setChange}
        languages={['en', 'de']}
        activeLanguage={language}
        onActiveLanguageChange={setLanguage}
      />
      <output
        id="texts-probe"
        data-texts={JSON.stringify(change.texts)}
        data-store={JSON.stringify(change.store)}
        data-reason={change.reason ?? ''}
      />
    </main>
  );
}
