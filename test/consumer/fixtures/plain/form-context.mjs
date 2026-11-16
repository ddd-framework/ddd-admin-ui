// T3: a form from ./form holding fields from ./translations and ./media; both fields read the labels the form
// declares, so the field-label context is one instance across the three entries.
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { Form } from '@mgamadeus/ddd-admin-ui/form';
import { MediaItemField } from '@mgamadeus/ddd-admin-ui/media';
import { TranslatableInputField } from '@mgamadeus/ddd-admin-ui/translations';

const html = renderToString(
  createElement(
    Form,
    {
      defaultValues: { name: { de: 'Beispiel' }, cover: 'https://example.com/cover.png' },
      labels: { name: 'Display name', cover: 'Cover image' },
      onSubmit: () => {},
      actions: createElement('button', { type: 'submit' }, 'Save'),
    },
    createElement(TranslatableInputField, { name: 'name', languageCode: 'de' }),
    createElement(MediaItemField, { name: 'cover' }),
  ),
);
const checks = [
  ['translatable field label from the form', /Display name/.test(html)],
  ['media field label from the form', /Cover image/.test(html)],
  ['fields registered with the form (react-hook-form context)', /name="name.de"/.test(html) && /name="cover"/.test(html)],
  ['form actions marked', /data-form-actions/.test(html)],
];
let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) {
  console.error(html);
  process.exit(1);
}
