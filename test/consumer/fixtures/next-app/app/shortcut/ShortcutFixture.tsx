'use client';

// ⌘S / Ctrl+S of FormActions: focus nowhere, focus in another form, a disabled primary, the footer of a drawer
// portalled out of its form, two nested dialogs (the actions there are a plain row by themselves).
import { type ReactNode, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormActions, FormDrawer, FormField, FormSubmitButton } from '@mgamadeus/ddd-admin-ui/form';
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input } from '@mgamadeus/ddd-admin-ui/primitives';

interface Values {
  name: string;
}

const useCounter = () => {
  const [count, setCount] = useState(0);
  return [count, () => setCount(value => value + 1)] as const;
};

const ShortcutForm = ({
  id,
  onSubmit,
  disabled = false,
  cancel,
  children,
}: {
  id: string;
  onSubmit: () => void;
  disabled?: boolean;
  cancel?: ReactNode;
  children?: ReactNode;
}) => {
  const form = useForm<Values>({ defaultValues: { name: id } });
  return (
    <Form form={form} onSubmit={onSubmit} id={`${id}-form`}>
      <FormField<Values, 'name'> name="name" label={`Name ${id}`}>
        {({ field, control }) => <Input {...control} {...field} id={`${id}-input`} />}
      </FormField>
      {children}
      <FormActions secondary={cancel} primary={<FormSubmitButton disabled={disabled}>{`Save ${id}`}</FormSubmitButton>} />
    </Form>
  );
};

export function ShortcutFixture() {
  const [a, submitA] = useCounter();
  const [g, submitG] = useCounter();
  const [c, submitC] = useCounter();
  const [b, submitB] = useCounter();
  const [d, submitD] = useCounter();
  const [e, submitE] = useCounter();
  const [f, submitF] = useCounter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [innerOpen, setInnerOpen] = useState(false);
  const [prevented, setPrevented] = useState('');

  // what a later listener on window sees: whether the shortcut was taken
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') setPrevented(String(event.defaultPrevented));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <output id="counts">{JSON.stringify({ a, g, c, b, d, e, f })}</output>
      <output id="prevented">{prevented}</output>
      <ShortcutForm id="a" onSubmit={submitA} />
      <ShortcutForm id="g" onSubmit={submitG} />
      <ShortcutForm id="c" onSubmit={submitC} disabled />
      <form
        id="b-form"
        onSubmit={event => {
          event.preventDefault();
          submitB();
        }}
      >
        <input id="b-input" aria-label="Other form" />
        <button type="submit">Save b</button>
      </form>
      <Button id="open-drawer" onClick={() => setDrawerOpen(true)}>
        Open drawer
      </Button>
      <Button id="open-dialog" onClick={() => setDialogOpen(true)}>
        Open dialog
      </Button>
      <FormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Drawer">
        <ShortcutForm
          id="d"
          onSubmit={submitD}
          cancel={
            <Button type="button" variant="outline" id="d-cancel">
              Cancel d
            </Button>
          }
        />
      </FormDrawer>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent id="dialog-e">
          <DialogTitle>Dialog e</DialogTitle>
          <DialogDescription>The first dialog.</DialogDescription>
          <ShortcutForm id="e" onSubmit={submitE}>
            <Button type="button" variant="outline" id="open-inner" onClick={() => setInnerOpen(true)}>
              Open inner
            </Button>
          </ShortcutForm>
          <Dialog open={innerOpen} onOpenChange={setInnerOpen}>
            <DialogContent id="dialog-f">
              <DialogTitle>Dialog f</DialogTitle>
              <DialogDescription>The second dialog.</DialogDescription>
              <ShortcutForm id="f" onSubmit={submitF} />
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    </main>
  );
}
