import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recordingBaseApi, tagMatches } from '../../test/unit/injectedApiHarness.ts';
import {
  appTranslationValueCombination,
  appTranslationValueCountryCode,
  filterAppTranslationValues,
  sortAppTranslationValuesBy,
  supportedWritingStylesOf,
  toAppTranslationKeyBody,
  toCountryCodeMap,
} from './adminFormat.ts';
import { buildAppTranslationKeysBulkDeleteRequest, createTranslationsApi } from './api.ts';
import { appTranslationKeysOrderBy, buildAppTranslationKeysListArgs, renameUrlStateKeys } from './appTranslationsList.ts';

const NO_FILTERS = { id: '', key: '', translation: '' };

describe('app translation keys list arguments', () => {
  it('keep the request of the unsorted list (id DESC, values expanded)', () => {
    assert.deepEqual(buildAppTranslationKeysListArgs(NO_FILTERS), { expand: 'appTranslationValues', orderBy: 'id DESC' });
    assert.deepEqual(buildAppTranslationKeysListArgs(NO_FILTERS, null), { expand: 'appTranslationValues', orderBy: 'id DESC' });
  });

  it('sort by id or key (ties by id)', () => {
    assert.equal(appTranslationKeysOrderBy({ key: 'id', direction: 'asc' }), 'id ASC');
    assert.equal(appTranslationKeysOrderBy({ key: 'key', direction: 'asc' }), 'key ASC, id ASC');
    assert.equal(appTranslationKeysOrderBy({ key: 'key', direction: 'desc' }), 'key DESC, id DESC');
  });

  it('build the filters as before', () => {
    const args = buildAppTranslationKeysListArgs({ id: '12', key: 'save', translation: '' });
    assert.equal(args.filters, "id eq '12' and key eq '*save*'");
  });
});

describe('renameUrlStateKeys', () => {
  it('reads, writes and restores under the URL names', () => {
    const url = new Map<string, string>([['keyId', '5']]);
    const writes: Record<string, string | null>[] = [];
    const adapter = renameUrlStateKeys(
      { get: key => url.get(key) ?? null, replace: updates => writes.push({ ...updates }), restore: () => ({ keyId: '7', key: 'x' }) },
      { id: 'keyId' }
    );
    assert.equal(adapter.get('id'), '5');
    adapter.replace({ id: '9', key: 'save' });
    assert.deepEqual(writes, [{ keyId: '9', key: 'save' }]);
    assert.deepEqual(adapter.restore?.(), { id: '7', key: 'x' });
  });
});

describe('app translation values', () => {
  const languages = [
    { id: 1, languageCode: 'en', name: 'English', supportedWritingStyles: 'INFORMAL' },
    { id: 2, languageCode: 'de', name: 'German', supportedWritingStyles: 'FORMAL_AND_INFORMAL' },
  ];
  const values = [
    { id: 3, languageId: 2, translation: 'Speichern', writingStyle: 'FORMAL', context: 'ONE' },
    { id: 1, languageId: 1, translation: 'Save', writingStyle: 'INFORMAL', context: 'ONE' },
    { id: 2, languageId: 2, countryId: 40, translation: 'Sichern', writingStyle: 'INFORMAL', context: 'MANY' },
  ];

  it('offer the styles a language supports', () => {
    assert.deepEqual(supportedWritingStylesOf(languages[0]), ['INFORMAL']);
    assert.deepEqual(supportedWritingStylesOf({ supportedWritingStyles: 'FORMAL' }), ['FORMAL']);
    assert.deepEqual(supportedWritingStylesOf(undefined), ['INFORMAL', 'FORMAL']);
  });

  it('tell combinations apart by country', () => {
    assert.notEqual(appTranslationValueCombination({ languageId: 2, writingStyle: 'INFORMAL', context: 'MANY' }), appTranslationValueCombination(values[2] ?? {}));
    assert.equal(appTranslationValueCountryCode(values[2] ?? {}, toCountryCodeMap([{ countryId: 40, countryShortCode: 'AT' }])), 'AT');
    assert.equal(appTranslationValueCountryCode(values[0] ?? {}, {}), null);
  });

  it('filter by text, language, style and context, and sort by id', () => {
    assert.deepEqual(filterAppTranslationValues(values, { search: 'german' }, languages).map(value => value.id), [3, 2]);
    assert.deepEqual(filterAppTranslationValues(values, { search: 'save' }, languages).map(value => value.id), [1]);
    assert.deepEqual(filterAppTranslationValues(values, { writingStyle: 'INFORMAL', context: 'MANY' }, languages).map(value => value.id), [2]);
    assert.deepEqual(sortAppTranslationValuesBy(values, {}, 'id', 'desc').map(value => value.id), [3, 2, 1]);
  });

  it('send an empty template or hint as null, the hint trimmed', () => {
    const body = toAppTranslationKeyBody({
      key: 'Save',
      translationTemplate: '  ',
      translationHint: '  On the save button ',
      requiresContext: false,
      doNotTranslateAutomatically: false,
      reTranslate: true,
    });
    assert.equal(body.translationTemplate, null);
    assert.equal(body.translationHint, 'On the save button');
    assert.equal(toAppTranslationKeyBody({ ...body, key: 'x', translationTemplate: '', translationHint: '' } as never).translationHint, null);
  });
});

describe('bulk delete of keys', () => {
  it('is absent without the option and one invalidating request with it', () => {
    const plain = createTranslationsApi({ baseApi: recordingBaseApi().api, apiPrefix: '/api/admin/common' });
    assert.equal(plain.useBulkDeleteAppTranslationKeysMutation, undefined);
    const { api, endpoints } = recordingBaseApi();
    const withBulk = createTranslationsApi({ baseApi: api, apiPrefix: '/api/admin/common', bulkDelete: true });
    assert.equal(typeof withBulk.useBulkDeleteAppTranslationKeysMutation, 'function');
    const invalidated = endpoints.adminUiBulkDeleteAppTranslationKeys?.invalidatesTags ?? [];
    assert.ok((endpoints.adminUiAppTranslationKeys?.providesTags ?? []).some(tag => invalidated.some(other => tagMatches(tag, other))));
  });

  it('builds its request on the app translations segment', () => {
    assert.deepEqual(buildAppTranslationKeysBulkDeleteRequest('/api/admin/common/')({ appTranslationKeyIds: [1, 2] }), {
      url: '/api/admin/common/app-translations/keys/bulk/delete',
      method: 'POST',
      body: { appTranslationKeyIds: [1, 2] },
    });
    assert.deepEqual(
      buildAppTranslationKeysBulkDeleteRequest('/api', { appTranslations: 'appTranslations' }, { path: 'keys/delete', method: 'DELETE', body: ids => ({ ids }) })({
        appTranslationKeyIds: ['5'],
      }),
      { url: '/api/appTranslations/keys/delete', method: 'DELETE', body: { ids: ['5'] } }
    );
  });
});
