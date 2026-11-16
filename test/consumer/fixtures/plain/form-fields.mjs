// T3 (server render): a form from ./form holding bound fields from ./translations and ./media. The fields find the
// form through react-hook-form's context across the three entries and render with the form's values; the shared
// label registry is checked after hydration in the Next fixture (app/form).
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { useForm } from 'react-hook-form';
import { Form } from '@mgamadeus/ddd-admin-ui/form';
import { useEntityTranslations } from '@mgamadeus/ddd-admin-ui/logic';
import { FormMediaItemField } from '@mgamadeus/ddd-admin-ui/media';
import { FormTranslatableInput } from '@mgamadeus/ddd-admin-ui/translations';

const FIELDS = ['name'];
const LOCALES = ['en::FORMAL', 'de::FORMAL'];

const SampleForm = () => {
  const tabs = useEntityTranslations({ fields: FIELDS, locales: LOCALES, defaultLocale: 'en::FORMAL' });
  const form = useForm({
    defaultValues: { translations: { name: { 'en::FORMAL': 'Sample name' } }, image: { id: '7', previewUrl: null } },
  });
  return createElement(
    Form,
    { form, onSubmit: () => {} },
    createElement(FormTranslatableInput, { name: 'translations.name', label: 'Display name', tabs }),
    createElement(FormMediaItemField, { name: 'image', label: 'Cover image', alt: '', onOpenPicker: () => {} }),
  );
};

const html = renderToString(createElement(SampleForm));
const checks = [
  ['translatable field renders inside the form', /Display name/.test(html)],
  ['translatable field shows the form value of the active locale', /value="Sample name"/.test(html)],
  ['media field renders inside the form', /Cover image/.test(html)],
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
