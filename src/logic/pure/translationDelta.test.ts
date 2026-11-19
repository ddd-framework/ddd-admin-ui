import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDeltaTranslationInfos,
  buildTranslationDeltaStore,
  hasTranslationDelta,
  omitTranslatableScalars,
  rebaseEditedValue,
  rebaseTranslations,
  storedTranslationTexts,
  TRANSLATION_INFOS_OBJECT_TYPE,
  type TranslationDeltaStore,
} from './translationDelta.ts';
import { buildTranslationInfos } from './translationState.ts';

const FIELDS = ['name', 'description'] as const;

type Column = Record<string, string>;
type Columns = Record<string, Column | null>;

/**
 * The server's merge mode as proven over HTTP: a sent text sets its key, a sent `null` removes it, all keys removed
 * leave `{}`, `""` is stored as `""`, a field left out of the payload keeps its column. Replace mode writes the sent
 * store as the column of every sent field.
 */
const applyOnServer = (stored: Columns, store: TranslationDeltaStore | Record<string, Column>, replace: boolean): Columns => {
  const next: Columns = { ...stored };
  for (const [field, texts] of Object.entries(store)) {
    if (replace) {
      next[field] = { ...(texts as Column) };
      continue;
    }
    const column: Column = { ...(next[field] ?? {}) };
    for (const [key, text] of Object.entries(texts)) {
      if (text === null) delete column[key];
      else column[key] = text;
    }
    next[field] = column;
  }
  return next;
};

describe('buildTranslationDeltaStore', () => {
  it('sends nothing when nothing changed', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello' }, description: {} };
    const current = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello' }, description: { 'fr::FORMAL': '' } };
    assert.deepEqual(buildTranslationDeltaStore(baseline, current, FIELDS), {});
    assert.equal(hasTranslationDelta(baseline, current, FIELDS), false);
  });

  it('sends only the changed key of the changed field', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello' }, description: { 'de::FORMAL': 'Text' } };
    const current = { name: { 'de::FORMAL': 'Hallo zusammen', 'en::FORMAL': 'Hello' }, description: { 'de::FORMAL': 'Text' } };
    assert.deepEqual(buildTranslationDeltaStore(baseline, current, FIELDS), { name: { 'de::FORMAL': 'Hallo zusammen' } });
    assert.equal(hasTranslationDelta(baseline, current, FIELDS), true);
  });

  it('sends a cleared text as null, also when its key is gone from the form or holds only blanks', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello', 'fr::FORMAL': 'Salut' }, description: {} };
    const current = { name: { 'de::FORMAL': '', 'en::FORMAL': '   ' }, description: {} };
    assert.deepEqual(buildTranslationDeltaStore(baseline, current, FIELDS), {
      name: { 'de::FORMAL': null, 'en::FORMAL': null, 'fr::FORMAL': null },
    });
  });

  it('sends a new key and keeps the writing styles apart', () => {
    const baseline = { name: { 'de::FORMAL': 'Guten Tag' }, description: {} };
    const current = { name: { 'de::FORMAL': 'Guten Tag', 'de::INFORMAL': 'Hi' }, description: { 'en::FORMAL': 'New' } };
    assert.deepEqual(buildTranslationDeltaStore(baseline, current, FIELDS), {
      name: { 'de::INFORMAL': 'Hi' },
      description: { 'en::FORMAL': 'New' },
    });
  });

  it('never sends a key of a field the form does not edit', () => {
    const baseline = { name: {}, other: { 'de::FORMAL': 'Stays' } };
    const current = { name: { 'de::FORMAL': 'New' }, other: {} };
    assert.deepEqual(buildTranslationDeltaStore(baseline, current, ['name']), { name: { 'de::FORMAL': 'New' } });
  });

  it('treats a missing field on either side as empty', () => {
    assert.deepEqual(buildTranslationDeltaStore({}, { name: { 'de::FORMAL': 'New' } }, FIELDS), { name: { 'de::FORMAL': 'New' } });
    assert.deepEqual(buildTranslationDeltaStore({ name: { 'de::FORMAL': 'Old' } }, {}, FIELDS), { name: { 'de::FORMAL': null } });
  });
});

