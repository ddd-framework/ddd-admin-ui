import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recordingBaseApi, tagMatches } from '../../test/unit/injectedApiHarness.ts';
import { appTranslationValueLocaleKey, sortAppTranslationValues, toLanguageCodeMap } from './adminFormat.ts';
import { APP_TRANSLATIONS_TAG, buildTranslationsRequests, createTranslationsApi, LANGUAGES_TAG, LOCALES_TAG } from './api.ts';

const refetchedBy = (endpoints: ReturnType<typeof recordingBaseApi>['endpoints'], mutation: string, query: string): boolean => {
  const invalidated = endpoints[mutation]?.invalidatesTags ?? [];
  return (endpoints[query]?.providesTags ?? []).some(tag => invalidated.some(other => tagMatches(tag, other)));
};

describe('createTranslationsApi', () => {
  it('injects the sixteen operations under three tag types and returns their hooks', () => {
    const { api, endpoints, tagTypes } = recordingBaseApi();
    const translationsApi = createTranslationsApi({ baseApi: api, apiPrefix: '/api/admin/common' });
    assert.deepEqual(tagTypes, [APP_TRANSLATIONS_TAG, LANGUAGES_TAG, LOCALES_TAG]);
    assert.equal(Object.keys(endpoints).length, 16);
    assert.equal(Object.keys(translationsApi).length, 16);
    const hooks = translationsApi as unknown as Record<string, () => string>;
    assert.equal(hooks.useUpdateLocaleMutation?.(), 'adminUiUpdateLocale');
    assert.equal(hooks.useLocalesQuery?.(), 'adminUiLocales');
  });

  it('builds the requests of the controllers, with path segments that can differ', () => {
    const requests = buildTranslationsRequests('/api/admin/common/');
    assert.equal(
      requests.appTranslationKeys({ expand: 'appTranslationValues', orderBy: 'id DESC', top: 50, skip: 0 }).url,
      '/api/admin/common/app-translations/keys/list?orderBy=id%20DESC&top=50&skip=0&expand=appTranslationValues'
    );
    assert.equal(requests.appTranslationKey({ appTranslationKeyId: 7, expand: 'appTranslationValues' }).url, '/api/admin/common/app-translations/keys/7?expand=appTranslationValues');
    assert.deepEqual(requests.updateAppTranslationKey({ appTranslationKey: { key: 'Save' } }), {
      url: '/api/admin/common/app-translations/keys',
      method: 'PATCH',
      body: { appTranslationKey: { key: 'Save' } },
    });
    assert.deepEqual(requests.deleteAppTranslationValue({ appTranslationValueId: 3 }), { url: '/api/admin/common/app-translations/values/3', method: 'DELETE' });
    assert.equal(requests.generateAppTranslations({ localeId: 12, writingStyle: 'FORMAL' }).url, '/api/admin/common/app-translations/keys/generate/12?writingStyle=FORMAL');
    assert.equal(requests.generateAllAppTranslations().url, '/api/admin/common/app-translations/keys/generate-all');
    assert.equal(requests.appTranslationCompleteness().url, '/api/admin/common/app-translations/keys/completeness');
    assert.equal(requests.importLanguagesFromConfig().url, '/api/admin/common/languages/importFromConfig');
    assert.equal(requests.importLocalesFromConfig().url, '/api/admin/common/locales/importFromConfig');
    assert.deepEqual(requests.updateLocale({ locale: { id: 1, isActive: false } }), { url: '/api/admin/common/locales', method: 'PATCH', body: { locale: { id: 1, isActive: false } } });
    assert.equal(requests.translateEntities({ entitiesToTranslate: {}, localesToTranslate: {} }).url, '/api/admin/common/translations/translateEntities');
    const renamed = buildTranslationsRequests('/api', { appTranslations: '/appTranslations/' });
    assert.equal(renamed.appTranslationCompleteness().url, '/api/appTranslations/keys/completeness');
  });

  it('refetches what a write changes', () => {
    const { api, endpoints } = recordingBaseApi();
    createTranslationsApi({ baseApi: api, apiPrefix: '/c' });
    // the isActive toggle of a locale: the locales and the completeness (it counts active locales)
    assert.equal(refetchedBy(endpoints, 'adminUiUpdateLocale', 'adminUiLocales'), true);
    assert.equal(refetchedBy(endpoints, 'adminUiUpdateLocale', 'adminUiAppTranslationCompleteness'), true);
    assert.equal(refetchedBy(endpoints, 'adminUiUpdateLocale', 'adminUiLanguages'), false);
    assert.equal(refetchedBy(endpoints, 'adminUiUpdateLanguage', 'adminUiLanguages'), true);
    assert.equal(refetchedBy(endpoints, 'adminUiImportLocalesFromConfig', 'adminUiLocales'), true);
    assert.equal(refetchedBy(endpoints, 'adminUiUpdateAppTranslationValue', 'adminUiAppTranslationKey'), true);
    assert.equal(refetchedBy(endpoints, 'adminUiDeleteAppTranslationKey', 'adminUiAppTranslationKeys'), true);
    assert.equal(refetchedBy(endpoints, 'adminUiGenerateAppTranslations', 'adminUiAppTranslationCompleteness'), true);
    assert.deepEqual(endpoints.adminUiTranslateEntities?.invalidatesTags, []);
  });

  it('injects once per api, prefix and paths', () => {
    const recorder = recordingBaseApi();
    const first = createTranslationsApi({ baseApi: recorder.api, apiPrefix: '/c' });
    assert.equal(createTranslationsApi({ baseApi: recorder.api, apiPrefix: '/c/' }), first);
    assert.notEqual(createTranslationsApi({ baseApi: recorder.api, apiPrefix: '/c', paths: { languages: 'langs' } }), first);
    assert.equal(recorder.injections(), 2);
  });
});

describe('translation admin helpers', () => {
  it('labels and orders values by locale::style, English first', () => {
    const codes = toLanguageCodeMap([
      { id: 1, languageCode: 'en' },
      { id: 2, languageCode: 'de' },
    ]);
    const values = sortAppTranslationValues(
      [
        { id: 3, languageId: 2, writingStyle: 'FORMAL' },
        { id: 4, languageId: 2, writingStyle: 'INFORMAL' },
        { id: 5, languageId: 1, writingStyle: 'INFORMAL' },
        { id: 6, languageId: 9, writingStyle: 'INFORMAL' },
      ],
      codes
    );
    assert.deepEqual(values.map(value => appTranslationValueLocaleKey(value, codes)), ['en::INFORMAL', 'de::INFORMAL', 'de::FORMAL', '?::INFORMAL']);
  });
});
