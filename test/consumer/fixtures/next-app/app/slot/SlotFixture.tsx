'use client';

// FormActions in header slots: the detail shell's slot takes the page form's actions; a nested shell's slot takes the
// actions of its own form (the slot closest above the form); `placement="row"` stays in the form. Scrolling the header
// away floats the pill under the top bar while the form is in view.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormActions, FormField, FormHeader, FormSubmitButton } from '@mgamadeus/ddd-admin-ui/form';
import { EntityDetailShell } from '@mgamadeus/ddd-admin-ui/page';
import { FormActionsSlotProvider, Input } from '@mgamadeus/ddd-admin-ui/primitives';

interface Values {
  name: string;
}

const SlotForm = ({ id, onSubmit, rows = 1, placement }: { id: string; onSubmit: () => void; rows?: number; placement?: 'row' }) => {
  const form = useForm<Values>({ defaultValues: { name: id } });
  return (
    <Form form={form} onSubmit={onSubmit} id={`${id}-form`}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} style={{ height: 120 }}>
          {index === 0 && (
            <FormField<Values, 'name'> name="name" label={`Name ${id}`}>
              {({ field, control }) => <Input {...control} {...field} id={`${id}-input`} />}
            </FormField>
          )}
        </div>
      ))}
      <FormActions placement={placement} primary={<FormSubmitButton>{`Save ${id}`}</FormSubmitButton>} />
    </Form>
  );
};

export function SlotFixture() {
  const [counts, setCounts] = useState({ outer: 0, inner: 0, row: 0, first: 0, second: 0 });
  const count = (key: keyof typeof counts) => () => setCounts(current => ({ ...current, [key]: current[key] + 1 }));
  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>
      <header id="top-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--nav-h)', background: '#fff', zIndex: 30 }}>
        top bar
      </header>
      <output id="counts">{JSON.stringify(counts)}</output>
      <EntityDetailShell title="Outer" fallbackTitle="Outer #1" formActionsSlot>
        <div id="outer-shell-body">
          <SlotForm id="outer" onSubmit={count('outer')} rows={12} />
          <SlotForm id="row" onSubmit={count('row')} placement="row" />
          <EntityDetailShell title="Inner" fallbackTitle="Inner #2" nested formActionsSlot>
            <SlotForm id="inner" onSubmit={count('inner')} rows={2} />
          </EntityDetailShell>
        </div>
      </EntityDetailShell>
      <FormActionsSlotProvider>
        <section id="one-provider">
          <FormHeader title="First" formActionsSlot className="first-header" />
          <SlotForm id="first" onSubmit={count('first')} />
          <FormHeader title="Second" formActionsSlot className="second-header" />
          <SlotForm id="second" onSubmit={count('second')} />
        </section>
      </FormActionsSlotProvider>
      <div style={{ height: 1600 }} />
    </div>
  );
}
