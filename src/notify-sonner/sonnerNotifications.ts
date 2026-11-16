import { toast } from 'sonner';
import type { NotificationAdapter } from '../logic/pure/notify.ts';

/** The notification adapter for sonner: pass it to `AdminUiProvider` or `setNotificationAdapter`. */
export const sonnerNotifications: NotificationAdapter = {
  success: (message, options) => toast.success(message, options),
  info: (message, options) => toast.info(message, options),
  error: (message, options) => toast.error(message, options),
  loading: (message, options) => toast.loading(message, options),
  dismiss: (id) => {
    toast.dismiss(id);
  },
};
