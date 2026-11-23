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
  type ConfirmOptions,
  type WriteAccess,
  useConfirm,
  useWriteAccess,
  WriteAccessProvider,
} from '@mgamadeus/ddd-admin-ui/logic';
import { formatUiNumber, m, setTranslations, translateText, useTranslate, type WritingStyle } from '@mgamadeus/ddd-admin-ui/i18n';
import { Button, cn, DialogContent, FormActionsSlot, FormActionsSlotProvider, SegmentedControl, type SegmentedControlProps, SelectContent, SheetContent, TooltipProvider } from '@mgamadeus/ddd-admin-ui/primitives';
import { Showcase, type ShowcaseProps, type ShowcaseSection } from '@mgamadeus/ddd-admin-ui/showcase';
import { DateCell, EntityListBody, EntityListToolbar, StatusBadge, type DateCellProps, type EntityListColumn } from '@mgamadeus/ddd-admin-ui/list';
import { EntityDetailShell, PageFrame, type PageFrameProps } from '@mgamadeus/ddd-admin-ui/page';
import { Form, FormActions, FormDialog, FormErrors, FormField, type FormActionsProps, type FormDialogProps, type FormErrorsProps } from '@mgamadeus/ddd-admin-ui/form';
import { FormTranslatableInput, TranslatableInput } from '@mgamadeus/ddd-admin-ui/translations';
import { FormMediaItemField, MediaItemPickerDialog, type MediaUploadAdapter } from '@mgamadeus/ddd-admin-ui/media';
import { GlassPill, QuickFilterPills } from '@mgamadeus/ddd-admin-ui/glass';
import { AdminUiProvider, useAdminUi, type AdminUiProviderProps, type StorageKeyFn } from '@mgamadeus/ddd-admin-ui/provider';
import { type CreateTranslationsApiOptions, type TranslationsApi, createStaticTranslationsApi, LocalesScreen } from '@mgamadeus/ddd-admin-ui/translations';
import { type WorkersApi, type WorkersOverviewScreenProps, createStaticWorkersApi, WorkersOverviewScreen } from '@mgamadeus/ddd-admin-ui/workers';
import { type IssuesApi, type IssuesScreenProps, createStaticIssuesApi, IssuesScreen } from '@mgamadeus/ddd-admin-ui/issues';
import { type DatabaseApi, type SchemaDiffScreenProps, createStaticDatabaseApi, SchemaDiffScreen } from '@mgamadeus/ddd-admin-ui/database';
import { type CronsApi, type CronsScreenProps, createStaticCronsApi, CronsScreen } from '@mgamadeus/ddd-admin-ui/crons';

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
export const segmentedProps: SegmentedControlProps<'day' | 'week'> = {
  'aria-label': 'Period',
  value: 'day',
  onValueChange: () => {},
  options: [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week', disabled: true, disabledReason: 'Not yet' }],
  height: 36,
  activation: 'manual',
};
export const hostSection: ShowcaseSection = { id: 'host', title: 'Host', content: null };
export const showcaseProps: ShowcaseProps = { sections: [hostSection], themes: ['dark'], omit: ['next'] };
export const components = [
  Button, SegmentedControl, Showcase, DialogContent, SelectContent, SheetContent, TooltipProvider, DateCell, EntityListBody, EntityListToolbar,
  StatusBadge, EntityDetailShell, PageFrame, Form, FormErrors, FormField, FormTranslatableInput, TranslatableInput,
  FormMediaItemField, MediaItemPickerDialog, GlassPill, QuickFilterPills, AdminUiProvider,
];
export const hooks = [useTranslate, useAdminUi, useConfirm, useWriteAccess];
export const confirmOptions: ConfirmOptions = { title: 'Delete?', requirePhrase: 'Main site', requirePhraseLabel: 'Type the name' };
export const writeAccess: WriteAccess = { allowed: false, reason: 'Read-only' };
export const plainDialogProps: FormDialogProps = {
  open: true,
  onOpenChange: () => {},
  title: 'Rename',
  children: null,
  submitLabel: 'Save',
  isPending: false,
  onSubmit: event => event.currentTarget.reset(),
};
export const headerActionsProps: FormActionsProps = { placement: 'header', primary: null };
export const providerConfirm: AdminUiProviderProps['confirm'] = async () => true;
export const dialogComponents = [FormDialog, FormActions, FormActionsSlot, FormActionsSlotProvider, WriteAccessProvider];
export const workersApi: WorkersApi = createStaticWorkersApi({});
export const translationsApi: TranslationsApi = createStaticTranslationsApi({});
export const workersScreenProps: WorkersOverviewScreenProps = { api: workersApi, transportHref: transport => `/workers/${transport}` };
export const translationsApiOptions: CreateTranslationsApiOptions = {
  baseApi: { reducerPath: 'api', enhanceEndpoints: () => ({}), injectEndpoints: () => ({}) },
  apiPrefix: '/api/admin/common',
  paths: { appTranslations: 'appTranslations' },
};
export const screenComponents = [WorkersOverviewScreen, LocalesScreen];

// the shell: one navigation tree for sidebar, breadcrumbs and title (types from ./logic), the frame from ./shell
import { resolveCrumbs, resolveDocumentTitle, type NavigationItem, type ResolvedCrumb } from '@mgamadeus/ddd-admin-ui/logic';
import { AccountMenu, AppShell, LanguageMenu, ShellBreadcrumbs, type AppShellProps, type UseEntityLabel } from '@mgamadeus/ddd-admin-ui/shell';
import { ShaderBackground, type ShaderBackgroundProps } from '@mgamadeus/ddd-admin-ui/shell-background';
import type { UsePathname } from '@mgamadeus/ddd-admin-ui/provider';

export const navigation: NavigationItem<'item'>[] = [
  { key: 'items', label: 'Items', href: '/items', badge: 2, crumbs: [{ segment: ':itemId', entity: 'item', children: [{ segment: 'details', label: 'Details' }] }] },
  { key: 'settings', label: 'Settings', children: [{ key: 'users', label: 'Users', href: '/settings/users', lockedReason: 'Upgrade' }] },
];
export const useItemLabel: UseEntityLabel<'item'> = ({ entity, id }) => ({ text: `${entity} ${id}`, isLoading: false });
export const shellProps: Omit<AppShellProps<'item'>, 'children'> = {
  navigation,
  useEntityLabel: useItemLabel,
  canAccess: item => item.key !== 'settings',
  documentTitle: { appName: 'Admin', depth: 2 },
  collapseShortcut: null,
};
export const crumbs: ResolvedCrumb<'item'>[] = resolveCrumbs('/items/4/details', navigation);
export const documentTitle: string | null = resolveDocumentTitle('/items/4', navigation, { appName: 'Admin' });
export const usePathname: UsePathname = () => '/items';
export const backgroundProps: ShaderBackgroundProps = { tint: { primary: [10, 20, 30] }, idleAfterMs: 30_000 };
export const shellComponents = [AppShell, ShellBreadcrumbs, AccountMenu, LanguageMenu, ShaderBackground];

export const issuesApi: IssuesApi = createStaticIssuesApi({});
export const issuesScreenProps: IssuesScreenProps = { api: issuesApi, trendAnchorMs: 0 };
export const issuesScreen = IssuesScreen;
export const databaseApi: DatabaseApi = createStaticDatabaseApi({});
export const databaseScreenProps: SchemaDiffScreenProps = { api: databaseApi, showGeneratedCode: false };
export const databaseScreen = SchemaDiffScreen;
export const cronsApi: CronsApi = createStaticCronsApi({});
export const cronsScreenProps: CronsScreenProps = { api: cronsApi, pollingIntervalMs: 0 };
export const cronsScreen = CronsScreen;

// ./files: the generic file manager on a static adapter (strict types of the adapter, capabilities and props)
import { createStaticFileManagerAdapter, FileManager, type FileManagerAdapter, type FileManagerProps } from '@mgamadeus/ddd-admin-ui/files';
export const filesAdapter: FileManagerAdapter = createStaticFileManagerAdapter({ areas: [{ areaKey: 1 }], folders: [], files: [] });
export const filesProps: FileManagerProps = { adapter: filesAdapter, areas: [{ key: 1, name: 'Area' }], variant: 'embedded' };
export const fileManager = FileManager;