describe('buildDeltaTranslationInfos', () => {
  it('is in merge mode and carries the object type', () => {
    assert.deepEqual(buildDeltaTranslationInfos({ name: {} }, { name: { 'de::FORMAL': 'New' } }, ['name']), {
      objectType: TRANSLATION_INFOS_OBJECT_TYPE,
      replaceExistingTranslations: false,
      translationsStore: { name: { 'de::FORMAL': 'New' } },
    });
  });

  it('writes a cleared key as a JSON null', () => {
    const payload = buildDeltaTranslationInfos({ name: { 'fr::FORMAL': 'Salut' } }, { name: {} }, ['name']);
    assert.equal(JSON.stringify(payload.translationsStore), '{"name":{"fr::FORMAL":null}}');
  });
});

describe('delta saves on the server (null, empty, omitted)', () => {
  it('a null removes only its key; a field without a change is left out and keeps its column', () => {
    const stored: Columns = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: { 'de::FORMAL': 'Text' } };
    const baseline = storedTranslationTexts(stored as Record<string, Column>, FIELDS);
    const current = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': '' }, description: { 'de::FORMAL': 'Text' } };
    const payload = buildDeltaTranslationInfos(baseline, current, FIELDS);
    assert.equal('description' in payload.translationsStore, false);
    assert.deepEqual(applyOnServer(stored, payload.translationsStore, false), {
      name: { 'de::FORMAL': 'Hallo' },
      description: { 'de::FORMAL': 'Text' },
    });
  });

  it('clearing every key of a field leaves an empty column ({}), not a NULL', () => {
    const stored: Columns = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello' } };
    const payload = buildDeltaTranslationInfos(stored as Record<string, Column>, { name: {} }, ['name']);
    assert.deepEqual(applyOnServer(stored, payload.translationsStore, false), { name: {} });
  });

  it('never sends an empty text (the server would store "" as ""): a blank is a removal', () => {
    const payload = buildDeltaTranslationInfos({ name: { 'de::FORMAL': 'Hallo' } }, { name: { 'de::FORMAL': ' ', 'fr::FORMAL': '' } }, ['name']);
    assert.deepEqual(payload.translationsStore, { name: { 'de::FORMAL': null } });
    assert.equal(Object.values(payload.translationsStore.name ?? {}).some(text => text === ''), false);
  });

  it('a background write survives a delta save and is lost by a replace save of the loaded store', () => {
    const loaded = { name: { 'de::FORMAL': 'Hallo' }, description: { 'de::FORMAL': 'Text' } };
    const edited = { name: { 'de::FORMAL': 'Hallo' }, description: { 'de::FORMAL': 'Text, new' } };
    // meanwhile a background translation stored the French name
    const onServer: Columns = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: { 'de::FORMAL': 'Text' } };

    const delta = buildDeltaTranslationInfos(loaded, edited, FIELDS);
    assert.deepEqual(applyOnServer(onServer, delta.translationsStore, false), {
      name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' },
      description: { 'de::FORMAL': 'Text, new' },
    });

    const replace = buildTranslationInfos(edited, {}, FIELDS, 'de::FORMAL');
    assert.equal(replace.replaceExistingTranslations, true);
    assert.deepEqual(applyOnServer(onServer, replace.translationsStore ?? {}, true).name, { 'de::FORMAL': 'Hallo' });
  });
});

