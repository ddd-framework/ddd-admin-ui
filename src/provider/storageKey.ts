import type { StorageKeyFn } from './types.ts';

/** `ddd-admin-ui.<kind>.<id>` — used when the host passes no `storageKey`. Pure, so server code may call it. */
export const defaultStorageKey: StorageKeyFn = (kind, id) => `ddd-admin-ui.${kind}.${id}`;
