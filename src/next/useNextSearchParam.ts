'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { setSearchParamsNavigator, writeSearchParams } from './searchParamsWriter.ts';

/** One search parameter of the current Next route, written through the shared queue. */
export const useNextSearchParam = (name: string): [string | null, (value: string | null) => void] => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setSearchParamsNavigator((href) => router.replace(href, { scroll: false }));
  }, [router, pathname]);

  const setValue = useCallback((value: string | null) => writeSearchParams({ [name]: value }), [name]);
  return [searchParams.get(name), setValue];
};