describe('rebaseTranslations', () => {
  it('takes a newer text for a key the user did not touch', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo' }, description: {} };
    const current = { name: { 'de::FORMAL': 'Hallo' }, description: {} };
    const newer = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: { 'fr::FORMAL': 'Texte' } };
    const rebased = rebaseTranslations(baseline, current, newer, FIELDS);
    assert.deepEqual(rebased.values, newer);
    assert.deepEqual(rebased.baseline, newer);
    assert.deepEqual(buildTranslationDeltaStore(rebased.baseline, rebased.values, FIELDS), {});
  });

  it('keeps what the user typed and leaves it in the next delta', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello' }, description: {} };
    const current = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello there' }, description: { 'de::FORMAL': 'New' } };
    const newer = { name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello', 'fr::FORMAL': 'Salut' }, description: {} };
    const rebased = rebaseTranslations(baseline, current, newer, FIELDS);
    assert.deepEqual(rebased.values, {
      name: { 'de::FORMAL': 'Hallo', 'en::FORMAL': 'Hello there', 'fr::FORMAL': 'Salut' },
      description: { 'de::FORMAL': 'New' },
    });
    assert.deepEqual(buildTranslationDeltaStore(rebased.baseline, rebased.values, FIELDS), {
      name: { 'en::FORMAL': 'Hello there' },
      description: { 'de::FORMAL': 'New' },
    });
  });

  it('keeps a key the user cleared as cleared, also when a newer text arrived for it', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: {} };
    const current = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': '' }, description: {} };
    const newer = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Bonjour' }, description: {} };
    const rebased = rebaseTranslations(baseline, current, newer, FIELDS);
    assert.deepEqual(rebased.values.name, { 'de::FORMAL': 'Hallo', 'fr::FORMAL': '' });
    assert.deepEqual(buildTranslationDeltaStore(rebased.baseline, rebased.values, FIELDS), { name: { 'fr::FORMAL': null } });
  });

  it('drops a key that is gone on the server when the user did not touch it', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: {} };
    const current = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: {} };
    const newer = { name: { 'de::FORMAL': 'Hallo' }, description: {} };
    const rebased = rebaseTranslations(baseline, current, newer, FIELDS);
    assert.deepEqual(rebased.values.name, { 'de::FORMAL': 'Hallo' });
    assert.deepEqual(buildTranslationDeltaStore(rebased.baseline, rebased.values, FIELDS), {});
  });

  it('has no delta left when the user typed what the server now holds', () => {
    const baseline = { name: { 'de::FORMAL': 'Hallo' }, description: {} };
    const current = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: {} };
    const newer = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: {} };
    const rebased = rebaseTranslations(baseline, current, newer, FIELDS);
    assert.deepEqual(buildTranslationDeltaStore(rebased.baseline, rebased.values, FIELDS), {});
  });

  it('the race: a machine text arrives while the user edits another field; the save sends only the edit', () => {
    const loaded = { name: { 'de::FORMAL': 'Hallo' }, description: { 'de::FORMAL': 'Text' } };
    const edited = { name: { 'de::FORMAL': 'Hallo' }, description: { 'de::FORMAL': 'Text, new' } };
    // a save BEFORE the form learns of the machine's key: only the edit travels, the machine's key is not named
    assert.deepEqual(buildTranslationDeltaStore(loaded, edited, FIELDS), { description: { 'de::FORMAL': 'Text, new' } });
    // the background part ended; the form reloads and rebases: the machine's key shows, the edit stays the only delta
    const newer = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' }, description: { 'de::FORMAL': 'Text' } };
    const rebased = rebaseTranslations(loaded, edited, newer, FIELDS);
    assert.deepEqual(rebased.values.name, { 'de::FORMAL': 'Hallo', 'fr::FORMAL': 'Salut' });
    assert.deepEqual(buildTranslationDeltaStore(rebased.baseline, rebased.values, FIELDS), { description: { 'de::FORMAL': 'Text, new' } });
  });
});

describe('storedTranslationTexts and omitTranslatableScalars', () => {
  it('copies the non-blank texts of the named fields', () => {
    const translations = { name: { 'de::FORMAL': 'Hallo', 'fr::FORMAL': ' ' }, other: { 'de::FORMAL': 'x' } };
    const stored = storedTranslationTexts(translations, ['name', 'description']);
    assert.deepEqual(stored, { name: { 'de::FORMAL': 'Hallo' }, description: {} });
    assert.notEqual(stored.name, translations.name);
  });

  it('leaves out the plain values of the translatable fields, keeps a required one and the rest', () => {
    const body = { id: 4, name: 'Hallo', description: null, active: true };
    assert.deepEqual(omitTranslatableScalars(body, FIELDS), { id: 4, active: true });
    assert.deepEqual(omitTranslatableScalars(body, FIELDS, ['name']), { id: 4, name: 'Hallo', active: true });
    assert.equal(body.description, null);
  });
});

describe('rebaseEditedValue', () => {
  it('takes the newer stored value when the user left the value as stored, keeps a touched one', () => {
    assert.equal(rebaseEditedValue('Hallo', 'Hallo', 'Hallo, neu'), 'Hallo, neu');
    assert.equal(rebaseEditedValue('Hallo', 'Hallo du', 'Hallo, neu'), 'Hallo du');
    assert.equal(rebaseEditedValue('ONE', 'ONE', 'MANY'), 'MANY');
  });
});
