'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * `false` while React renders on the server and while it hydrates server HTML, `true` afterwards — and `true` from the
 * first render of a component that mounts on the client without server HTML. Read browser storage only when it is
 * `true`: the hydration render then matches the server output, and a client-only mount still reads at once.
 */
export const useHydrated = (): boolean => useSyncExternalStore(subscribe, onClient, onServer);
