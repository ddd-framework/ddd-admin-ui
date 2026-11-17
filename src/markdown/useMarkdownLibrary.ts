'use client';

import { type RefObject, useEffect, useState } from 'react';

import { loadMarkdownLibrary, type MarkdownLibrary } from './loadMarkdownLibrary.ts';

export type MarkdownLibraryState =
  | { status: 'loading' }
  | { status: 'ready'; library: MarkdownLibrary }
  | { status: 'failed'; error: unknown };

/**
 * The markdown library after hydration: `loading` on the server and in the hydration render (so both match), then
 * `ready` or `failed`. The import starts in an effect, never during render.
 */
export const useMarkdownLibrary = (): MarkdownLibraryState => {
  const [state, setState] = useState<MarkdownLibraryState>({ status: 'loading' });
  useEffect(() => {
    let active = true;
    loadMarkdownLibrary().then(
      library => active && setState({ status: 'ready', library }),
      (error: unknown) => {
        if (!active) return;
        if (process.env.NODE_ENV !== 'production') console.warn('[ddd-admin-ui] the markdown editor could not be loaded', error);
        setState({ status: 'failed', error });
      }
    );
    return () => {
      active = false;
    };
  }, []);
  return state;
};

/** How the editor's own colours are chosen: from the nearest `.dark` ancestor (`auto`) or fixed. */
export type MarkdownColorMode = 'auto' | 'light' | 'dark';

/**
 * `light` or `dark` for the library's `data-color-mode`. `auto` follows the host's `.dark` class on an ancestor of the
 * element (re-read when an ancestor's class changes); before mount it is `light`.
 */
export const useMarkdownColorMode = (ref: RefObject<HTMLElement | null>, mode: MarkdownColorMode): 'light' | 'dark' => {
  const [auto, setAuto] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    if (mode !== 'auto') return;
    const element = ref.current;
    if (!element) return;
    const read = () => setAuto(element.parentElement?.closest('.dark') ? 'dark' : 'light');
    read();
    const observer = new MutationObserver(read);
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      observer.observe(ancestor, { attributes: true, attributeFilter: ['class'] });
    }
    return () => observer.disconnect();
  }, [ref, mode]);
  return mode === 'auto' ? auto : mode;
};
