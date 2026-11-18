'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Plus, Save, Trash2 } from 'lucide-react';
import { type ReactNode, useContext, useEffect, useId, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

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
import { UnsavedChangesContext, useDiscardChangesConfirm, useUnsavedChangesGuard } from '../logic/react/useUnsavedChangesGuard.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { SectionHeader } from '../page/SectionHeader.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { Checkbox } from '../primitives/checkbox.tsx';
import { Input } from '../primitives/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { Textarea } from '../primitives/textarea.tsx';
import type { AdminLanguage, AdminLocale, AppTranslationContext, AppTranslationKey, AppTranslationValue, AppTranslationWritingStyle } from './adminTypes.ts';
import {
  APP_TRANSLATION_CONTEXT_OPTIONS,
  APP_TRANSLATION_WRITING_STYLE_OPTIONS,
  appTranslationValueCombination,
  appTranslationValueCountryCode,
  appTranslationValueLocaleKey,
  type CountryCodeMap,
  filterAppTranslationValues,
  type LanguageCodeMap,
  sortAppTranslationValuesBy,
  supportedWritingStylesOf,
  toAppTranslationKeyBody,
  toCountryCodeMap,
  toLanguageCodeMap,
} from './adminFormat.ts';
import type { TranslationsApi } from './api.ts';
import { ACTIVE_LANGUAGES_ARG, ACTIVE_LOCALES_WITH_COUNTRIES_ARG } from './appTranslationsList.ts';

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

const KEY_EXPAND = 'appTranslationValues';

const toContext = (value: string): AppTranslationContext => (value === 'MANY' ? 'MANY' : 'ONE');
const toWritingStyle = (value: string): AppTranslationWritingStyle => (value === 'FORMAL' ? 'FORMAL' : 'INFORMAL');
/** No country: the value holds for every country of its language. */
const ANY_COUNTRY = '';
const ALL_OPTION = '__all';

/** The combination key of a value being added (ids as the form holds them). */
const combinationOf = (language: string, country: string, style: AppTranslationWritingStyle, valueContext: AppTranslationContext) =>
  appTranslationValueCombination({
    languageId: language === '' ? null : Number(language),
    countryId: country === ANY_COUNTRY ? null : Number(country),
    writingStyle: style,
    context: valueContext,
  });

/** The countries a language has a locale in (active locales), as select options. */
const countryOptionsOf = (locales: readonly AdminLocale[], languageId: string): { value: string; label: string }[] => {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const locale of locales) {
    if (String(locale.languageId ?? '') !== languageId || locale.countryId === null || locale.countryId === undefined) continue;
    const value = String(locale.countryId);
    if (seen.has(value)) continue;
    seen.add(value);
    options.push({ value, label: locale.countryShortCode ?? `#${value}` });
  }
  return options.sort((left, right) => left.label.localeCompare(right.label));
};

interface ContextAndStyleProps {
  context: AppTranslationContext;
  writingStyle: AppTranslationWritingStyle;
  onContextChange: (value: AppTranslationContext) => void;
  onWritingStyleChange: (value: AppTranslationWritingStyle) => void;
  disabled: boolean;
  label: string;
  /** The styles the value's language supports (the current one always stays choosable). */
  writingStyles?: readonly AppTranslationWritingStyle[];
}

