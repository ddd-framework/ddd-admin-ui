'use client';

import { useMemo, useRef, useState } from 'react';

import type { EntityDrawerUrlAdapter } from '../pure/entityDrawer.ts';
import type { UrlStateAdapter } from '../pure/urlListState.ts';

type Parameters = Readonly<Record<string, string>>;

const applyUpdates = (current: Parameters, updates: Readonly<Record<string, string | null>>): Parameters => {
  const next: Record<string, string> = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) delete next[key];
    else next[key] = value;
  }
  return next;
};

/**
 * Search parameters held in component state instead of the URL: the default adapter of a screen whose host passes no
 * router adapter (a showcase, a test, a dialog). Both adapters share the parameters; `back` undoes the last `push`.
 */
export const useMemoryUrlState = (
  initial: Parameters = {}
): { urlStateAdapter: UrlStateAdapter; drawerUrlAdapter: EntityDrawerUrlAdapter } => {
  const [parameters, setParameters] = useState<Parameters>(initial);
  const historyRef = useRef<Parameters[]>([]);
  return useMemo(() => {
    const get = (key: string) => parameters[key] ?? null;
    const replace = (updates: Readonly<Record<string, string | null>>) => setParameters(current => applyUpdates(current, updates));
    return {
      urlStateAdapter: { get, replace },
      drawerUrlAdapter: {
        get,
        replace,
        push: updates => {
          historyRef.current.push(parameters);
          setParameters(applyUpdates(parameters, updates));
        },
        back: () => {
          const previous = historyRef.current.pop();
          if (previous) setParameters(previous);
        },
      },
    };
  }, [parameters]);
};
