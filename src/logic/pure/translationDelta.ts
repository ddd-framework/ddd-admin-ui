/**
 * Delta saves of translatable texts (no React, no dependency): a form sends only the `locale::style` keys its user
 * changed since the baseline (the store of the last load or save answer), in merge mode
 * (`replaceExistingTranslations: false`). The server merges the sent store into the stored column key by key: a sent
 * text sets its key, a sent `null` removes it, a key that is not sent stays, and a field left out of the payload keeps
 * its column. A text a background translation (or another user) wrote while the form was open therefore survives the
 * save, which a replace save of the whole loaded store would delete.
 *
 * Next to merge mode the plain value of a nullable translatable property is never sent: a NULL there clears the column
 * on MariaDB but leaves it on PostgreSQL. Clearing is expressed by the nulls per key (`omitTranslatableScalars`).
 */

/** The `objectType` of a `translationInfos` payload. */
export const TRANSLATION_INFOS_OBJECT_TYPE = 'DDD\\Domain\\Base\\Entities\\Translatable\\TranslationInfos';

/** Texts per field as a form or a store holds them (`{ name: { 'de::FORMAL': 'Hallo' } }`); read only. */
export type TranslationTextsByField = Readonly<Record<string, Readonly<Record<string, string>> | undefined>>;

/** The texts of the given fields: `{ [field]: { 'locale::style': text } }`. */
export type FieldTexts<F extends string> = Record<F, Record<string, string>>;

/** What a delta save sends: changed texts, `null` for a cleared one; a field without a change is absent. */
export type TranslationDeltaStore = Record<string, Record<string, string | null>>;

/** The `translationInfos` of a delta save. */
export interface DeltaTranslationInfos {
  objectType: typeof TRANSLATION_INFOS_OBJECT_TYPE;
  replaceExistingTranslations: false;
  translationsStore: TranslationDeltaStore;
}

/** How a form saves its translatable texts: only the changed keys in merge mode, or the whole store replacing the column. */
export type TranslationSaveMode = 'delta' | 'replace';

/** A text as the store holds it: a blank one counts as no text. */
const textOf = (texts: Readonly<Record<string, string>> | undefined, key: string): string | null => {
  const text = texts?.[key];
  return typeof text === 'string' && text.trim() !== '' ? text : null;
};

const keysOf = (...maps: (Readonly<Record<string, string>> | undefined)[]): string[] => {
  const keys = new Set<string>();
  for (const map of maps) for (const key of Object.keys(map ?? {})) keys.add(key);
  return [...keys];
};

/** The non-blank texts of the given fields, as a store of its own (never the caller's objects). */
export const storedTranslationTexts = <F extends string>(translations: TranslationTextsByField, fields: readonly F[]): FieldTexts<F> => {
  const out = {} as FieldTexts<F>;
  for (const field of fields) {
    const texts: Record<string, string> = {};
    for (const key of Object.keys(translations[field] ?? {})) {
      const text = textOf(translations[field], key);
      if (text !== null) texts[key] = text;
    }
    out[field] = texts;
  }
  return out;
};

/**
 * The keys that differ between the baseline and the form: the changed text, `null` for a text that is gone (cleared,
 * blank or removed from the form). A field without a changed key is not in the result; fields outside `fields` never are.
 */
export const buildTranslationDeltaStore = (
  baseline: TranslationTextsByField,
  current: TranslationTextsByField,
  fields: readonly string[]
): TranslationDeltaStore => {
  const delta: TranslationDeltaStore = {};
  for (const field of fields) {
    for (const key of keysOf(baseline[field], current[field])) {
      const before = textOf(baseline[field], key);
      const now = textOf(current[field], key);
      if (before === now) continue;
      delta[field] = { ...(delta[field] ?? {}), [key]: now };
    }
  }
  return delta;
};

/** The `translationInfos` of a delta save: the changed keys in merge mode. */
export const buildDeltaTranslationInfos = (
  baseline: TranslationTextsByField,
  current: TranslationTextsByField,
  fields: readonly string[]
): DeltaTranslationInfos => ({
  objectType: TRANSLATION_INFOS_OBJECT_TYPE,
  replaceExistingTranslations: false,
  translationsStore: buildTranslationDeltaStore(baseline, current, fields),
});

/** Whether the form holds a text change the baseline does not have. */
export const hasTranslationDelta = (
  baseline: TranslationTextsByField,
  current: TranslationTextsByField,
  fields: readonly string[]
): boolean => Object.keys(buildTranslationDeltaStore(baseline, current, fields)).length > 0;

export interface RebasedTranslations<F extends string> {
  /** The new baseline: the non-blank texts of the newer store. */
  baseline: FieldTexts<F>;
  /** The form's texts: the newer store, with every key the user had changed as the user left it. */
  values: FieldTexts<F>;
}

/**
 * A newer store of the record arrived (the answer of a save, a reload after a background translation ended). Keys the
 * user did not touch take the newer text (a key gone on the server is gone in the form); keys the user changed since
 * the old baseline keep the user's text (a cleared one stays cleared, as `''`) and so stay in the next delta. The
 * newer store becomes the baseline.
 */
export const rebaseTranslations = <F extends string>(
  baseline: TranslationTextsByField,
  current: TranslationTextsByField,
  newer: TranslationTextsByField,
  fields: readonly F[]
): RebasedTranslations<F> => {
  const values = {} as FieldTexts<F>;
  for (const field of fields) {
    const texts: Record<string, string> = {};
    for (const key of keysOf(baseline[field], current[field], newer[field])) {
      const touched = textOf(baseline[field], key) !== textOf(current[field], key);
      if (touched) {
        // As typed; a cleared text as the empty text: it still differs from a newer text and is sent as `null`.
        texts[key] = current[field]?.[key] ?? '';
        continue;
      }
      const text = textOf(newer[field], key);
      if (text !== null) texts[key] = text;
    }
    values[field] = texts;
  }
  return { baseline: storedTranslationTexts(newer, fields), values };
};

/**
 * The entity body of a delta save without the plain values of the translatable `fields` (a nullable one sent as NULL
 * next to merge mode clears the column on MariaDB only). `keep` names fields whose plain value must still travel (a
 * `#[NotNull]` property such as a required name). Returns a copy; the body itself is not changed.
 */
export const omitTranslatableScalars = <T extends Readonly<Record<string, unknown>>>(
  body: T,
  fields: readonly string[],
  keep: readonly string[] = []
): T => {
  const out: Record<string, unknown> = { ...body };
  for (const field of fields) if (!keep.includes(field)) delete out[field];
  return out as T;
};

/**
 * The rebase of one edited value (a text, a select) when a newer stored copy arrives: the user's value when it differs
 * from the stored value it started from (touched), else the newer stored value.
 */
export const rebaseEditedValue = <T>(previousStored: T, current: T, newerStored: T): T =>
  Object.is(current, previousStored) ? newerStored : current;
