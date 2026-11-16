import { translateText } from '../../i18n/store.ts';
import type { FormSubmitError } from './submitError.ts';

/** The options every toast system understands. A host adapter maps them onto its own toast API. */
export interface NotifyOptions {
  /** A toast with the same id replaces the one shown (a `loading` progress becomes its `success` / `error`). */
  id?: string | number;
  /** A second, muted line under the message. */
  description?: string;
  /** Milliseconds until the toast closes by itself; the adapter's default when left out. */
  duration?: number;
  /** One button in the toast (e.g. "Undo", "Open"); the toast closes after the click. */
  action?: NotifyAction;
}

export interface NotifyAction {
  label: string;
  onClick: () => void;
}

/** What `notify` and `runSequentialWithSummary` need from a toast system. Every call answers the toast's id. */
export interface NotificationAdapter {
  success: (message: string, options?: NotifyOptions) => string | number;
  info: (message: string, options?: NotifyOptions) => string | number;
  error: (message: string, options?: NotifyOptions) => string | number;
  /** A toast that stays until it is replaced (same `id`) or dismissed. */
  loading: (message: string, options?: NotifyOptions) => string | number;
  /** Closes one toast, or every toast without an id. */
  dismiss: (id?: string | number) => void;
}

/** Module state: the one registered adapter (the provider registers it; tests or a host may call this directly). */
let adapter: NotificationAdapter | null = null;
let warnedMissingAdapter = false;
let fallbackId = 0;

/** Registers the toast system behind `notify`; `null` unregisters it. */
export const setNotificationAdapter = (next: NotificationAdapter | null): void => {
  adapter = next;
};

/**
 * Without an adapter a call does nothing and warns once outside production; it never throws, so the caller's own
 * error handling still runs. The answered id is the given one or a local counter.
 */
const withAdapter = (
  call: (registered: NotificationAdapter) => string | number,
  options?: NotifyOptions
): string | number => {
  if (adapter) return call(adapter);
  if (!warnedMissingAdapter && process.env.NODE_ENV !== 'production') {
    warnedMissingAdapter = true;
    console.warn('notify: no notification adapter registered; toasts are dropped until one is.');
  }
  if (options?.id !== undefined) return options.id;
  fallbackId += 1;
  return `notify-${fallbackId}`;
};

/**
 * Toasts through the registered adapter (rendered once at the root by the host, so a toast survives a client
 * navigation: create → redirect to the new entity still shows "… created").
 */
export const notify = {
  success: (message: string, options?: NotifyOptions) => withAdapter(registered => registered.success(message, options), options),
  info: (message: string, options?: NotifyOptions) => withAdapter(registered => registered.info(message, options), options),
  error: (message: string, options?: NotifyOptions) => withAdapter(registered => registered.error(message, options), options),
  loading: (message: string, options?: NotifyOptions) => withAdapter(registered => registered.loading(message, options), options),
  /** A failed save: the server's message, the violation count as description, shown longer. */
  submitError: (error: FormSubmitError, options?: NotifyOptions) => {
    const merged: NotifyOptions = {
      description:
        error.validationErrors.length > 0
          ? translateText('{count, plural, one {# validation error} other {# validation errors}}', {
              count: error.validationErrors.length,
            })
          : undefined,
      duration: 8000,
      ...options,
    };
    return withAdapter(registered => registered.error(error.message, merged), merged);
  },
  dismiss: (id?: string | number): void => {
    adapter?.dismiss(id);
  },
};
