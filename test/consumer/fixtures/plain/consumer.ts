// T4 / T9: a strict TypeScript consumer of every entry that runs without next and sonner. Compiled with
// moduleResolution bundler and nodenext and skipLibCheck false: it passes only if the published declarations are
// complete and resolve.
import { describeRequestError, defineStatusMap, formatDate, formatUiNumber, notify, setNotificationAdapter, type NotificationAdapter, type StatusMap } from '@mgamadeus/ddd-admin-ui/logic';
import { m, setTranslations, useTranslate, type TranslationsSnapshot } from '@mgamadeus/ddd-admin-ui/i18n';
import { Button, cn, DialogContent, SelectContent, SheetContent, type ButtonProps } from '@mgamadeus/ddd-admin-ui/primitives';
import { ClearFiltersButton, DateCell, type DateCellProps } from '@mgamadeus/ddd-admin-ui/list';
import { PageFrame } from '@mgamadeus/ddd-admin-ui/page';
import { Form, useFieldLabel, type FieldLabels, type FormProps } from '@mgamadeus/ddd-admin-ui/form';
import { TranslatableInputField } from '@mgamadeus/ddd-admin-ui/translations';
import { MediaItemField, type MediaUploadAdapter } from '@mgamadeus/ddd-admin-ui/media';
import { GlassPanel } from '@mgamadeus/ddd-admin-ui/glass';
import { StatTile } from '@mgamadeus/ddd-admin-ui/data';
import { AdminUiProvider, useAdminUi, type AdminUiProviderProps, type StorageKeyFn } from '@mgamadeus/ddd-admin-ui/provider';

setTranslations('de', 'FORMAL', { Users: 'Benutzer' });
export const title: string = m('Users');
export const date: string = formatDate(new Date(), { timeZone: 'UTC' });
export const amount: string = formatUiNumber(3);
export const message: string = describeRequestError(new Error('x'));
export const statuses: StatusMap<'ACTIVE' | 'BLOCKED'> = defineStatusMap({
  ACTIVE: { label: 'Active', tone: 'success' },
  BLOCKED: { label: 'Blocked', tone: 'destructive' },
});
const adapter: NotificationAdapter = {
  success: () => 1,
  info: () => 1,
  error: () => 1,
  loading: () => 1,
  dismiss: () => {},
};
setNotificationAdapter(adapter);
notify.success('Saved');

export const storageKey: StorageKeyFn = (kind, id) => `host.${kind}.${id}`;
export const upload: MediaUploadAdapter = async () => ({ url: 'https://example.com/a.png' });
export const providerProps: Omit<AdminUiProviderProps, 'children'> = { storageKey, upload, portalContainer: null };
export const labels: FieldLabels = { name: 'Name' };
export const formProps: Omit<FormProps<{ name: string }>, 'children'> = { defaultValues: { name: '' }, labels, onSubmit: () => {} };
export const buttonProps: ButtonProps = { variant: 'outline', size: 'sm' };
export const dateCellProps: DateCellProps = { value: '2026-03-04', timeZone: 'UTC' };
export const className: string = cn('p-2', 'p-4');
export const snapshotType = (snapshot: TranslationsSnapshot): string => snapshot.languageCode;
export const components = [
  Button, DialogContent, SelectContent, SheetContent, ClearFiltersButton, DateCell, PageFrame, Form,
  TranslatableInputField, MediaItemField, GlassPanel, StatTile, AdminUiProvider,
];
export const hooks = [useTranslate, useFieldLabel, useAdminUi];
