'use client';

import { buildFieldFilter } from '@mgamadeus/ddd-web/query';
import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Form } from '../form/Form.tsx';
import { FormActions } from '../form/FormActions.tsx';
import { FormDrawer } from '../form/FormDrawer.tsx';
import { FormField } from '../form/FormField.tsx';
import { FormSubmitButton } from '../form/FormSubmitButton.tsx';
import { m } from '../i18n/store.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { Combobox, type ComboboxOption } from '../list/Combobox.tsx';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { EntityListEmpty } from '../list/EntityListEmpty.tsx';
import { drawerKey } from '../logic/pure/entityDrawer.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import type { EntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { useFormDirty } from '../logic/react/useFormDirty.ts';
import { useUnsavedChangesGuard } from '../logic/react/useUnsavedChangesGuard.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { Checkbox } from '../primitives/checkbox.tsx';
import { Input } from '../primitives/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { Textarea } from '../primitives/textarea.tsx';
import type { AppTranslationContext, AppTranslationKey, AppTranslationValue, AppTranslationWritingStyle } from './adminTypes.ts';
import {
  APP_TRANSLATION_CONTEXT_OPTIONS,
  APP_TRANSLATION_WRITING_STYLE_OPTIONS,
  appTranslationValueLocaleKey,
  type LanguageCodeMap,
  sortAppTranslationValues,
  toLanguageCodeMap,
} from './adminFormat.ts';
import type { TranslationsApi } from './api.ts';

/** The own fields of an `AppTranslationKey`. */
interface KeyFormValues {
  key: string;
  translationTemplate: string;
  translationHint: string;
  requiresContext: boolean;
  doNotTranslateAutomatically: boolean;
  reTranslate: boolean;
}

const EMPTY_KEY_FORM: KeyFormValues = {
  key: '',
  translationTemplate: '',
  translationHint: '',
  requiresContext: false,
  doNotTranslateAutomatically: false,
  reTranslate: false,
};

const toKeyForm = (key: AppTranslationKey): KeyFormValues => ({
  key: key.key ?? '',
  translationTemplate: key.translationTemplate ?? '',
  translationHint: key.translationHint ?? '',
  requiresContext: key.requiresContext ?? false,
  doNotTranslateAutomatically: key.doNotTranslateAutomatically ?? false,
  reTranslate: key.reTranslate ?? false,
});

const ACTIVE_LANGUAGES_ARG = { top: 500, filters: buildFieldFilter('isActive', '1') };
const KEY_EXPAND = 'appTranslationValues';

const toContext = (value: string): AppTranslationContext => (value === 'MANY' ? 'MANY' : 'ONE');
const toWritingStyle = (value: string): AppTranslationWritingStyle => (value === 'FORMAL' ? 'FORMAL' : 'INFORMAL');

interface ContextAndStyleProps {
  context: AppTranslationContext;
  writingStyle: AppTranslationWritingStyle;
  onContextChange: (value: AppTranslationContext) => void;
  onWritingStyleChange: (value: AppTranslationWritingStyle) => void;
  disabled: boolean;
  label: string;
}