/** Context (singular / plural) and writing style (informal / formal) of one value. */
const ContextAndStyle = ({ context, writingStyle, onContextChange, onWritingStyleChange, disabled, label, writingStyles }: ContextAndStyleProps) => {
  const { t } = useTranslate();
  const styleOptions = APP_TRANSLATION_WRITING_STYLE_OPTIONS.filter(option => !writingStyles || writingStyles.includes(option.value) || option.value === writingStyle);
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
          {styleOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

interface TranslationValueRowProps {
  api: TranslationsApi;
  value: AppTranslationValue;
  localeKey: string;
  countryCode: string | null;
  language: AdminLanguage | undefined;
  /** Language and country of the value are editable (`AppTranslationKeyDrawer.editableValueLocale`). */
  localeEditable?: boolean;
  languages?: readonly AdminLanguage[];
  locales?: readonly AdminLocale[];
  /** `appTranslationValueCombination` of every stored value: a move onto another value's combination is refused. */
  existingCombinations?: ReadonlySet<string>;
  /** The host's actions of this value, after Save and Delete. */
  actions?: ReactNode;
}

/**
 * One stored value: its `locale::style` key (and country), the text, context and style; Save sends the whole value
 * (never an empty text), Delete asks first. A changed row counts as an unsaved change of the drawer.
 */
const TranslationValueRow = ({
  api,
  value,
  localeKey,
  countryCode,
  language,
  localeEditable = false,
  languages = [],
  locales = [],
  existingCombinations,
  actions,
}: TranslationValueRowProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const storedContext = toContext(value.context ?? 'ONE');
  const storedStyle = toWritingStyle(value.writingStyle ?? 'INFORMAL');
  const [translation, setTranslation] = useState(value.translation ?? '');
  const [context, setContext] = useState<AppTranslationContext>(storedContext);
  const [writingStyle, setWritingStyle] = useState<AppTranslationWritingStyle>(storedStyle);
  const storedLanguageId = value.languageId === null || value.languageId === undefined ? '' : String(value.languageId);
  const storedCountryId = value.countryId === null || value.countryId === undefined ? ANY_COUNTRY : String(value.countryId);
  const [languageId, setLanguageId] = useState(storedLanguageId);
  const [countryId, setCountryId] = useState(storedCountryId);
  const [saveValue, saveState] = api.useUpdateAppTranslationValueMutation();
  const [deleteValue, deleteState] = api.useDeleteAppTranslationValueMutation();
  const localeChanged = languageId !== storedLanguageId || countryId !== storedCountryId;
  const isDirty = translation !== (value.translation ?? '') || context !== storedContext || writingStyle !== storedStyle || localeChanged;
  useUnsavedChangesGuard(isDirty, confirm);
  const isEmpty = translation.trim() === '';
  // a value moved (language, country, style or context) onto a combination another value holds
  const combination = combinationOf(languageId, countryId, writingStyle, context);
  const collides =
    combination !== combinationOf(storedLanguageId, storedCountryId, storedStyle, storedContext) && (existingCombinations?.has(combination) ?? false);
  const languageOptions = useMemo(
    () =>
      languages.flatMap(entry =>
        entry.id === null || entry.id === undefined ? [] : [{ value: String(entry.id), label: entry.name || entry.languageCode || String(entry.id) }]
      ),
    [languages]
  );
  const countries = useMemo(() => countryOptionsOf(locales, languageId), [locales, languageId]);

  const handleSave = async () => {
    if (!writeAccess.allowed || isEmpty) return;
    try {
      await saveValue({
        appTranslationValue: {
          id: value.id,
          appTranslationKeyId: value.appTranslationKeyId,
          languageId: localeEditable && languageId !== '' ? Number(languageId) : value.languageId,
          countryId: localeEditable ? (countryId === ANY_COUNTRY ? null : Number(countryId)) : value.countryId,
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
      <div className="flex shrink-0 gap-1 self-start sm:mt-1.5 sm:flex-col">
        <code className="rounded bg-muted px-1.5 font-mono text-xs font-semibold">{localeKey}</code>
        {countryCode && (
          <code className="rounded bg-tint px-1.5 font-mono text-xs" title={t('Country')}>
            {countryCode}
          </code>
        )}
        {localeEditable && (
          <div className="flex w-full flex-col gap-1.5 sm:w-40" data-slot="app-translation-value-locale">
            <Combobox
              options={languageOptions}
              value={languageId}
              onChange={next => {
                setLanguageId(next);
                setCountryId(ANY_COUNTRY);
              }}
              placeholder={t('Language…')}
              searchPlaceholder={t('Search languages…')}
              emptyMessage={t('No language found')}
              aria-label={t('Language of the %locale% value', { replacements: { locale: localeKey } })}
              disabled={disabled}
              className="w-full"
            />
            <Select
              value={countryId === ANY_COUNTRY ? ALL_OPTION : countryId}
              onValueChange={next => setCountryId(next === ALL_OPTION ? ANY_COUNTRY : next)}
              disabled={disabled || (countries.length === 0 && countryId === ANY_COUNTRY)}
            >
              <SelectTrigger size="sm" className="w-full text-xs" aria-label={t('Country of the %locale% value', { replacements: { locale: localeKey } })}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>{t('Every country')}</SelectItem>
                {countryId !== ANY_COUNTRY && !countries.some(country => country.value === countryId) && (
                  <SelectItem value={countryId}>{countryCode ?? `#${countryId}`}</SelectItem>
                )}
                {countries.map(country => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Textarea
          value={translation}
          onChange={event => setTranslation(event.target.value)}
          rows={2}
          aria-label={t('Translation (%locale%)', { replacements: { locale: localeKey } })}
          aria-invalid={isEmpty || undefined}
          className="w-full"
        />
        {isEmpty && <p className="mt-1 text-xs text-destructive">{t('A value needs a text; delete it instead.')}</p>}
        {collides && <p className="mt-1 text-xs text-destructive">{t('The key already has a value for this language, country, style and context.')}</p>}
      </div>
      <ContextAndStyle
        context={context}
        writingStyle={writingStyle}
        onContextChange={setContext}
        onWritingStyleChange={setWritingStyle}
        disabled={disabled}
        label={localeKey}
        writingStyles={supportedWritingStylesOf(language)}
      />
      <div className="flex shrink-0 gap-1.5 sm:flex-col">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleSave()}
          disabled={disabled || isEmpty || collides}
          title={writeAccess.allowed ? undefined : writeAccess.reason}
        >
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
        {actions}
      </div>
    </li>
  );
};

interface AddValueFormProps {
  api: TranslationsApi;
  keyId: string | number;
  languages: readonly AdminLanguage[];
  locales: readonly AdminLocale[];
  /** `appTranslationValueCombination` of every stored value: a combination that exists is not offered again. */
  existingCombinations: ReadonlySet<string>;
}

/**
 * A new value of the key: language, country (none: every country), text, context and style. Only the language's
 * supported styles are offered, and only combinations the key does not have yet; a language whose combinations are
 * all taken is left out. Typed text counts as an unsaved change of the drawer.
 */
const AddValueForm = ({ api, keyId, languages, locales, existingCombinations }: AddValueFormProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const [languageId, setLanguageId] = useState('');
  const [countryId, setCountryId] = useState(ANY_COUNTRY);
  const [translation, setTranslation] = useState('');
  const [context, setContext] = useState<AppTranslationContext>('ONE');
  const [writingStyle, setWritingStyle] = useState<AppTranslationWritingStyle>('INFORMAL');
  const [saveValue, saveState] = api.useUpdateAppTranslationValueMutation();
  useUnsavedChangesGuard(translation.trim() !== '', confirm);

  const languageOptions = useMemo<ComboboxOption[]>(
    () =>
      languages
        .filter(language => language.id !== null && language.id !== undefined)
        .filter(language => {
          // offered while one combination of the language (without a country) is free
          const id = String(language.id);
          return supportedWritingStylesOf(language).some(style =>
            (['ONE', 'MANY'] as const).some(valueContext => !existingCombinations.has(combinationOf(id, ANY_COUNTRY, style, valueContext)))
          );
        })
        .map(language => ({ value: String(language.id), label: `${language.languageCode ?? ''} – ${language.name ?? ''}` })),
    [languages, existingCombinations]
  );
  const language = languages.find(entry => String(entry.id) === languageId);
  const styles = supportedWritingStylesOf(language);
  const countries = useMemo(() => countryOptionsOf(locales, languageId), [locales, languageId]);

  const chooseLanguage = (next: string) => {
    setLanguageId(next);
    setCountryId(ANY_COUNTRY);
    const nextStyles = supportedWritingStylesOf(languages.find(entry => String(entry.id) === next));
    if (!nextStyles.includes(writingStyle)) setWritingStyle(nextStyles[0] ?? 'INFORMAL');
  };

  const exists = languageId !== '' && existingCombinations.has(combinationOf(languageId, countryId, writingStyle, context));
  const canAdd = writeAccess.allowed && !saveState.isLoading && languageId !== '' && translation.trim() !== '' && !exists;

  const handleAdd = async () => {
    if (!canAdd) return;
    try {
      await saveValue({
        appTranslationValue: {
          appTranslationKeyId: Number(keyId),
          languageId: Number(languageId),
          ...(countryId === ANY_COUNTRY ? {} : { countryId: Number(countryId) }),
          translation,
          context,
          writingStyle,
        },
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
          <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-48">
            <Combobox
              options={languageOptions}
              value={languageId}
              onChange={chooseLanguage}
              placeholder={t('Language…')}
              searchPlaceholder={t('Search languages…')}
              emptyMessage={t('No language found')}
              aria-label={t('Language of the new translation')}
              className="w-full"
            />
            {countries.length > 0 && (
              <Select value={countryId === ANY_COUNTRY ? ALL_OPTION : countryId} onValueChange={value => setCountryId(value === ALL_OPTION ? ANY_COUNTRY : value)}>
                <SelectTrigger size="sm" className="w-full text-xs" aria-label={t('Country of the new translation')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>{t('Every country')}</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
            writingStyles={styles}
          />
          <Button type="button" onClick={() => void handleAdd()} disabled={!canAdd} title={writeAccess.allowed ? undefined : writeAccess.reason} className="shrink-0">
            <Plus aria-hidden />
            {t('Add', { context: 'action' })}
          </Button>
        </div>
        {exists && <p className="text-xs text-destructive">{t('The key already has a value for this language, country, style and context.')}</p>}
      </CardContent>
    </Card>
  );
};

/** Search, style, context and order of a key's values (shown from two values on). */
const ValuesToolbar = ({
  search,
  onSearchChange,
  writingStyle,
  onWritingStyleChange,
  context,
  onContextChange,
  order,
  onOrderChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  writingStyle: string;
  onWritingStyleChange: (value: string) => void;
  context: string;
  onContextChange: (value: string) => void;
  order: string;
  onOrderChange: (value: string) => void;
}) => {
  const { t } = useTranslate();
  const select = (label: string, value: string, onChange: (value: string) => void, options: { value: string; label: string }[]) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-full text-xs sm:w-36" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return (
    <div className="mb-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" data-slot="app-translation-values-toolbar">
      <Input
        value={search}
        onChange={event => onSearchChange(event.target.value)}
        placeholder={t('Search values…')}
        aria-label={t('Search the values of this key')}
        className="col-span-2 h-8 text-xs sm:w-48"
      />
      {select(t('Writing style'), writingStyle, onWritingStyleChange, [
        { value: ALL_OPTION, label: t('Every style') },
        ...APP_TRANSLATION_WRITING_STYLE_OPTIONS.map(option => ({ value: option.value, label: t(option.label) })),
      ])}
      {select(t('Context', { context: 'translation-value' }), context, onContextChange, [
        { value: ALL_OPTION, label: t('Singular and plural') },
        ...APP_TRANSLATION_CONTEXT_OPTIONS.map(option => ({ value: option.value, label: t(option.label) })),
      ])}
      {select(t('Order', { context: 'translation-values' }), order, onOrderChange, [
        { value: 'language:asc', label: t('Language A–Z') },
        { value: 'language:desc', label: t('Language Z–A') },
        { value: 'id:asc', label: t('Oldest first') },
        { value: 'id:desc', label: t('Newest first') },
      ])}
    </div>
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
  editableValueLocale: boolean;
  valueActions?: (value: AppTranslationValue, key: AppTranslationKey) => ReactNode;
}

const KeyContent = ({ api, keyId, loadedKey, drawer, editableValueLocale, valueActions }: KeyContentProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const id = useId();
  const isCreate = loadedKey === undefined;
  const languagesQuery = api.useLanguagesQuery(ACTIVE_LANGUAGES_ARG);
  const localesQuery = api.useLocalesQuery(ACTIVE_LOCALES_WITH_COUNTRIES_ARG);
  const [saveKey, saveState] = api.useUpdateAppTranslationKeyMutation();
  const [deleteKey, deleteKeyState] = api.useDeleteAppTranslationKeyMutation();

  const baseline = useMemo(() => (loadedKey ? toKeyForm(loadedKey) : EMPTY_KEY_FORM), [loadedKey]);
  const form = useForm<KeyFormValues>({ mode: 'onTouched', defaultValues: baseline });
  useEffect(() => {
    form.reset(baseline);
  }, [baseline, form]);
  const confirm = useConfirm();
  useUnsavedChangesGuard(useFormDirty(form), confirm);
  // Cancel asks when anything in the drawer is unsaved: the key form or a value row
  const unsavedChanges = useContext(UnsavedChangesContext);
  const discardConfirm = useDiscardChangesConfirm();
  const cancel = async () => {
    const dirty = unsavedChanges ? unsavedChanges.hasUnsavedChanges() : form.formState.isDirty;
    if (dirty && !(await confirm(discardConfirm))) return;
    drawer.close();
  };
  const keyRequiredMessage = t('Enter the key.');

  const languages = languagesQuery.data?.languages.elements;
  const locales = localesQuery.data?.locales.elements;
  const languageCodes: LanguageCodeMap = useMemo(() => toLanguageCodeMap(languages ?? []), [languages]);
  const countryCodes: CountryCodeMap = useMemo(() => toCountryCodeMap(locales ?? []), [locales]);
  const languageById = useMemo(() => new Map((languages ?? []).map(language => [String(language.id), language])), [languages]);
  const allValues = loadedKey?.appTranslationValues?.elements;
  const existingCombinations = useMemo(() => new Set((allValues ?? []).map(appTranslationValueCombination)), [allValues]);

  const [valueSearch, setValueSearch] = useState('');
  const [valueStyle, setValueStyle] = useState(ALL_OPTION);
  const [valueContext, setValueContext] = useState(ALL_OPTION);
  const [valueOrder, setValueOrder] = useState('language:asc');
  const values = useMemo(() => {
    const [by, direction] = valueOrder.split(':') as ['language' | 'id', 'asc' | 'desc'];
    const filtered = filterAppTranslationValues(
      allValues ?? [],
      {
        search: valueSearch,
        writingStyle: valueStyle === ALL_OPTION ? '' : toWritingStyle(valueStyle),
        context: valueContext === ALL_OPTION ? '' : toContext(valueContext),
      },
      languages ?? []
    );
    return sortAppTranslationValuesBy(filtered, languageCodes, by, direction);
  }, [allValues, valueSearch, valueStyle, valueContext, valueOrder, languages, languageCodes]);
  const valueCount = allValues?.length ?? 0;

  const handleDeleteKey = async () => {
    if (!writeAccess.allowed || isCreate || keyId === undefined) return;
    const confirmed = await confirm({
      title: t('Delete the key “%key%”?', { replacements: { key: loadedKey.key ?? keyId } }),
      description: t('The key and all its values are deleted. This cannot be undone.'),
      confirmLabel: t('Delete', { context: 'action' }),
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;
    try {
      await deleteKey({ appTranslationKeyId: keyId }).unwrap();
      notify.success(t('Key deleted'));
      drawer.close();
    } catch (error) {
      notify.error(normalizeDddError(error, t('Failed to delete key')).message);
    }
  };

  const handleSave = async (formValues: KeyFormValues) => {
    if (!writeAccess.allowed) return;
    if (!formValues.key.trim()) {
      form.setError('key', { type: 'required', message: keyRequiredMessage });
      return;
    }
    try {
      const body = toAppTranslationKeyBody(formValues);
      const data = await saveKey({ appTranslationKey: isCreate ? body : { ...body, id: keyId } }).unwrap();
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
            <FormField control={form.control} name="key" label={t('Key')} required>
              {({ field, control }) => (
                <Input
                  {...control}
                  {...field}
                  onBlur={() => {
                    field.onBlur();
                    if (!form.getValues('key').trim()) form.setError('key', { type: 'required', message: keyRequiredMessage });
                  }}
                  onChange={event => {
                    field.onChange(event);
                    if (event.target.value.trim()) form.clearErrors('key');
                  }}
                  placeholder={t('e.g. Save changes')}
                  className="font-mono"
                />
              )}
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
            <>
              {!isCreate && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDeleteKey()}
                  disabled={!writeAccess.allowed || deleteKeyState.isLoading || saveState.isLoading}
                  title={writeAccess.allowed ? undefined : writeAccess.reason}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 aria-hidden />
                  {t('Delete key')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => void cancel()} disabled={saveState.isLoading}>
                {t('Cancel', { context: 'dialog-action' })}
              </Button>
            </>
          }
          primary={
            <FormSubmitButton isPending={saveState.isLoading} pendingLabel={t('Saving…')}>
              {isCreate ? t('Create translation key') : t('Save', { context: 'action' })}
            </FormSubmitButton>
          }
        />
      </Form>
      {!isCreate && (
        <>
          {valueCount === 0 ? (
            <EmptyValue className="block text-sm">{t('No translation values yet.')}</EmptyValue>
          ) : (
            <section>
              <SectionHeader title={t('Values per locale and writing style')} as="h3" className="mb-2" />
              {valueCount > 1 && (
                <ValuesToolbar
                  search={valueSearch}
                  onSearchChange={setValueSearch}
                  writingStyle={valueStyle}
                  onWritingStyleChange={setValueStyle}
                  context={valueContext}
                  onContextChange={setValueContext}
                  order={valueOrder}
                  onOrderChange={setValueOrder}
                />
              )}
              {values.length === 0 ? (
                <EmptyValue className="block text-sm">{t('No value matches.')}</EmptyValue>
              ) : (
                <ul className="space-y-2">
                  {values.map(value => (
                    <TranslationValueRow
                      key={String(value.id)}
                      api={api}
                      value={value}
                      localeKey={appTranslationValueLocaleKey(value, languageCodes)}
                      countryCode={appTranslationValueCountryCode(value, countryCodes)}
                      language={languageById.get(String(value.languageId))}
                      localeEditable={editableValueLocale}
                      languages={languages ?? []}
                      locales={locales ?? []}
                      existingCombinations={existingCombinations}
                      actions={valueActions?.(value, loadedKey)}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
          <AddValueForm
            api={api}
            keyId={loadedKey.id ?? keyId ?? ''}
            languages={languages ?? []}
            locales={locales ?? []}
            existingCombinations={existingCombinations}
          />
        </>
      )}
    </div>
  );
};

export interface AppTranslationKeyDrawerProps {
  api: TranslationsApi;
  /** The list's drawer (`useEntityDrawer`): `?edit=<id>` edits a key, `?create=1` creates one. */
  drawer: EntityDrawer;
  /**
   * The language and the country of a stored value are editable in its row (default `false`: shown as its key); a move
   * onto a combination another value of the key holds is refused.
   */
  editableValueLocale?: boolean;
  /** The host's actions of one stored value, after its Save and Delete (copy, open elsewhere). */
  valueActions?: (value: AppTranslationValue, key: AppTranslationKey) => ReactNode;
}

/**
 * One app translation key in a drawer over the list: create shows the key form (the key is required; an empty template
 * or hint is sent as `null`, the hint trimmed); saving a new key turns the drawer into its edit. Edit adds the values
 * per `locale::style` and country (each saved on its own, never empty; search, style, context and order from two
 * values on) and a form for a new value (the language's supported styles, only combinations the key lacks). Unsaved
 * rows count for the discard question. Writes follow `WriteAccessProvider`.
 */
export const AppTranslationKeyDrawer = ({ api, drawer, editableValueLocale = false, valueActions }: AppTranslationKeyDrawerProps) => {
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
        <KeyContent
          key={drawerKey(shown)}
          api={api}
          keyId={keyId}
          loadedKey={loadedKey}
          drawer={drawer}
          editableValueLocale={editableValueLocale}
          valueActions={valueActions}
        />
      )}
    </FormDrawer>
  );
};
