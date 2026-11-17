'use client';

import { normalizeTranslationsStore, parseTranslationKey, type TranslationsStore } from '@mgamadeus/ddd-web/contract';
import { useCallback } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import type { TranslatableEntityPayload } from './adminTypes.ts';
import type { TranslationsApi } from './api.ts';

/** The PHP class of a locale in a request body. */
export const LOCALE_OBJECT_TYPE = 'DDD\\Domain\\Common\\Entities\\Locales\\Locale';

export interface EntityTranslationRequest {
  /** The draft entity as the forms send it: `objectType`, `id`, plain values and `translationInfos`. */
  entity: TranslatableEntityPayload;
  /** Target locale as a full key (`de::FORMAL`). */
  locale: string;
  signal: AbortSignal;
}

/** Translates a draft into one locale and answers the translated entity's translations store. */
export type EntityTranslator = (request: EntityTranslationRequest) => Promise<TranslationsStore>;

export interface EntitiesTranslationRequest {
  /** The drafts, translated together in one request (`objectType`, `id`, plain values, `translationInfos` each). */
  entities: readonly TranslatableEntityPayload[];
  /** Target locale as a full key (`de::FORMAL`). */
  locale: string;
  signal: AbortSignal;
}

/** Translates several drafts into one locale in one request and answers one translations store per draft, in order. */
export type EntitiesTranslator = (request: EntitiesTranslationRequest) => Promise<TranslationsStore[]>;

export interface UseEntityTranslatorOptions {
  /** The content's default locale (`en::FORMAL`): its language is marked as the default of the target locale. */
  defaultLocale?: string;
  /** `false` switches the AI translation off (the hook answers `undefined`, the controls hide). */
  enabled?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The request of several drafts into one locale: one `translateEntities` call, abortable through `signal`, answering
 * one translations store per draft in the order sent.
 */
const useTranslateEntitiesRequest = (api: TranslationsApi, defaultLocale: string) => {
  const { t } = useTranslate();
  const [translateEntities] = api.useTranslateEntitiesMutation();
  const defaultLanguage = parseTranslationKey(defaultLocale)?.languageCode ?? 'en';
  return useCallback(
    async (entities: readonly TranslatableEntityPayload[], locale: string, signal: AbortSignal): Promise<TranslationsStore[]> => {
      const languageCode = parseTranslationKey(locale)?.languageCode ?? locale;
      const request = translateEntities({
        entitiesToTranslate: { elements: [...entities] },
        localesToTranslate: {
          elements: [{ objectType: LOCALE_OBJECT_TYPE, languageCode, countryShortCode: null, isDefaultLocaleForLanguage: languageCode === defaultLanguage }],
        },
      });
      if (signal.aborted) request.abort();
      const abort = () => request.abort();
      signal.addEventListener('abort', abort, { once: true });
      try {
        const translated = (await request.unwrap()).translatedEntities?.elements ?? [];
        if (translated.length < entities.length) throw new Error(t('No translation returned for %locale%', { replacements: { locale } }));
        return translated.slice(0, entities.length).map(entity => {
          const infos = entity.translationInfos;
          return isRecord(infos) ? normalizeTranslationsStore(infos.translationsStore) : {};
        });
      } finally {
        signal.removeEventListener('abort', abort);
      }
    },
    [translateEntities, defaultLanguage, t]
  );
};

/**
 * The AI translation of an entity draft (`POST …/translateEntities`), one request per target locale: feed it to
 * `useTranslationRunner` (`./logic`), which runs the locales a few at a time and lets each finish on its own — a long
 * entity in many locales in one request runs into gateway timeouts. Aborting the runner aborts the requests in flight.
 * Answers `undefined` while `enabled` is false.
 *
 * ```ts
 * const translator = useEntityTranslator(translationsApi);
 * const runner = useTranslationRunner();
 * runner.run(targets, async (locale, signal) => applyStore(await translator!({ entity: draft, locale, signal })));
 * ```
 */
export const useEntityTranslator = (api: TranslationsApi, { defaultLocale = 'en::FORMAL', enabled = true }: UseEntityTranslatorOptions = {}): EntityTranslator | undefined => {
  const translate = useTranslateEntitiesRequest(api, defaultLocale);
  const translator = useCallback<EntityTranslator>(
    async ({ entity, locale, signal }) => (await translate([entity], locale, signal))[0] ?? {},
    [translate]
  );
  return enabled ? translator : undefined;
};

/**
 * The AI translation of several entity drafts in one request per target locale (a form with child entities, a list
 * of rows): one `translateEntities` call per locale with every draft, one translations store per draft back, in
 * order. Feed it to `useTranslationRunner` like `useEntityTranslator`. Answers `undefined` while `enabled` is false.
 *
 * ```ts
 * const translator = useEntitiesTranslator(translationsApi);
 * runner.run(targets, async (locale, signal) => applyStores(await translator!({ entities: drafts, locale, signal })));
 * ```
 */
export const useEntitiesTranslator = (
  api: TranslationsApi,
  { defaultLocale = 'en::FORMAL', enabled = true }: UseEntityTranslatorOptions = {}
): EntitiesTranslator | undefined => {
  const translate = useTranslateEntitiesRequest(api, defaultLocale);
  const translator = useCallback<EntitiesTranslator>(
    ({ entities, locale, signal }) => (entities.length === 0 ? Promise.resolve([]) : translate(entities, locale, signal)),
    [translate]
  );
  return enabled ? translator : undefined;
};
