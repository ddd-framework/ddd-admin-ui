// The guarded storage helpers live in ./logic (peer-free); the Next adapters use them from there.
export { readStored, writeStored } from '../logic/browser/storage.ts';
export type { StorageArea } from '../logic/browser/storage.ts';
