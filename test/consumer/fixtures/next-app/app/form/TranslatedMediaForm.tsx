'use client';

// T3: a form from ./form holding bound fields from ./translations and ./media. The fields register their labels with
// the form, so FormErrors names a server violation on either field by that field's label: the label registry is one
// context instance across the three entries.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormErrors, FormSubmitButton } from '@mgamadeus/ddd-admin-ui/form';
import { type FormSubmitError, type MediaItemValue, useEntityTranslations } from '@mgamadeus/ddd-admin-ui/logic';
import { FormMediaItemField } from '@mgamadeus/ddd-admin-ui/media';
import { FormTranslatableInput } from '@mgamadeus/ddd-admin-ui/translations';

const FIELDS = ['name'] as const;
const LOCALES = ['en::FORMAL', 'de::FORMAL'];

interface Values {
  translations: { name: Record<string, string> };
  image: MediaItemValue | null;
}

const SERVER_ERROR: FormSubmitError = {
  message: 'Could not save',
  validationErrors: [
    { propertyName: 'name', path: 'translations.name', errorMessage: 'must not be blank' },
    { propertyName: 'image', path: 'image', errorMessage: 'is required' },
  ],
};

export function TranslatedMediaForm() {
  const tabs = useEntityTranslations({ fields: FIELDS, locales: LOCALES, defaultLocale: 'en::FORMAL' });
  const form = useForm<Values>({ defaultValues: { translations: { name: {} }, image: null } });
  const [error, setError] = useState<FormSubmitError | null>(null);
  return (
    <main>
      <Form form={form} onSubmit={() => setError(SERVER_ERROR)}>
        <div id="form-errors">
          <FormErrors error={error} />
        </div>
        <FormTranslatableInput<Values> name="translations.name" label="Display name" tabs={tabs} />
        <FormMediaItemField<Values> name="image" label="Cover image" alt="" onOpenPicker={() => {}} />
        <FormSubmitButton>Save</FormSubmitButton>
      </Form>
    </main>
  );
}
