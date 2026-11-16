// T4 / T9: a strict TypeScript consumer of every entry that runs without next and sonner. Compiled with
// moduleResolution bundler and nodenext and skipLibCheck false: it passes only if the published declarations are
// complete and resolve (lucide-react types included, at the version under test).
import {
  computeListTracks,
  defineStatusMap,
  formatDate,
  formatListSort,
  formatDateTime,
  notify,
  setNotificationAdapter,
  toFormSubmitError,
  nextListSort,
  parseListSort,
  type EntityListSort,
  type FormSubmitError,
  type ListTrackLayout,
  type NotificationAdapter,
  type StatusMap,
  type UrlStateAdapter,
} from '@mgamadeus/ddd-admin-ui/logic';
import { formatUiNumber, m, setTranslations, translateText, useTranslate, type WritingStyle } from '@mgamadeus/ddd-admin-ui/i18n';
import { Button, cn, DialogContent, SelectContent, SheetContent, TooltipProvider } from '@mgamadeus/ddd-admin-ui/primitives';
import { DateCell, EntityListBody, EntityListToolbar, StatusBadge, type DateCellProps, type EntityListColumn } from '@mgamadeus/ddd-admin-ui/list';
import { EntityDetailShell, PageFrame, type PageFrameProps } from '@mgamadeus/ddd-admin-ui/page';
import { Form, FormErrors, FormField, type FormErrorsProps } from '@mgamadeus/ddd-admin-ui/form';
import { FormTranslatableInput, TranslatableInput } from '@mgamadeus/ddd-admin-ui/translations';
import { FormMediaItemField, MediaItemPickerDialog, type MediaUploadAdapter } from '@mgamadeus/ddd-admin-ui/media';
import { GlassPill, QuickFilterPills } from '@mgamadeus/ddd-admin-ui/glass';
import { AdminUiProvider, useAdminUi, type AdminUiProviderProps, type StorageKeyFn } from '@mgamadeus/ddd-admin-ui/provider';

const writingStyle: WritingStyle = 'FORMAL';
setTranslations('de', writingStyle, { Users: 'Benutzer' });
export const title: string = m('Users');
export const translated: string = translateText('Users');
export const date: string = formatDate('2026-03-04');
export const dateTime: string = formatDateTime('2026-03-04 10:05:00');
export const amount: string = formatUiNumber(3);
export const statuses: StatusMap<'ACTIVE' | 'BLOCKED'> = defineStatusMap({
  ACTIVE: { label: 'Active', tone: 'success' },
  BLOCKED: { label: 'Blocked', tone: 'danger' },
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

export const submitError: FormSubmitError = toFormSubmitError(new Error('x'), 'Could not save');
export const formErrorsProps: FormErrorsProps = { error: submitError };
export const urlState: UrlStateAdapter = { get: () => null, replace: () => {} };
export const storageKey: StorageKeyFn = (kind, id) => `host.${kind}.${id}`;
export const upload: MediaUploadAdapter = async () => ({ id: '1', previewUrl: null, title: 'a.png' });
export const providerProps: Omit<AdminUiProviderProps, 'children'> = { storageKey, upload, portalContainer: null };
export const pageFrameProps: Omit<PageFrameProps, 'children'> = { title: 'Users' };
export const dateCellProps: DateCellProps = { value: '2026-03-04', format: 'date' };
export const columns: EntityListColumn<{ id: number; name: string }>[] = [{ id: 'name', header: 'Name', cell: item => item.name }];
export const sizedColumns: EntityListColumn<{ id: number; name: string }>[] = [
  { id: 'id', header: 'ID', cell: item => item.id, width: '80px', pin: 'start', sortKey: 'id' },
  { id: 'name', header: 'Name', cell: item => item.name, width: '2fr', minWidth: 200, align: 'center' },
];
export const sort: EntityListSort | null = nextListSort(parseListSort('id:asc', ['id']), 'id');
export const sortText: string = formatListSort(sort);
export const trackLayout: ListTrackLayout = computeListTracks([{ width: '80px' }, { width: '2fr' }], 800);
export const contextStatuses = defineStatusMap(
  { FAILED: { label: m('Failed', { context: 'import-status' }), tone: 'danger', context: 'import-status' } },
  { context: 'import-status' },
);
export const className: string = cn('p-2', 'p-4');
export const components = [
  Button, DialogContent, SelectContent, SheetContent, TooltipProvider, DateCell, EntityListBody, EntityListToolbar,
  StatusBadge, EntityDetailShell, PageFrame, Form, FormErrors, FormField, FormTranslatableInput, TranslatableInput,
  FormMediaItemField, MediaItemPickerDialog, GlassPill, QuickFilterPills, AdminUiProvider,
];
export const hooks = [useTranslate, useAdminUi];
