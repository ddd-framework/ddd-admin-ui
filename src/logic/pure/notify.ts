// The registered notification adapter (module state). Exists once; scripts/check-package.mjs verifies it.

export interface NotifyOptions {
  id?: string | number;
  description?: string;
  duration?: number;
}

/** What `notify` needs from a toast system. `./notify-sonner` provides one for sonner. */
export interface NotificationAdapter {
  success: (message: string, options?: NotifyOptions) => string | number;
  info: (message: string, options?: NotifyOptions) => string | number;
  error: (message: string, options?: NotifyOptions) => string | number;
  /** The same `id` updates the toast in place. */
  loading: (message: string, options?: NotifyOptions) => string | number;
  dismiss: (id?: string | number) => void;
}

let adapter: NotificationAdapter | null = null;
let hasWarned = false;

/** Registers the toast system (`null` unregisters). The provider calls it; hosts without the provider may too. */
export const setNotificationAdapter = (next: NotificationAdapter | null): void => {
  adapter = next;
};

const warnOnce = (): void => {
  if (hasWarned || (typeof process !== 'undefined' && process.env.NODE_ENV === 'production')) return;
  hasWarned = true;
  console.warn('[ddd-admin-ui] notify() was called before a notification adapter was registered.');
};

const send =
  (kind: 'success' | 'info' | 'error' | 'loading') =>
  (message: string, options?: NotifyOptions): string | number => {
    if (adapter) return adapter[kind](message, options);
    warnOnce();
    return options?.id ?? '';
  };

/** Shows a toast through the registered adapter. Without one it is a no-op that warns once in development. */
export const notify: NotificationAdapter = {
  success: send('success'),
  info: send('info'),
  error: send('error'),
  loading: send('loading'),
  dismiss: (id) => {
    if (adapter) adapter.dismiss(id);
    else warnOnce();
  },
};
