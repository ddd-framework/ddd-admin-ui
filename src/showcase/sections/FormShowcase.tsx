'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  DrawerFooter,
  Form,
  FORM_PANEL_SCROLL_MARGIN_CLASS,
  FormActions,
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
import { fieldEquals, type FormSubmitError } from '../../logic/index.ts';
import { Button, Input, Switch } from '../../primitives/index.ts';
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
    </Samples>
  );
};
