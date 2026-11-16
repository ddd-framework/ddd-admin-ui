'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Form } from '../../form/index.ts';
import { toTranslatableLocale, useEntityTranslations } from '../../logic/index.ts';
import { Textarea } from '../../primitives/index.ts';
import {
  FormTranslatableInput,
  FormTranslatableMarkdown,
  TranslatableField,
  TranslatableInput,
  TranslatableMarkdown,
  TranslationControls,
} from '../../translations/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

const LOCALE_KEYS = ['en::FORMAL', 'de::FORMAL', 'de::INFORMAL'];
const LOCALES = LOCALE_KEYS.map(toTranslatableLocale);
const FIELDS = ['title', 'body'] as const;

interface TranslatedValues {
  translations: { title: Record<string, string>; body: Record<string, string> };
}

const renderEditor = ({ id, value, onChange, disabled }: { id?: string; value: string; onChange: (value: string) => void; disabled?: boolean }) => (
  <Textarea id={id} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} rows={4} />
);

const BoundFields = () => {
  const tabs = useEntityTranslations({ fields: FIELDS, locales: LOCALE_KEYS, defaultLocale: 'en::FORMAL' });
  const form = useForm<TranslatedValues>({
    defaultValues: { translations: { title: { 'en::FORMAL': 'Hello' }, body: { 'en::FORMAL': 'Some **markdown**.' } } },
  });
  return (
    <Form form={form} onSubmit={() => {}} className="w-full space-y-4">
      <FormTranslatableInput<TranslatedValues> name="translations.title" label="Title (bound)" tabs={tabs} />
      <FormTranslatableMarkdown<TranslatedValues> name="translations.body" label="Body (bound)" tabs={tabs} renderEditor={renderEditor} />
    </Form>
  );
};

/** The `./translations` section. */
export const TranslationsShowcase = () => {
  const [value, setValue] = useState<Record<string, string>>({ 'en::FORMAL': 'Welcome', 'de::FORMAL': 'Willkommen' });
  const [markdown, setMarkdown] = useState<Record<string, string>>({ 'en::FORMAL': 'A *short* text.' });
  const [field, setField] = useState<Record<string, string>>({});
  const [active, setActive] = useState('en::FORMAL');
  const [selected, setSelected] = useState<string[]>(['de::FORMAL']);
  return (
    <Samples>
      <Sample title="TranslatableInput, TranslatableMarkdown, TranslatableField">
        <div className="w-full space-y-4">
          <TranslatableInput label="Headline" value={value} onChange={setValue} locales={LOCALES} activeLocale={active} onActiveLocaleChange={setActive} />
          <TranslatableMarkdown
            label="Description"
            value={markdown}
            onChange={setMarkdown}
            locales={LOCALES}
            activeLocale={active}
            onActiveLocaleChange={setActive}
            renderEditor={renderEditor}
          />
          <TranslatableField
            label="Custom control"
            value={field}
            onChange={setField}
            locales={LOCALES}
            activeLocale={active}
            onActiveLocaleChange={setActive}
          >
            {({ id, text, setText }) => <Textarea id={id} value={text} onChange={event => setText(event.target.value)} />}
          </TranslatableField>
        </div>
      </Sample>
      <Sample title="FormTranslatableInput, FormTranslatableMarkdown, TranslationControls">
        <BoundFields />
        <TranslationControls
          locales={LOCALES}
          defaultLocale="en::FORMAL"
          selected={selected}
          onSelectedChange={setSelected}
          onTranslate={() => {}}
          onCancel={() => {}}
          onDismiss={() => {}}
          progress={[{ locale: 'de::FORMAL', status: 'done' }]}
          isRunning={false}
        />
      </Sample>
    </Samples>
  );
};
