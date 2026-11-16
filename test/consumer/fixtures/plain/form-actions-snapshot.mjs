// Server render of FormActions, FormSubmitButton and the other blocks that gained optional props in 0.1.0-rc.6
// (AddEntityButton, EntityListBulkBar, EntityDetailShell, FormHeader, DetailHeader), each without the new props,
// compared with form-actions-snapshot.html. The snapshot was taken from 0.1.0-rc.5: a caller that uses none of the new
// props renders the same DOM and classes as before them (icons named, not drawn: their markup is lucide-react's).
//
// Runs against the installed package (consumer check) or, from the repository, against its own build (the package
// resolves itself by name): node test/consumer/fixtures/plain/form-actions-snapshot.mjs [--write]
import * as fs from 'node:fs';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useForm } from 'react-hook-form';
import { setTranslations } from '@mgamadeus/ddd-admin-ui/i18n';
import { EntityListBulkBar } from '@mgamadeus/ddd-admin-ui/list';
import { AddEntityButton, DetailHeader, EntityDetailShell } from '@mgamadeus/ddd-admin-ui/page';
import { Form, FormActions, FormHeader, FormSubmitButton } from '@mgamadeus/ddd-admin-ui/form';
import { Button } from '@mgamadeus/ddd-admin-ui/primitives';

const SNAPSHOT = new URL('./form-actions-snapshot.html', import.meta.url);

const cancel = h(Button, { type: 'button', variant: 'outline' }, 'Cancel');
const extra = h(Button, { type: 'button', variant: 'ghost' }, 'Preview');

/** An RHF form around the given children (the change status comes from its dirty state). */
const InForm = ({ children, id }) => {
  const form = useForm({ defaultValues: { name: 'Sample' } });
  return h(Form, { form, onSubmit: () => {}, id }, h('input', { name: 'name', defaultValue: 'Sample' }), children);
};
const inForm = (children, id) => h(InForm, { id }, children);

const selection = { count: 3, clear: () => {} };

const cases = {
  'actions: page pill in an RHF form': inForm(
    h(FormActions, { secondary: cancel, primary: h(FormSubmitButton, null, 'Save') }),
  ),
  'actions: page pill with tertiary, row placement, class': inForm(
    h(FormActions, {
      tertiary: extra,
      secondary: cancel,
      primary: h(FormSubmitButton, { pendingLabel: 'Saving…' }, 'Save'),
      placement: 'row',
      className: 'mt-2',
    }),
    'item-form',
  ),
  'actions: plain row (sticky false)': inForm(
    h(FormActions, { sticky: false, tertiary: extra, secondary: cancel, primary: h(FormSubmitButton, null, 'Save') }),
  ),
  'actions: state form, dirty': h(
    'form',
    null,
    h(FormActions, { isDirty: true, secondary: cancel, primary: h(Button, { type: 'submit' }, 'Save') }),
  ),
  'actions: state form, clean, plain row': h(
    'form',
    null,
    h(FormActions, { isDirty: false, sticky: false, primary: h(Button, { type: 'submit' }, 'Save') }),
  ),
  'actions: no change status, no form': h(FormActions, { primary: h(Button, { type: 'button' }, 'Apply') }),
  'submit button: disabled, pending': inForm(
    h(
      'div',
      null,
      h(FormSubmitButton, { disabled: true }, 'Save'),
      h(FormSubmitButton, { isPending: true, pendingLabel: 'Saving…', className: 'w-40' }, 'Save'),
    ),
  ),
  'add button: handler, link, disabled link, none': h(
    'div',
    null,
    h(AddEntityButton, { entity: 'Project', onClick: () => {} }),
    h(AddEntityButton, { entity: 'Project', href: '/projects/create' }),
    h(AddEntityButton, { label: 'New project', href: '/projects/create', disabled: true }),
    h(AddEntityButton, { entity: 'Project' }),
  ),
  'bulk bar: actions, delete, disabled, busy': h(
    'div',
    null,
    h(EntityListBulkBar, {
      selection,
      actions: [
        { id: 'recreate', label: 'Recreate', onClick: () => {} },
        { id: 'export', label: 'Export', onClick: () => {}, disabled: true },
        { id: 'sync', label: 'Sync', onClick: () => {}, busy: true },
      ],
      onDelete: () => {},
    }),
    h(EntityListBulkBar, { selection, actions: [{ id: 'recreate', label: 'Recreate', onClick: () => {} }], onDelete: () => {}, disabled: true }),
    h(EntityListBulkBar, { selection, onDelete: () => {}, busy: true, deleteBusy: true }),
  ),
  'detail shell: actions, metadata, tabs': h(EntityDetailShell, {
    title: 'Sample',
    fallbackTitle: 'Project #42',
    back: { href: '/projects', label: 'Back to projects' },
    actions: h(Button, { type: 'button', variant: 'outline' }, 'Archive'),
    metadata: { id: 42 },
    tabs: [{ id: 'overview', label: 'Overview', href: '/projects/42' }],
    currentPath: '/projects/42',
    children: inForm(h(FormActions, { secondary: cancel, primary: h(FormSubmitButton, null, 'Save') })),
  }),
  'form header and detail header': h(
    'div',
    null,
    h(FormHeader, { title: 'Edit item', description: 'A form page.', actions: extra }),
    h(DetailHeader, { title: 'Item', nested: true, aside: extra }),
  ),
};

/** React's `useId` format differs between React versions (`:r0:`, `«r0»`, `_r_0_`); the snapshot names them in order. */
const normaliseIds = html => {
  const ids = new Map();
  return html.replace(/(?::r[0-9a-z]+:|«r[0-9a-z]+»|_r_[0-9a-z]+_)/g, id => {
    if (!ids.has(id)) ids.set(id, `«id${ids.size}»`);
    return ids.get(id);
  });
};

/**
 * Icons are lucide-react's markup, which changes between its versions (class names, aliases, paths): an icon becomes
 * `<svg data-icon>` with the block's own classes, so the snapshot holds at every lucide-react the peer range admits.
 */
const normaliseIcons = html =>
  html.replace(/<svg [^>]*class="lucide ([^"]*)"[^>]*>[\s\S]*?<\/svg>/g, (_, classes) => {
    const own = classes.split(' ').filter(name => !name.startsWith('lucide')).join(' ');
    return `<svg data-icon=""${own ? ` class="${own}"` : ''}></svg>`;
  });

const render = () => {
  setTranslations('en', 'FORMAL', {});
  const parts = [];
  for (const [name, element] of Object.entries(cases)) {
    parts.push(`<!-- ${name} -->\n${normaliseIcons(normaliseIds(renderToStaticMarkup(element))).replace(/></g, '>\n<')}`);
  }
  return `${parts.join('\n\n')}\n`;
};

const html = render();
if (process.argv.includes('--write')) {
  fs.writeFileSync(SNAPSHOT, html);
  console.log(`form actions snapshot written (${Object.keys(cases).length} cases)`);
} else {
  const expected = fs.readFileSync(SNAPSHOT, 'utf8');
  if (expected !== html) {
    const expectedLines = expected.split('\n');
    const actualLines = html.split('\n');
    const index = actualLines.findIndex((line, position) => line !== expectedLines[position]);
    console.error(`FAILED form actions snapshot: first difference at line ${index + 1}`);
    console.error(`  expected: ${expectedLines[index]}`);
    console.error(`  actual:   ${actualLines[index]}`);
    process.exit(1);
  }
  console.log(`ok      form actions snapshot (${Object.keys(cases).length} cases, same DOM and classes as 0.1.0-rc.5)`);
}
