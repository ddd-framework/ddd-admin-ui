'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LatestSearch<TResult> {
  /** The answer to the last term asked for; an older answer arriving later is dropped. */
  results: TResult[];
  /** A request for the last term is in flight. */
  isSearching: boolean;
  /** Asks for `term` (pass it as `Combobox.onSearch`); the previous request is aborted. */
  onSearch: (term: string) => void;
  /** The last term asked for. */
  term: string;
}

/**
 * Server search for a picker (`Combobox.onSearch` / `isSearching`): only the answer to the last term is ever shown.
 * Each call aborts the previous request through its `AbortSignal`, and an answer that arrives after a newer term was
 * asked for (out of order, or ignoring the abort) is dropped. `search` may stay a new function on every render; the
 * latest one is used. A failed request gives no results.
 */
export const useLatestSearch = <TResult,>(
  search: (term: string, signal: AbortSignal) => Promise<readonly TResult[]>,
  initialResults: readonly TResult[] = []
): LatestSearch<TResult> => {
  const searchRef = useRef(search);
  searchRef.current = search;
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ results: TResult[]; isSearching: boolean; term: string }>(() => ({
    results: [...initialResults],
    isSearching: false,
    term: '',
  }));

  useEffect(() => () => controllerRef.current?.abort(), []);

  const onSearch = useCallback((term: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    requestRef.current += 1;
    const request = requestRef.current;
    setState(previous => ({ ...previous, isSearching: true, term }));
    searchRef.current(term, controller.signal).then(
      results => {
        if (request === requestRef.current) setState({ results: [...results], isSearching: false, term });
      },
      () => {
        if (request === requestRef.current) setState({ results: [], isSearching: false, term });
      }
    );
  }, []);

  return { ...state, onSearch };
};
