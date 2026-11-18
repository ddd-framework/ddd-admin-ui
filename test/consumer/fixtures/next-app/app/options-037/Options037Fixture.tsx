'use client';

// The options of 0.3.7 in the browser: the app translations screen with several languages in "has a value in" (from a
// fixed URL state), the card view's sort select, and the host's estimate in the confirmation of "Generate all missing"
// (loading first, then the host content).
import { useMemo } from 'react';
import type { ListQueryHook, UrlStateAdapter } from '@mgamadeus/ddd-admin-ui/logic';
import { showcaseTranslationsData } from '@mgamadeus/ddd-admin-ui/showcase';
import {
  type AppTranslationKeysResponse,
  AppTranslationsScreen,
  type AppTranslationsGenerationScope,
  createStaticTranslationsApi,
  type TranslationsListArg,
} from '@mgamadeus/ddd-admin-ui/translations';

const translationsApi = createStaticTranslationsApi(showcaseTranslationsData);

declare global {
  interface Window {
    __options037ListArgs?: TranslationsListArg;
  }
}

const useListQuery: ListQueryHook<TranslationsListArg, AppTranslationKeysResponse> = (args, options) => {
  if (typeof window !== 'undefined') window.__options037ListArgs = args;
  return translationsApi.useAppTranslationKeysQuery(args, options);
};

const loadGenerationPreview = (scope: AppTranslationsGenerationScope) =>
  new Promise<{ keys: number; scope: string }>(resolve => setTimeout(() => resolve({ keys: 42, scope: scope.kind }), 600));

export function Options037Fixture() {
  const state = useMemo(() => new Map<string, string>([['language', '1,2']]), []);
  const urlStateAdapter = useMemo<UrlStateAdapter>(
    () => ({
      get: key => state.get(key) ?? null,
      replace: updates => {
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '') state.delete(key);
          else state.set(key, value);
        }
      },
    }),
    [state]
  );
  return (
    <main className="p-6">
      <AppTranslationsScreen
        api={translationsApi}
        asSpecimen
        urlStateAdapter={urlStateAdapter}
        useListQuery={useListQuery}
        languageFilter="multiple"
        displayMode="grid"
        cardSort
        loadGenerationPreview={loadGenerationPreview}
        renderGenerationEstimate={preview => {
          const estimate = preview as { keys: number; scope: string };
          return (
            <p data-host-estimate="">
              Host estimate: {estimate.keys} keys ({estimate.scope})
            </p>
          );
        }}
      />
    </main>
  );
}
