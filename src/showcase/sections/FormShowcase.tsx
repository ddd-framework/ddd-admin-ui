'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { EntityListBulkBar } from '../../list/index.ts';
import { AddEntityButton } from '../../page/index.ts';
import {
  DrawerFooter,
  Form,
  FORM_PANEL_SCROLL_MARGIN_CLASS,
  FormActions,
  FormDialog,
  FormDrawer,
  FormErrors,
  FormField,
  FormFieldFrame,
  FormHeader,
  FormJumpBar,
  FormSection,
  FormSubmitButton,
  FormWrapper,
  VisibleWhen,
} from '../../form/index.ts';
import { fieldEquals, type FormSubmitError, useConfirm, WriteAccessProvider } from '../../logic/index.ts';
import { Button, FormActionsSlotProvider, Input, Label, Switch } from '../../primitives/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

interface ShowcaseFormValues {
  name: string;
  email: string;
  hasNote: boolean;
  note: string;
}

const SERVER_ERROR: FormSubmitError = {
  message: 'Could not save',
  validationErrors: [{ propertyName: 'email', path: 'email', errorMessage: 'is not a valid address' }],
};

const ShowcaseFormBody = ({ idPrefix, onClose }: { idPrefix: string; onClose?: () => void }) => {
  const form = useForm<ShowcaseFormValues>({ defaultValues: { name: 'Sample', email: 'not-an-address', hasNote: true, note: '' } });
  const [error, setError] = useState<FormSubmitError | null>(null);
  return (
    <Form form={form} onSubmit={() => setError(SERVER_ERROR)}>
      <FormErrors error={error} />
      <FormJumpBar
        panels={[
          { id: `${idPrefix}-general`, label: 'General' },
          { id: `${idPrefix}-details`, label: 'Details' },
        ]}
      />
      <div id={`${idPrefix}-general`} className={FORM_PANEL_SCROLL_MARGIN_CLASS}>
        <FormSection title="General" description="The basics.">
          <FormField<ShowcaseFormValues, 'name'> name="name" label="Name" required description="Shown in lists.">
            {({ field, control, disabled }) => <Input {...control} {...field} disabled={disabled} />}
          </FormField>
          <FormField<ShowcaseFormValues, 'email'> name="email" label="Email">
            {({ field, control }) => <Input {...control} {...field} type="email" />}
          </FormField>
        </FormSection>
      </div>
      <div id={`${idPrefix}-details`} className={FORM_PANEL_SCROLL_MARGIN_CLASS}>
        <FormSection title="Details">
          <FormField<ShowcaseFormValues, 'hasNote'> name="hasNote" label="Add a note">
            {({ field, control }) => <Switch id={control.id} checked={field.value} onCheckedChange={field.onChange} />}
          </FormField>
          <VisibleWhen<ShowcaseFormValues> condition={fieldEquals('hasNote', true)}>
            <FormField<ShowcaseFormValues, 'note'> name="note" label="Note">
              {({ field, control }) => <Input {...control} {...field} />}
            </FormField>
          </VisibleWhen>
          <FormFieldFrame label="Unbound field" description="FormFieldFrame outside a form value.">
            {control => <Input {...control} placeholder="Free input" />}
          </FormFieldFrame>
        </FormSection>
      </div>
      <FormActions
        sticky={false}
        secondary={
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        }
        primary={<FormSubmitButton>Save</FormSubmitButton>}
      />
    </Form>
  );
};

interface ShowcaseDialogValues {
  name: string;
}

const FormDialogSample = () => {
  const [open, setOpen] = useState(false);
  const [plainOpen, setPlainOpen] = useState(false);
  const [plainName, setPlainName] = useState('');
  const [pending, setPending] = useState(false);
  const form = useForm<ShowcaseDialogValues>({ defaultValues: { name: 'Sample' } });
  const save = () => {
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      setOpen(false);
    }, 600);
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open form dialog
      </Button>
      <FormDialog<ShowcaseDialogValues>
        open={open}
        onOpenChange={setOpen}
        title="Rename item"
        description="A react-hook-form instance, so FormField works inside."
        form={form}
        onSubmit={save}
        submitLabel="Save"
        pendingLabel="Saving…"
        isPending={pending}
        isDirty={form.formState.isDirty}
      >
        <FormField<ShowcaseDialogValues, 'name'> name="name" label="Name" required>
          {({ field, control }) => <Input {...control} {...field} />}
        </FormField>
      </FormDialog>
      <Button variant="outline" onClick={() => setPlainOpen(true)}>
        Open plain form dialog
      </Button>
      <FormDialog
        open={plainOpen}
        onOpenChange={setPlainOpen}
        title="Delete item"
        description="No form library: plain state."
        onSubmit={() => setPlainOpen(false)}
        submitLabel="Delete"
        submitVariant="destructive"
        submitDisabled={plainName.trim() === ''}
        isPending={false}
      >
        <div className="grid gap-2">
          <Label htmlFor="showcase-form-dialog-reason">Reason</Label>
          <Input id="showcase-form-dialog-reason" value={plainName} onChange={event => setPlainName(event.target.value)} />
        </div>
      </FormDialog>
    </>
  );
};

