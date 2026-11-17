'use client';

import { usePathname } from 'next/navigation';

/**
 * The Next router's pathname as the provider's pathname hook (`AdminUiProvider usePathname={useNextPathname}`): the
 * path without the base path, query or hash, known on the server too, so the shell's active entry and breadcrumbs are
 * in the server HTML. No `<Suspense>` needed (it does not read the search parameters).
 */
export const useNextPathname = (): string | null => usePathname();