/** Context (singular / plural) and writing style (informal / formal) of one value. */
const ContextAndStyle = ({ context, writingStyle, onContextChange, onWritingStyleChange, disabled, label }: ContextAndStyleProps) => {
  const { t } = useTranslate();
  return (
    <div className="flex shrink-0 flex-row gap-1.5 sm:flex-col">
      <Select value={context} onValueChange={value => onContextChange(toContext(value))} disabled={disabled}>
        <SelectTrigger size="sm" aria-label={t('Context of %label%', { replacements: { label } })} className="w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APP_TRANSLATION_CONTEXT_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={writingStyle} onValueChange={value => onWritingStyleChange(toWritingStyle(value))} disabled={disabled}>
        <SelectTrigger size="sm" aria-label={t('Writing style of %label%', { replacements: { label } })} className="w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {APP_TRANSLATION_WRITING_STYLE_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

/** One stored value: its `locale::style` key, the text, context and style; Save sends the whole value, Delete asks first. */
const TranslationValueRow = ({ api, value, localeKey }: { api: TranslationsApi; value: AppTranslationValue; localeKey: string }) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const [translation, setTranslation] = useState(value.translation ?? '');
  const [context, setContext] = useState<AppTranslationContext>(toContext(value.context ?? 'ONE'));
  const [writingStyle, setWritingStyle] = useState<AppTranslationWritingStyle>(toWritingStyle(value.writingStyle ?? 'INFORMAL'));
  const [saveValue, saveState] = api.useUpdateAppTranslationValueMutation();
  const [deleteValue, deleteState] = api.useDeleteAppTranslationValueMutation();

  const handleSave = async () => {
    if (!writeAccess.allowed) return;
    try {
      await saveValue({
        appTranslationValue: {
          id: value.id,
          appTranslationKeyId: value.appTranslationKeyId,
          languageId: value.languageId,
          countryId: value.countryId,
          translation,
          context,
          writingStyle,
        },
      }).unwrap();
      notify.success(t('Value saved'));
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to save value')).message);
    }
  };

  const handleDelete = async () => {
    if (!writeAccess.allowed || value.id === null || value.id === undefined) return;
    const confirmed = await confirm({
      title: t('Delete this translation value?'),
      description: t('The %locale% value is deleted; the key and its other values stay.', { replacements: { locale: localeKey } }),
      confirmLabel: t('Delete', { context: 'action' }),
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteValue({ appTranslationValueId: value.id }).unwrap();
      notify.success(t('Value deleted'));
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to delete value')).message);
    }
  };

  const busy = saveState.isLoading || deleteState.isLoading;
  const disabled = !writeAccess.allowed || busy;
  return (
    <li className="surface flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-start" data-locale-key={localeKey}>
      <code className="shrink-0 self-start rounded bg-muted px-1.5 font-mono text-xs font-semibold sm:mt-1.5">{localeKey}</code>
      <Textarea
        value={translation}
        onChange={event => setTranslation(event.target.value)}
        rows={2}
        aria-label={t('Translation (%locale%)', { replacements: { locale: localeKey } })}
        className="min-w-0 flex-1"
      />
      <ContextAndStyle context={context} writingStyle={writingStyle} onContextChange={setContext} onWritingStyleChange={setWritingStyle} disabled={disabled} label={localeKey} />
      <div className="flex shrink-0 gap-1.5 sm:flex-col">
        <Button type="button" variant="outline" size="sm" onClick={() => void handleSave()} disabled={disabled} title={writeAccess.allowed ? undefined : writeAccess.reason}>
          <Save aria-hidden />
          {t('Save', { context: 'action' })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleDelete()}
          disabled={disabled}
          title={writeAccess.allowed ? undefined : writeAccess.reason}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 aria-hidden />
          {t('Delete', { context: 'action' })}
        </Button>
      </div>
    </li>
  );
};

interface AddValueFormProps {
  api: TranslationsApi;
  keyId: string | number;
  languageOptions: readonly ComboboxOption[];
}

/** A new value of the key: language, text, context and style. */
const AddValueForm = ({ api, keyId, languageOptions }: AddValueFormProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const [languageId, setLanguageId] = useState('');
  const [translation, setTranslation] = useState('');
  const [context, setContext] = useState<AppTranslationContext>('ONE');
  const [writingStyle, setWritingStyle] = useState<AppTranslationWritingStyle>('INFORMAL');
  const [saveValue, saveState] = api.useUpdateAppTranslationValueMutation();
  const canAdd = writeAccess.allowed && !saveState.isLoading && languageId !== '' && translation.trim() !== '';

  const handleAdd = async () => {
    if (!canAdd) return;
    try {
      await saveValue({
        appTranslationValue: { appTranslationKeyId: Number(keyId), languageId: Number(languageId), translation, context, writingStyle },
      }).unwrap();
      notify.success(t('Value saved'));
      setTranslation('');
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to save value')).message);
    }
  };

  return (
    <Card className="gap-0 py-0">
      <CardContent className="space-y-3 p-4">
        <SectionHeader title={t('Add a translation')} as="h3" className="mb-0" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <Combobox
            options={languageOptions}
            value={languageId}
            onChange={setLanguageId}
            placeholder={t('Language…')}
            searchPlaceholder={t('Search languages…')}
            emptyMessage={t('No language found')}
            aria-label={t('Language of the new translation')}
            className="w-full shrink-0 sm:w-48"
          />
          <Textarea
            value={translation}
            onChange={event => setTranslation(event.target.value)}
            rows={2}
            placeholder={t('Translation text…')}
            aria-label={t('New translation')}
            className="min-w-0 flex-1"
          />
          <ContextAndStyle
            context={context}
            writingStyle={writingStyle}
            onContextChange={setContext}
            onWritingStyleChange={setWritingStyle}
            disabled={saveState.isLoading}
            label={t('the new value')}
          />
          <Button type="button" onClick={() => void handleAdd()} disabled={!canAdd} title={writeAccess.allowed ? undefined : writeAccess.reason} className="shrink-0">
            <Plus aria-hidden />
            {t('Add', { context: 'action' })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const FLAGS = [
  { field: 'requiresContext', label: m('Requires a singular/plural context') },
  { field: 'doNotTranslateAutomatically', label: m('Do not translate automatically') },
  { field: 'reTranslate', label: m('Translate again') },
] as const;

interface KeyContentProps {
  api: TranslationsApi;
  keyId: string | undefined;
  loadedKey: AppTranslationKey | undefined;
  drawer: EntityDrawer;
}

const KeyContent = ({ api, keyId, loadedKey, drawer }: KeyContentProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const id = useId();
  const isCreate = loadedKey === undefined;
  const languagesQuery = api.useLanguagesQuery(ACTIVE_LANGUAGES_ARG);
  const [saveKey, saveState] = api.useUpdateAppTranslationKeyMutation();

  const baseline = useMemo(() => (loadedKey ? toKeyForm(loadedKey) : EMPTY_KEY_FORM), [loadedKey]);
  const form = useForm<KeyFormValues>({ mode: 'onTouched', defaultValues: baseline });
  useEffect(() => {
    form.reset(baseline);
  }, [baseline, form]);
  const keyText = useWatch({ control: form.control, name: 'key' });
  const confirm = useConfirm();
  const { confirmDiscard } = useUnsavedChangesGuard(useFormDirty(form), confirm);

  const languages = languagesQuery.data?.languages.elements;
  const languageCodes: LanguageCodeMap = useMemo(() => toLanguageCodeMap(languages ?? []), [languages]);
  const languageOptions = useMemo<ComboboxOption[]>(
    () =>
      (languages ?? [])
        .filter(language => language.id !== null && language.id !== undefined)
        .map(language => ({ value: String(language.id), label: `${language.languageCode ?? ''} – ${language.name ?? ''}` })),
    [languages]
  );
  const values = useMemo(() => sortAppTranslationValues(loadedKey?.appTranslationValues?.elements ?? [], languageCodes), [loadedKey, languageCodes]);

  const handleSave = async (formValues: KeyFormValues) => {
    if (!writeAccess.allowed || !formValues.key.trim()) return;
    try {
      const data = await saveKey({ appTranslationKey: isCreate ? { ...formValues } : { ...formValues, id: keyId } }).unwrap();
      notify.success(t('Key saved'));
      const savedId = data.appTranslationKey.id;
      if (!isCreate) drawer.close();
      else if (savedId !== null && savedId !== undefined && savedId !== '') drawer.openEdit(savedId, { replace: true });
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to save key')).message);
    }
  };

  return (
    <div className="space-y-6">
      <Form form={form} onSubmit={handleSave}>
        <Card className="gap-0 py-0">
          <CardContent className="space-y-4 p-4">
            <FormField control={form.control} name="key" label={t('Key')}>
              {({ field, control }) => <Input {...control} {...field} placeholder={t('e.g. Save changes')} className="font-mono" />}
            </FormField>
            <FormField control={form.control} name="translationTemplate" label={t('Translation template')}>
              {({ field, control }) => <Textarea {...control} {...field} rows={3} placeholder={t('Template text for the translation (optional)')} />}
            </FormField>
            <FormField control={form.control} name="translationHint" label={t('Translation hint')}>
              {({ field, control }) => <Textarea {...control} {...field} rows={3} placeholder={t('Where the text appears, for the translator (optional)')} />}
            </FormField>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {FLAGS.map(flag => (
                <Controller
                  key={flag.field}
                  control={form.control}
                  name={flag.field}
                  render={({ field }) => (
                    <label htmlFor={`${id}-${flag.field}`} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        id={`${id}-${flag.field}`}
                        ref={field.ref}
                        name={field.name}
                        checked={field.value}
                        onCheckedChange={checked => field.onChange(checked === true)}
                        onBlur={field.onBlur}
                      />
                      {t(flag.label)}
                    </label>
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <FormActions
          secondary={
            <Button type="button" variant="outline" onClick={() => void confirmDiscard().then(discard => discard && drawer.close())} disabled={saveState.isLoading}>
              {t('Cancel', { context: 'dialog-action' })}
            </Button>
          }
          primary={
            <FormSubmitButton disabled={!keyText.trim()} isPending={saveState.isLoading} pendingLabel={t('Saving…')}>
              {isCreate ? t('Create translation key') : t('Save', { context: 'action' })}
            </FormSubmitButton>
          }
        />
      </Form>
      {!isCreate && (
        <>
          {values.length === 0 ? (
            <EmptyValue className="block text-sm">{t('No translation values yet.')}</EmptyValue>
          ) : (
            <section>
              <SectionHeader title={t('Values per locale and writing style')} as="h3" className="mb-2" />
              <ul className="space-y-2">
                {values.map(value => (
                  <TranslationValueRow key={String(value.id)} api={api} value={value} localeKey={appTranslationValueLocaleKey(value, languageCodes)} />
                ))}
              </ul>
            </section>
          )}
          <AddValueForm api={api} keyId={loadedKey.id ?? keyId ?? ''} languageOptions={languageOptions} />
        </>
      )}
    </div>
  );
};

export interface AppTranslationKeyDrawerProps {
  api: TranslationsApi;
  /** The list's drawer (`useEntityDrawer`): `?edit=<id>` edits a key, `?create=1` creates one. */
  drawer: EntityDrawer;
}

/**
 * One app translation key in a drawer over the list: create shows the key form; saving a new key turns the drawer into
 * its edit. Edit adds the values per `locale::style` (each saved on its own) and a form for a new value. Writes follow
 * `WriteAccessProvider`.
 */
export const AppTranslationKeyDrawer = ({ api, drawer }: AppTranslationKeyDrawerProps) => {
  const { t } = useTranslate();
  const shown = drawer.shown;
  const keyId = shown?.mode === 'edit' ? shown.id : undefined;
  const keyQuery = api.useAppTranslationKeyQuery({ appTranslationKeyId: keyId ?? '', expand: KEY_EXPAND }, { skip: keyId === undefined });
  const loadedKey = keyId === undefined ? undefined : keyQuery.currentData?.appTranslationKey;
  const isMissing = keyId !== undefined && !loadedKey && (keyQuery.isError || (keyQuery.isSuccess && !keyQuery.isFetching));
  const isLoading = keyId !== undefined && !loadedKey && !isMissing;

  return (
    <FormDrawer
      open={drawer.isOpen}
      onClose={drawer.close}
      title={keyId === undefined ? t('Create translation key') : (loadedKey?.key ?? t('Translation key #%id%', { replacements: { id: keyId } }))}
      description={keyId === undefined ? t('A new app translation key, stored in the database.') : undefined}
      metadata={loadedKey ? { id: loadedKey.id } : undefined}
    >
      {isLoading ? (
        <div className="space-y-4" aria-busy>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : isMissing ? (
        <EntityListEmpty tone="error" message={normalizeDddError(keyQuery.error, t('The translation key could not be loaded.')).message} />
      ) : (
        <KeyContent key={drawerKey(shown)} api={api} keyId={keyId} loadedKey={loadedKey} drawer={drawer} />
      )}
    </FormDrawer>
  );
};