const ConfirmSample = () => {
  const confirm = useConfirm();
  const [answer, setAnswer] = useState('–');
  return (
    <>
      <Button
        variant="outline"
        onClick={async () =>
          setAnswer(String(await confirm({ title: 'Archive item?', description: 'It leaves the active list.', confirmLabel: 'Archive' })))
        }
      >
        useConfirm()
      </Button>
      <Button
        variant="outline"
        onClick={async () =>
          setAnswer(
            String(
              await confirm({
                title: 'Delete “Main site”?',
                description: 'This cannot be undone.',
                confirmLabel: 'Delete',
                confirmVariant: 'destructive',
                requirePhrase: 'Main site',
              })
            )
          )
        }
      >
        With a phrase
      </Button>
      <span className="self-center text-sm text-muted-foreground">Answer: {answer}</span>
    </>
  );
};

const HeaderSlotSample = () => {
  const form = useForm<ShowcaseDialogValues>({ defaultValues: { name: 'Sample' } });
  return (
    <FormActionsSlotProvider>
      <div className="w-full space-y-4">
        {/* a host header renders <FormActionsSlot /> itself; FormHeader and EntityDetailShell take formActionsSlot */}
        <FormHeader title="Edit item" description="The actions sit in the header." formActionsSlot />
        <Form form={form} onSubmit={() => form.reset(form.getValues())}>
          <FormSection title="General">
            <FormField<ShowcaseDialogValues, 'name'> name="name" label="Name">
              {({ field, control }) => <Input {...control} {...field} />}
            </FormField>
          </FormSection>
          <FormActions placement="header" primary={<FormSubmitButton>Save</FormSubmitButton>} />
        </Form>
      </div>
    </FormActionsSlotProvider>
  );
};

const WriteAccessSample = () => {
  const form = useForm<ShowcaseDialogValues>({ defaultValues: { name: 'Sample' } });
  return (
    <WriteAccessProvider value={{ allowed: false, reason: 'This workspace is read-only' }}>
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <AddEntityButton entity="Item" onClick={() => {}} />
          <AddEntityButton entity="Item" href="#create" />
        </div>
        <EntityListBulkBar
          selection={{ count: 2, clear: () => {} }}
          actions={[{ id: 'export', label: 'Export', onClick: () => {}, ignoreWriteAccess: true }]}
          onDelete={() => {}}
        />
        <Form form={form} onSubmit={() => {}}>
          <div className="flex gap-2">
            <FormSubmitButton>Save</FormSubmitButton>
            <FormSubmitButton ignoreWriteAccess>Preview</FormSubmitButton>
          </div>
        </Form>
      </div>
    </WriteAccessProvider>
  );
};

/** The `./form` section. */
export const FormShowcase = () => {
  const [open, setOpen] = useState(false);
  return (
    <Samples>
      <Sample title="FormWrapper, FormHeader, Form, FormJumpBar, FormSection, FormField, FormErrors, FormActions">
        <div className="w-full">
          <FormHeader title="Edit item" description="A form page." />
          <FormWrapper>
            <ShowcaseFormBody idPrefix="showcase-form-page" />
          </FormWrapper>
        </div>
      </Sample>
      <Sample title="FormDrawer, DrawerFooter">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open form drawer
        </Button>
        <FormDrawer open={open} onClose={() => setOpen(false)} title="Edit item" metadata={{ id: 42 }}>
          <ShowcaseFormBody idPrefix="showcase-form-drawer" onClose={() => setOpen(false)} />
          <DrawerFooter>
            <span className="text-xs text-muted-foreground">DrawerFooter content</span>
          </DrawerFooter>
        </FormDrawer>
      </Sample>
      <Sample title="FormDialog">
        <FormDialogSample />
      </Sample>
      <Sample title="useConfirm (./logic, drawn by AdminUiProvider)">
        <ConfirmSample />
      </Sample>
      <Sample title="FormActionsSlotProvider, FormActionsSlot, FormActions placement header">
        <HeaderSlotSample />
      </Sample>
      <Sample title="WriteAccessProvider (./logic): write controls off, links and reads stay">
        <WriteAccessSample />
      </Sample>
    </Samples>
  );
};
