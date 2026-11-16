import { type ExternalToast, toast } from 'sonner';

import type { NotificationAdapter, NotifyOptions } from '../logic/pure/notify.ts';

/** The neutral options in sonner's terms (same names today; mapped explicitly so neither side leaks into the other). */
const toSonner = (options?: NotifyOptions): ExternalToast | undefined => {
  if (options === undefined) return undefined;
  const mapped: ExternalToast = {};
  if (options.id !== undefined) mapped.id = options.id;
  if (options.description !== undefined) mapped.description = options.description;
  if (options.duration !== undefined) mapped.duration = options.duration;
  if (options.action !== undefined) {
    const { label, onClick } = options.action;
    mapped.action = { label, onClick: () => onClick() };
  }
  return mapped;
};

/** The notification adapter on `sonner`: pass it as `AdminUiProvider notifications` and render `Toaster` once. */
export const sonnerNotifications: NotificationAdapter = {
  success: (message, options) => toast.success(message, toSonner(options)),
  info: (message, options) => toast.info(message, toSonner(options)),
  error: (message, options) => toast.error(message, toSonner(options)),
  loading: (message, options) => toast.loading(message, toSonner(options)),
  dismiss: id => {
    toast.dismiss(id);
  },
};
