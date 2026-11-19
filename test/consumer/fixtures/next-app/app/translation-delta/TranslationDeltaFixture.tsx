'use client';

// Delta saves of translatable texts (0.3.12) against an in-memory server that behaves like merge mode: a background
// translation stores a key while the form is open; the form's next save sends only the user's change, so the
// background key survives. A reload then rebases the form: the new key shows, the form stays clean.
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@mgamadeus/ddd-admin-ui/form';
import { type DeltaTranslationInfos, type FieldTranslations, useEntityTranslations } from '@mgamadeus/ddd-admin-ui/logic';
import { Button } from '@mgamadeus/ddd-admin-ui/primitives';
import { FormTranslatableInput } from '@mgamadeus/ddd-admin-ui/translations';

const FIELDS = ['name', 'description'] as const;
const LOCALES = ['en::FORMAL', 'de::FORMAL', 'fr::FORMAL'];
type Field = (typeof FIELDS)[number];
type Store = Record<string, Record<string, string>>;

interface Values {
  translations: FieldTranslations<Field>;
}

const entityOf = (store: Store) => ({ id: 1, translationInfos: { translationsStore: structuredClone(store) } });

/** Merge mode as the server applies it: a text sets its key, a null removes it, a field not sent keeps its column. */
const mergeOnServer = (stored: Store, sent: DeltaTranslationInfos['translationsStore']): Store => {
  const next = structuredClone(stored);
  for (const [field, texts] of Object.entries(sent)) {
    const column = next[field] ?? {};
    for (const [key, text] of Object.entries(texts)) {
      if (text === null) delete column[key];
      else column[key] = text;
    }
    next[field] = column;
  }
  return next;
};

export function TranslationDeltaFixture() {
  const serverRef = useRef<Store>({ name: { 'en::FORMAL': 'Bike', 'de::FORMAL': 'Fahrrad' }, description: { 'en::FORMAL': 'A bike' } });
  const tabs = useEntityTranslations({ fields: FIELDS, locales: LOCALES, defaultLocale: 'en::FORMAL', translationSaveMode: 'delta' });
  const form = useForm<Values>({ defaultValues: { translations: tabs.empty() } });
  const [serverState, setServerState] = useState('');
  const [payload, setPayload] = useState('');
  const [formState, setFormState] = useState('');
  const showServer = () => setServerState(JSON.stringify(serverRef.current));

  // biome-ignore lint/correctness/useExhaustiveDependencies: hydrate once on mount
  useEffect(() => {
    form.reset({ translations: tabs.hydrate(entityOf(serverRef.current)) });
    showServer();
  }, []);

  const save = (values: Values) => {
    const translationInfos = tabs.buildSavePayload(values.translations);
    setPayload(JSON.stringify(translationInfos ?? null));
    if (translationInfos && translationInfos.replaceExistingTranslations === false) {
      serverRef.current = mergeOnServer(serverRef.current, (translationInfos as DeltaTranslationInfos).translationsStore);
    }
    showServer();
    // the save answer: the stored record; untouched keys take it, the form is clean again
    const rebased = tabs.rebase(entityOf(serverRef.current), values.translations);
    form.reset({ translations: rebased.hasDelta ? rebased.values : rebased.stored });
  };

  const backgroundWrite = () => {
    serverRef.current = mergeOnServer(serverRef.current, { name: { 'fr::FORMAL': 'Vélo' } });
    showServer();
  };

  const reload = () => {
    const rebased = tabs.rebase(entityOf(serverRef.current), form.getValues('translations'));
    form.resetField('translations', { defaultValue: rebased.stored });
    if (rebased.hasDelta) form.setValue('translations', rebased.values, { shouldDirty: true });
    setFormState(`${JSON.stringify(form.getValues('translations'))}|${rebased.hasDelta ? 'changed' : 'clean'}`);
  };

  return (
    <main className="space-y-4 p-6">
      <Form form={form} onSubmit={save}>
        <div id="name-field">
          <FormTranslatableInput<Values> name="translations.name" label="Name" tabs={tabs} />
        </div>
        <div id="description-field">
          <FormTranslatableInput<Values> name="translations.description" label="Description" tabs={tabs} />
        </div>
        <Button type="submit" id="save">Save</Button>
      </Form>
      <Button id="background-write" onClick={backgroundWrite}>Background translation</Button>
      <Button id="reload" onClick={reload}>Reload</Button>
      <output id="server-state">{serverState}</output>
      <output id="payload">{payload}</output>
      <output id="form-state">{formState}</output>
    </main>
  );
}
