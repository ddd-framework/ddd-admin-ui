import type { ReactNode } from 'react';
import type { WritingStyle } from '../i18n/store.ts';
import type { NotificationAdapter } from '../logic/pure/notify.ts';
import type { MediaUploadAdapter } from '../media/types.ts';

/** Feeds the package's translation store from a host-owned store. Absent: the host calls `setTranslations`. */
export interface TranslationAdapter {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => {
    languageCode: string;
    /** A host without writing styles answers 'FORMAL'. */
    writingStyle: WritingStyle;
    /** Key = `<text>` or `<text>__<context>`. */
    translations: Readonly<Record<string, string>>;
  };
}

export type StorageKind = 'list-filters' | 'list-view';
/** Builds a browser storage key. Default `ddd-admin-ui.<kind>.<id>`. Must be pure and stable. */
export type StorageKeyFn = (kind: StorageKind, id: string) => string;

export interface AdminUiProviderProps {
  children: ReactNode;
  translations?: TranslationAdapter;
  /** Registered with `setNotificationAdapter` (`./logic`) while the provider is mounted. */
  notifications?: NotificationAdapter;
  storageKey?: StorageKeyFn;
  /** Overlays portal into this element; absent = `document.body`. */
  portalContainer?: HTMLElement | null;
  upload?: MediaUploadAdapter;
}

export interface AdminUiContextValue {
  storageKey: StorageKeyFn;
  upload?: MediaUploadAdapter;
}
