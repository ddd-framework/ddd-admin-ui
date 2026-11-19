import type { TranslationsStore } from '@mgamadeus/ddd-web/contract';
import type { ReactNode } from 'react';

import type { WritingStyle } from '../i18n/store.ts';
import type { NotificationAdapter } from '../logic/pure/notify.ts';
import type { ConfirmOptions } from '../logic/pure/confirm.ts';
import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import type { TextLimits } from '../logic/pure/textLimits.ts';
import type { MediaUploadAdapter } from '../media/types.ts';
import type { PageLinkComponent } from '../primitives/link.tsx';
import type { UsePathname } from '../primitives/pathname.tsx';
import type { MarkdownEditorRenderArgs } from '../translations/TranslatableMarkdown.tsx';

export type { NotificationAdapter, NotifyAction, NotifyOptions } from '../logic/pure/notify.ts';
export type { UsePathname } from '../primitives/pathname.tsx';

/** Feeds the package's one translation store from a host-owned store. Absent: the host calls `setTranslations`. */
export interface TranslationAdapter {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => {
    languageCode: string;
    /** A host without writing styles answers `'FORMAL'`. */
    writingStyle: WritingStyle;
    /** Key = `<text>` or `<text>__<context>`. */
    translations: Readonly<Record<string, string>>;
  };
}

export type StorageKind = 'list-filters' | 'list-view';
/** Builds a browser storage key. Default `ddd-admin-ui.<kind>.<id>`. Must be pure and stable. */
export type StorageKeyFn = (kind: StorageKind, id: string) => string;

/** Hooks passed by reference: module-level functions, the same identity on every render (rules of hooks). */
export type UseUrlStateAdapter = (options: { listId: string }) => UrlStateAdapter;
export type UseDrawerUrlAdapter = () => EntityDrawerUrlAdapter;

export interface EntityTranslationRequest {
  entity: unknown;
  locale: string;
  signal: AbortSignal;
}
export type AiTranslationAdapter = (request: EntityTranslationRequest) => Promise<TranslationsStore>;

export interface AdminUiProviderProps {
  children: ReactNode;
  translations?: TranslationAdapter;
  /** Registered with `setNotificationAdapter` in a layout effect; unregistered on unmount. */
  notifications?: NotificationAdapter;
  storageKey?: StorageKeyFn;
  useUrlStateAdapter?: UseUrlStateAdapter;
  useDrawerUrlAdapter?: UseDrawerUrlAdapter;
  /** Where portalled primitives mount; `null` / absent = `document.body`. */
  portalContainer?: HTMLElement | null;
  /** Delay of the package `TooltipProvider` (ms); the primitive's default when absent. */
  tooltipDelayMs?: number;
  upload?: MediaUploadAdapter;
  renderMarkdownEditor?: (args: MarkdownEditorRenderArgs) => ReactNode;
  /** Absent = AI translation off. */
  aiTranslation?: AiTranslationAdapter;
  /**
   * Search parameters the URL writer never removes (a host's sticky parameters such as `debug` or `locale`); a write
   * may still set them. Absent = none.
   */
  preserveSearchParams?: readonly string[];
  /**
   * The app's router link for every block that renders a link (tabs, back links, the Add button); a block's own
   * `linkComponent` prop still wins. Wrap the router link with `withStickyParams` to keep sticky search parameters.
   */
  linkComponent?: PageLinkComponent;
  /**
   * The router's pathname hook for every block that marks the current page (the shell's sidebar, breadcrumbs and
   * document title): `useNextPathname` from `./next`, or the host's own (a module-level function). Absent:
   * `location.pathname` after hydration, updated on back / forward only.
   */
  usePathname?: UsePathname;
  /**
   * The host's confirmation service behind `useConfirm()` (`(options) => Promise<boolean>`, a stable function); the
   * package dialog does not render then. Absent: the package dialog, one confirmation after the other.
   */
  confirm?: (options: ConfirmOptions) => Promise<boolean>;
  /**
   * With `confirm`: who answers a confirmation that asks for a typed phrase (`requirePhrase`), for a host service that
   * shows text only. `'package'`: the package dialog (with its phrase field); a function: that service. Absent: `confirm`
   * answers every confirmation, as before.
   */
  confirmWithPhrase?: 'package' | ((options: ConfirmOptions) => Promise<boolean>);
  /**
   * With `confirm`: who answers a confirmation whose description is not text (an element, a fragment: a generation
   * estimate, a list), for a host service that shows text only and would drop it. `'package'`: the package dialog; a
   * function: that service. Absent: `confirm` answers every confirmation, as before. A phrase confirmation goes to
   * `confirmWithPhrase` first when both are set.
   */
  confirmWithRichDescription?: 'package' | ((options: ConfirmOptions) => Promise<boolean>);
  /**
   * The `Intl` locale date cells format in (`de-CH`, `en-US`) when it differs from the UI language's; a cell's own
   * `locale` wins. Absent: the UI language.
   */
  formatLocale?: string;
  /**
   * Default length limits (code points) of translatable text fields by kind: `singleLine` for inputs, `multiline` for
   * text areas and markdown; a field's `maxLength` wins. Absent: no limit.
   */
  textLimits?: TextLimits;
}

export interface AdminUiContextValue extends Required<Pick<AdminUiProviderProps, 'storageKey'>> {
  useUrlStateAdapter?: UseUrlStateAdapter;
  useDrawerUrlAdapter?: UseDrawerUrlAdapter;
  upload?: MediaUploadAdapter;
  renderMarkdownEditor?: AdminUiProviderProps['renderMarkdownEditor'];
  aiTranslation?: AiTranslationAdapter;
  preserveSearchParams?: readonly string[];
}
