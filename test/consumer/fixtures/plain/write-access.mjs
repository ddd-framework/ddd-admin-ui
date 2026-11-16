// WriteAccessProvider as a presentation aid (server render): FormSubmitButton, the actions of EntityListBulkBar and
// AddEntityButton as a button are disabled while writes are not allowed, with the reason as their title; a link, Clear
// and controls with ignoreWriteAccess stay; a nested provider can only narrow; no provider = allowed.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useForm } from 'react-hook-form';
import { Form, FormSubmitButton } from '@mgamadeus/ddd-admin-ui/form';
import { EntityListBulkBar } from '@mgamadeus/ddd-admin-ui/list';
import { useWriteAccess, WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { AddEntityButton } from '@mgamadeus/ddd-admin-ui/page';

const InForm = ({ children }) => h(Form, { form: useForm(), onSubmit: () => {} }, children);
const controls = h(
  'div',
  null,
  h(InForm, null, h(FormSubmitButton, null, 'Save'), h(FormSubmitButton, { ignoreWriteAccess: true }, 'Search')),
  h(AddEntityButton, { entity: 'Project', onClick: () => {} }),
  h(AddEntityButton, { entity: 'Project', href: '/projects/create' }),
  h(EntityListBulkBar, {
    selection: { count: 2, clear: () => {} },
    actions: [
      { id: 'recreate', label: 'Recreate', onClick: () => {} },
      { id: 'export', label: 'Export', onClick: () => {}, ignoreWriteAccess: true },
    ],
    onDelete: () => {},
  }),
);
const Reader = () => {
  const access = useWriteAccess();
  return h('output', null, `${access.allowed}|${access.reason ?? ''}`);
};

const render = (element) => renderToStaticMarkup(element);
const buttonNamed = (html, name) => new RegExp(`<button[^>]*>(?:<[^>]+>)*${name}`).exec(html)?.[0] ?? '';
const isDisabled = (html, name) => / disabled=""/.test(buttonNamed(html, name));

const free = render(controls);
const denied = render(h(WriteAccessProvider, { value: { allowed: false, reason: 'Read-only workspace' } }, controls));
const widened = render(
  h(WriteAccessProvider, { value: { allowed: false, reason: 'Archived' } }, h(WriteAccessProvider, { value: { allowed: true } }, controls, h(Reader))),
);
const narrowed = render(
  h(WriteAccessProvider, { value: { allowed: true } }, h(WriteAccessProvider, { value: { allowed: false, reason: 'Inner' } }, h(Reader))),
);

const checks = [
  ['no provider: every write control enabled', !/ disabled=""/.test(free) && !free.includes('title=')],
  ['no provider: useWriteAccess is allowed', render(h(Reader)) === '<output>true|</output>'],
  ['FormSubmitButton disabled, reason as title', isDisabled(denied, 'Save') && buttonNamed(denied, 'Save').includes('title="Read-only workspace"')],
  ['FormSubmitButton ignoreWriteAccess stays enabled', !isDisabled(denied, 'Search')],
  ['AddEntityButton as a button disabled', isDisabled(denied, 'Add Project')],
  ['AddEntityButton with href stays an enabled link', /<a[^>]*href="\/projects\/create"/.test(denied)],
  ['bulk bar: actions and Delete disabled', isDisabled(denied, 'Recreate') && isDisabled(denied, 'Delete')],
  ['bulk bar: an action with ignoreWriteAccess and Clear stay enabled', !isDisabled(denied, 'Export') && !isDisabled(denied, 'Clear')],
  ['a nested provider cannot widen (outer reason kept)', isDisabled(widened, 'Save') && widened.includes('<output>false|Archived</output>')],
  ['a nested provider narrows', narrowed === '<output>false|Inner</output>'],
];
let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} write access: ${label}`);
  if (!passed) failed = true;
}
if (failed) {
  console.error(denied);
  process.exit(1);
}
