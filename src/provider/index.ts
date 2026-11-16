// The provider entry: the one host provider and its contract.
export { useAdminUi } from './adminUiContext.ts';
export { AdminUiProvider } from './AdminUiProvider.tsx';
export { defaultStorageKey } from './storageKey.ts';
export type {
  AdminUiContextValue,
  AdminUiProviderProps,
  AiTranslationAdapter,
  EntityTranslationRequest,
  NotificationAdapter,
  NotifyAction,
  NotifyOptions,
  StorageKeyFn,
  StorageKind,
  TranslationAdapter,
  UseDrawerUrlAdapter,
  UseUrlStateAdapter,
} from './types.ts';
