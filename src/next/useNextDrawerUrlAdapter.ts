'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import { useAdminUi } from '../provider/adminUiContext.ts';
import { flushSearchParamsWrites, queueShallowSearchParamsWrite } from './searchParamsWriter.ts';

/**
 * The Next router as `useEntityDrawer`'s URL adapter: reads `useSearchParams` (the screen renders inside
 * `<Suspense>`), writes `?edit=` / `?create=` shallowly through the one URL writer (`history.pushState` /
 * `replaceState`, which Next keeps in step with `useSearchParams` without a server round trip — the list behind the
 * drawer stays mounted, scroll kept), and keeps every other parameter (the list's filters, `?view=`).
 *
 * `const drawer = useEntityDrawer({ adapter: useNextDrawerUrlAdapter() });`
 */
export const useNextDrawerUrlAdapter = (): EntityDrawerUrlAdapter => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { preserveSearchParams } = useAdminUi();

  return useMemo<EntityDrawerUrlAdapter>(
    () => ({
      get: key => searchParams.get(key),
      push: updates => queueShallowSearchParamsWrite('push', updates, { preserve: preserveSearchParams }),
      replace: updates => queueShallowSearchParamsWrite('replace', updates, { preserve: preserveSearchParams }),
      back: () => {
        flushSearchParamsWrites();
        router.back();
      },
    }),
    [router, searchParams, preserveSearchParams]
  );
};
