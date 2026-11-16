'use client';

// FormDialog: a page form and a dialog form on one page, Enter in a text field, pending, a failed submit and a dialog
// opened from the dialog.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormActions, FormDialog, FormField, FormSubmitButton } from '@mgamadeus/ddd-admin-ui/form';
import { Button, Input, Label } from '@mgamadeus/ddd-admin-ui/primitives';

interface Values {
  name: string;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function FormDialogFixture() {
  const pageForm = useForm<Values>({ defaultValues: { name: 'Page' } });
  const dialogForm = useForm<Values>({ defaultValues: { name: 'Dialog' } });
  const [pageSubmits, setPageSubmits] = useState(0);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failNext, setFailNext] = useState(false);
  const [error, setError] = useState('');
  const [dialogSubmits, setDialogSubmits] = useState<string[]>([]);
  const [nestedOpen, setNestedOpen] = useState(false);
  const [nestedName, setNestedName] = useState('');
  const [nestedSubmits, setNestedSubmits] = useState<string[]>([]);

  const saveDialog = async (values: Values) => {
    setPending(true);
    setError('');
    try {
      await wait(700);
      if (failNext) throw new Error('Could not save');
      setDialogSubmits(current => [...current, values.name]);
      setOpen(false);
    } catch (caught) {
      setError((caught as Error).message);
      setFailNext(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <Form form={pageForm} onSubmit={() => setPageSubmits(count => count + 1)} id="page-form">
        <FormField<Values, 'name'> name="name" label="Page name">
          {({ field, control }) => <Input {...control} {...field} id="page-name" />}
        </FormField>
        <FormActions sticky={false} primary={<FormSubmitButton>Save page</FormSubmitButton>} />
      </Form>
      <Button id="open-dialog" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <output id="page-submits">{pageSubmits}</output>
      <output id="dialog-submits">{dialogSubmits.join(',')}</output>
      <output id="nested-submits">{nestedSubmits.join(',')}</output>
      <output id="dialog-open">{open ? 'open' : 'closed'}</output>
      <FormDialog<Values>
        open={open}
        onOpenChange={setOpen}
        title="Rename"
        description="Rename the item."
        form={dialogForm}
        onSubmit={saveDialog}
        submitLabel="Save dialog"
        pendingLabel="Saving dialog…"
        isPending={pending}
      >
        <FormField<Values, 'name'> name="name" label="Dialog name">
          {({ field, control }) => <Input {...control} {...field} id="dialog-name" />}
        </FormField>
        <label>
          <input type="checkbox" id="fail-next" checked={failNext} onChange={event => setFailNext(event.target.checked)} /> Fail the
          next save
        </label>
        {error && (
          <p id="dialog-error" role="alert">
            {error}
          </p>
        )}
        <Button type="button" variant="outline" id="open-nested" onClick={() => setNestedOpen(true)}>
          Open nested
        </Button>
        <FormDialog
          open={nestedOpen}
          onOpenChange={setNestedOpen}
          title="Nested"
          onSubmit={() => {
            setNestedSubmits(current => [...current, nestedName]);
            setNestedOpen(false);
          }}
          submitLabel="Save nested"
          isPending={false}
        >
          <div>
            <Label htmlFor="nested-name">Nested name</Label>
            <Input id="nested-name" value={nestedName} onChange={event => setNestedName(event.target.value)} />
          </div>
        </FormDialog>
      </FormDialog>
    </main>
  );
}
