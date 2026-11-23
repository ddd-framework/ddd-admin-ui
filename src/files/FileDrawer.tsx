'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { ArchiveRestore, Download, FilePen, FileUp, FolderInput, History, Link2, RotateCcw, ShieldEllipsis, Trash2 } from 'lucide-react';
import { type ChangeEvent, useEffect, useId, useRef, useState } from 'react';
import { type FieldErrors, type Resolver, useForm } from 'react-hook-form';

import { Form } from '../form/Form.tsx';
import { FormActions } from '../form/FormActions.tsx';
import { FormDrawer } from '../form/FormDrawer.tsx';
import { FormField, FormSection } from '../form/FormField.tsx';
import { FormSubmitButton } from '../form/FormSubmitButton.tsx';
import { m } from '../i18n/store.ts';
import { type TranslateFn, useTranslate } from '../i18n/useTranslate.ts';
import { CopyButton } from '../list/CopyButton.tsx';
import { DateCell } from '../list/cells.tsx';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { StatusBadge } from '../list/StatusBadge.tsx';
import { formatDateTime } from '../logic/pure/format.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import type { EntityDrawer } from '../logic/react/useEntityDrawer.ts';
import { useFormDirty } from '../logic/react/useFormDirty.ts';
import { useUnsavedChangesGuard } from '../logic/react/useUnsavedChangesGuard.ts';
import { DefinitionList } from '../page/DefinitionList.tsx';
import { Alert, AlertDescription, AlertTitle } from '../primitives/alert.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../primitives/card.tsx';
import { Input } from '../primitives/input.tsx';
import { SegmentedControl } from '../primitives/segmented-control.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { Textarea } from '../primitives/textarea.tsx';
import { FileFamilyIcon } from './FileFamilyIcon.tsx';
import { FileCopyMenu, type FileItemHandlers } from './FileItemActions.tsx';
import { FileLinkChips } from './FileLinkChips.tsx';
import type { FileLinkKind, FileManagerActions, FileManagerAdapter, FileQueryState } from './fileManagerAdapter.ts';
import type { FileManagerFeatures } from './fileManagerFeatures.ts';
import type { PdfJsLoader } from './PdfPreview.tsx';
import { FilePreview } from './FilePreview.tsx';
import { FILE_NEWEST_VERSION_STATE, FILE_SCAN_STATUS } from './fileStatus.ts';
import {
  extensionOf,
  FILE_FAMILY_LABELS,
  type FileDetailView,
  type FileEventView,
  type FileItemId,
  type FileVersionView,
  type FileView,
  type FolderView,
  fileNameStem,
  formatBytes,
  isFileReleased,
  newestVersionStateOf,
  sameFileId,
} from './fileView.ts';
import { isUploadAborted, uploadErrorMessage } from './uploadWithProgress.ts';

/** File names: at most 255 characters including the extension. */
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;

/** The labels of the event types the drawer knows; a host adds its own with `formatEventType`. */
export const FILE_EVENT_LABELS: Readonly<Record<string, string>> = {
  UPLOADED: m('Uploaded', { context: 'file-event' }),
  CREATED: m('Created', { context: 'file-event' }),
  VERSION_ADDED: m('New version uploaded'),
  VERSIONED: m('New version uploaded'),
  VERSION_RELEASED: m('Checked and released'),
  RELEASED: m('Checked and released'),
  REJECTED_MALWARE: m('Refused: malware detected'),
  BLOCKED: m('Blocked by the malware check'),
  SCAN_FAILED: m('Malware check failed'),
  VERSION_RESTORED: m('Older version restored'),
  OLD_VERSIONS_DELETED: m('Older versions deleted'),
  RENAMED: m('Renamed', { context: 'file-event' }),
  MOVED: m('Moved', { context: 'file-event' }),
  DESCRIPTION_CHANGED: m('Description changed'),
  METADATA: m('Details changed'),
  LINKED: m('Linked', { context: 'file-event' }),
  UNLINKED: m('Unlinked', { context: 'file-event' }),
  TRASHED: m('Moved to the trash'),
  RESTORED: m('Restored', { context: 'file-event' }),
  PURGED: m('Deleted permanently'),
  COPIED_IN: m('Copied in'),
  VIEWED: m('Viewed', { context: 'file-event' }),
  DOWNLOADED: m('Downloaded', { context: 'file-event' }),
  READ_BY_AGENT: m('Read by the assistant'),
};

/** The activity card's tabs: the file's changes and who opened it. */
const ACTIVITY_TAB_OPTIONS = [
  { value: 'changes' as const, label: m('Changes', { context: 'file-history-tab' }), context: 'file-history-tab' },
  { value: 'accesses' as const, label: m('Accesses', { context: 'file-history-tab' }), context: 'file-history-tab' },
];

/** The audiences of an access, as the drawer names them. */
const ACCESS_AUDIENCE_LABELS: Readonly<Record<string, string>> = {
  INTERNAL: m('Staff', { context: 'file-access-audience' }),
  SHARED: m('Partner', { context: 'file-access-audience' }),
};

/** What an access opened. */
const ACCESS_VARIANT_LABELS: Readonly<Record<string, string>> = {
  INLINE: m('Preview', { context: 'file-access-variant' }),
  PREVIEW: m('Preview', { context: 'file-access-variant' }),
  DOWNLOAD: m('Original', { context: 'file-access-variant' }),
  ORIGINAL: m('Original', { context: 'file-access-variant' }),
};

const defaultEventLabel = (type: string, t: TranslateFn): string => (FILE_EVENT_LABELS[type] ? t(FILE_EVENT_LABELS[type]) : type);

interface DetailsValues {
  stem: string;
  description: string;
}

/** Validates the name (the extension stays read-only) and the description; the server checks again. */
const detailsResolver =
  (extension: string, t: TranslateFn): Resolver<DetailsValues> =>
  async values => {
    const errors: FieldErrors<DetailsValues> = {};
    const stem = values.stem.trim();
    const maxStem = MAX_NAME_LENGTH - (extension ? extension.length + 1 : 0);
    if (stem === '') errors.stem = { type: 'required', message: t('Enter a name') };
    else if (stem.length > maxStem) {
      errors.stem = {
        type: 'maxLength',
        message: extension
          ? t('At most %max% characters including .%extension%', { replacements: { max: MAX_NAME_LENGTH, extension } })
          : t('At most %max% characters', { replacements: { max: MAX_NAME_LENGTH } }),
      };
    }
    if (values.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.description = { type: 'maxLength', message: t('At most %max% characters', { replacements: { max: MAX_DESCRIPTION_LENGTH } }) };
    }
    return Object.keys(errors).length > 0 ? { values: {}, errors } : { values, errors: {} };
  };

interface DetailsFormProps {
  file: FileView;
  actions: FileManagerActions;
  editable: boolean;
  onClose: () => void;
}

/** Name (the extension stays read-only) and description; Save sits in the drawer's footer. */
const FileDetailsForm = ({ file, actions, editable, onClose }: DetailsFormProps) => {
  const { t } = useTranslate();
  const extensionId = useId();
  const form = useForm<DetailsValues>({
    resolver: detailsResolver(file.extension, t),
    mode: 'onTouched',
    defaultValues: { stem: fileNameStem(file.name, file.extension), description: file.description ?? '' },
  });
  // Hydrate per file: keyed on the id, so a refetch after the save does not reset what is on screen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the file id to avoid re-hydration loops
  useEffect(() => {
    form.reset({ stem: fileNameStem(file.name, file.extension), description: file.description ?? '' });
  }, [String(file.id)]);

  const confirm = useConfirm();
  const { confirmDiscard } = useUnsavedChangesGuard(useFormDirty(form), confirm);

  const submit = async (values: DetailsValues) => {
    if (!editable) return;
    const name = file.extension ? `${values.stem.trim()}.${file.extension}` : values.stem.trim();
    const description = values.description.trim();
    const patch = {
      ...(name !== file.name ? { name } : {}),
      ...(description !== (file.description ?? '') ? { description } : {}),
    };
    if (Object.keys(patch).length === 0) return;
    try {
      await actions.patchFile(file.id, patch);
      form.reset(values, { keepValues: true });
      notify.success(t('File updated'));
    } catch (error) {
      notify.error(normalizeDddError(error, t('The file could not be updated')).message);
    }
  };

  return (
    <Form form={form} onSubmit={submit} className="space-y-6">
      <FormSection title={t('Details')}>
        <FormField control={form.control} name="stem" label={t('Name', { context: 'file-name' })} required disabled={!editable}>
          {({ field, control, disabled }) => (
            <div className="flex items-stretch">
              <Input {...control} {...field} disabled={disabled} className={file.extension ? 'rounded-r-none' : undefined} />
              {file.extension && (
                <span
                  id={extensionId}
                  title={t('The extension cannot be changed. Upload the file again to change its type.')}
                  className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-3 font-mono text-[13px] text-muted-foreground"
                >
                  .{file.extension}
                </span>
              )}
            </div>
          )}
        </FormField>
        <FormField control={form.control} name="description" label={t('Description', { context: 'file-description' })} disabled={!editable}>
          {({ field, control, disabled }) => <Textarea {...control} {...field} disabled={disabled} rows={3} placeholder={t('What is this file about?')} />}
        </FormField>
      </FormSection>
      <FormActions
        secondary={
          <Button type="button" variant="outline" onClick={async () => (await confirmDiscard()) && onClose()}>
            {t('Close', { context: 'action' })}
          </Button>
        }
        primary={
          <FormSubmitButton disabled={!editable} pendingLabel={t('Saving…')}>
            {t('Save')}
          </FormSubmitButton>
        }
      />
    </Form>
  );
};

interface VersionsCardProps {
  file: FileDetailView;
  actions: FileManagerActions;
  features: FileManagerFeatures;
  editable: boolean;
  /** Extension a replacement must have (`same` / `any`). */
  replacementExtension: 'same' | 'any';
  scansUploads: boolean;
}

/** The versions: current and older ones, Replace, Restore an older one, Delete older versions. */
const VersionsCard = ({ file, actions, features, editable, replacementExtension, scansUploads }: VersionsCardProps) => {
  const { t } = useTranslate();
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [replace, setReplace] = useState<{ name: string; percent: number } | null>(null);
  const [replaceError, setReplaceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  useEffect(() => () => controllerRef.current?.abort(), []);

  const versions = [...(file.versions ?? [])].sort((a, b) => b.versionNumber - a.versionNumber);
  const current = versions.find(version => version.isCurrent);
  const older = current ? versions.filter(version => version.versionNumber < current.versionNumber) : [];
  const olderBytes = older.reduce((sum, version) => sum + (version.scanStatus === 'INFECTED' ? 0 : version.sizeBytes), 0);

  const pickReplacement = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = '';
    if (!picked || !editable || !actions.uploadVersion) return;
    if (replacementExtension === 'same' && extensionOf(picked.name) !== file.extension) {
      setReplaceError(
        t('The new file must be a .%extension% file. Upload other types as a new file.', { replacements: { extension: file.extension } })
      );
      return;
    }
    setReplaceError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    setReplace({ name: picked.name, percent: 0 });
    try {
      await actions.uploadVersion(file.id, picked, {
        signal: controller.signal,
        onProgress: (loaded, total) => setReplace({ name: picked.name, percent: total > 0 ? Math.round((loaded / total) * 100) : 0 }),
      });
      notify.success(scansUploads ? t('New version uploaded — it becomes current once the malware check is done') : t('New version uploaded'));
    } catch (error) {
      if (!isUploadAborted(error)) setReplaceError(uploadErrorMessage(error));
    } finally {
      controllerRef.current = null;
      setReplace(null);
    }
  };

  const restoreVersion = async (version: FileVersionView) => {
    if (!editable || !actions.restoreVersion) return;
    const confirmed = await confirm({
      title: t('Restore version %number%?', { replacements: { number: version.versionNumber } }),
      description: t('A new current version is made from it; the newer versions stay in the history.'),
      confirmLabel: t('Restore', { context: 'action' }),
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await actions.restoreVersion(file.id, version.id);
      notify.success(t('Version %number% restored', { replacements: { number: version.versionNumber } }));
    } catch (error) {
      notify.error(normalizeDddError(error, t('The version could not be restored')).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteOlder = async () => {
    if (!editable || older.length === 0 || !actions.deleteOlderVersions) return;
    const confirmed = await confirm({
      title: t('{count, plural, one {Delete # older version?} other {Delete # older versions?}}', { count: older.length }),
      description: t('Frees %size%. The current version stays; this cannot be undone.', { replacements: { size: formatBytes(olderBytes) } }),
      confirmLabel: t('Delete', { context: 'action' }),
      confirmVariant: 'destructive',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await actions.deleteOlderVersions(file.id);
      notify.success(t('Older versions deleted'));
    } catch (error) {
      notify.error(normalizeDddError(error, t('Older versions could not be deleted')).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-title-card leading-snug font-semibold">{t('Versions')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {versions.length === 0 ? (
          <EmptyValue />
        ) : (
          <ul className="divide-y rounded-lg border">
            {versions.map(version => (
              <li key={String(version.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
                <span className="font-mono font-semibold">v{version.versionNumber}</span>
                {version.isCurrent && (
                  <span className="rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-primary-emphasis">
                    {t('Current', { context: 'file-version' })}
                  </span>
                )}
                <span className="text-muted-foreground">{formatBytes(version.sizeBytes)}</span>
                <span className="text-muted-foreground">{formatDateTime(version.createdAt)}</span>
                {version.uploadedBy && <span className="text-muted-foreground">{t('by %user%', { replacements: { user: version.uploadedBy } })}</span>}
                <span className="ml-auto flex items-center gap-1">
                  {features.malwareScan && <StatusBadge value={version.scanStatus} map={FILE_SCAN_STATUS} />}
                  {features.restoreVersion && !version.isCurrent && isFileReleased(version.scanStatus) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('Restore version %number%', { replacements: { number: version.versionNumber } })}
                      title={t('Restore this version')}
                      disabled={!editable || busy}
                      onClick={() => void restoreVersion(version)}
                    >
                      <RotateCcw />
                    </Button>
                  )}
                </span>
                {version.comment && <span className="basis-full text-xs text-muted-foreground">{version.comment}</span>}
                {version.scanResultDetail && <span className="basis-full font-mono text-[11px] text-muted-foreground">{version.scanResultDetail}</span>}
              </li>
            ))}
          </ul>
        )}
        {replace && (
          <div
            role="progressbar"
            aria-label={t('Uploading %name%', { replacements: { name: replace.name } })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={replace.percent}
            className="space-y-1"
          >
            <p className="text-xs text-muted-foreground">{t('Uploading %name% · %percent% %', { replacements: { name: replace.name, percent: replace.percent } })}</p>
            <div className="h-1 overflow-hidden rounded-full bg-tint-strong">
              <div className="h-full rounded-full bg-brand transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${replace.percent}%` }} />
            </div>
          </div>
        )}
        {replaceError && <p className="text-xs text-destructive">{replaceError}</p>}
        {(features.replaceVersion || (features.deleteOlderVersions && older.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {features.replaceVersion && (
              <>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept={replacementExtension === 'same' && file.extension ? `.${file.extension}` : undefined}
                  onChange={event => void pickReplacement(event)}
                  tabIndex={-1}
                  aria-hidden
                />
                <Button type="button" variant="outline" size="sm" disabled={!editable || replace !== null} onClick={() => inputRef.current?.click()}>
                  <FileUp />
                  {t('Replace file')}
                </Button>
                {replace && (
                  <Button type="button" variant="outline" size="sm" onClick={() => controllerRef.current?.abort()}>
                    {t('Cancel upload')}
                  </Button>
                )}
              </>
            )}
            {features.deleteOlderVersions && older.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!editable || busy}
                onClick={() => void deleteOlder()}
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <History />
                {t('Delete older versions (%count%, %size%)', { replacements: { count: older.length, size: formatBytes(olderBytes) } })}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const EventList = ({
  events,
  limit,
  formatEventType,
}: {
  events: readonly FileEventView[];
  limit: number;
  formatEventType?: (type: string) => string | null | undefined;
}) => {
  const { t } = useTranslate();
  if (events.length === 0) return <EmptyValue />;
  return (
    <ol className="space-y-3">
      {events.slice(0, limit).map(event => {
        const facts = [
          event.audience ? (ACCESS_AUDIENCE_LABELS[event.audience] ? t(ACCESS_AUDIENCE_LABELS[event.audience]) : event.audience) : null,
          event.variant ? (ACCESS_VARIANT_LABELS[event.variant] ? t(ACCESS_VARIANT_LABELS[event.variant]) : event.variant) : null,
          event.clientIp ? t('from %address%', { replacements: { address: event.clientIp } }) : null,
        ].filter((fact): fact is string => fact !== null);
        return (
          <li key={String(event.id)} className="flex gap-3 text-[13px]">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
            <div className="min-w-0">
              <p>
                <span className="font-semibold">{formatEventType?.(event.type) ?? defaultEventLabel(event.type, t)}</span>
                {event.detail && <span className="text-muted-foreground"> · {event.detail}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                <DateCell value={event.occurredAt} /> · {event.actor ?? t('System', { context: 'file-event-actor' })}
                {event.impersonatedBy && ` ${t('(on behalf: %name%)', { replacements: { name: event.impersonatedBy } })}`}
                {facts.length > 0 && ` · ${facts.join(' · ')}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const NO_ACCESS_EVENTS = (): FileQueryState<readonly FileEventView[]> => ({ data: undefined, isLoading: false, isError: false });

const ActivityCard = ({
  fileId,
  events,
  limit,
  formatEventType,
  useAccessEvents,
  tab,
  onTabChange,
}: {
  fileId: FileItemId;
  events: readonly FileEventView[];
  limit: number;
  formatEventType?: (type: string) => string | null | undefined;
  /** The accesses tab's data hook; absent = changes only. */
  useAccessEvents?: (fileId: FileItemId | null) => FileQueryState<readonly FileEventView[]>;
  tab: 'changes' | 'accesses';
  onTabChange?: (tab: 'changes' | 'accesses') => void;
}) => {
  const { t } = useTranslate();
  const withAccesses = useAccessEvents !== undefined;
  const showAccesses = withAccesses && tab === 'accesses';
  const accessesQuery = (useAccessEvents ?? NO_ACCESS_EVENTS)(showAccesses ? fileId : null);
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-title-card leading-snug font-semibold">{t('Activity', { context: 'file-history' })}</CardTitle>
        {withAccesses && (
          <SegmentedControl
            aria-label={t('Activity', { context: 'file-history' })}
            value={tab}
            onValueChange={value => onTabChange?.(value)}
            height={32}
            options={ACTIVITY_TAB_OPTIONS}
          />
        )}
      </CardHeader>
      <CardContent>
        {showAccesses ? (
          accessesQuery.isLoading ? (
            <Skeleton className="h-24 w-full rounded-xl" />
          ) : accessesQuery.isError ? (
            <p className="text-[13px] text-muted-foreground">{t('The accesses could not be loaded.')}</p>
          ) : (
            <EventList events={accessesQuery.data ?? []} limit={limit} formatEventType={formatEventType} />
          )
        ) : (
          <EventList events={events} limit={limit} formatEventType={formatEventType} />
        )}
      </CardContent>
    </Card>
  );
};

export interface FileDrawerProps {
  /** `useEntityDrawer({ editKey: 'file' })`. */
  drawer: EntityDrawer;
  adapter: FileManagerAdapter;
  actions: FileManagerActions;
  features: FileManagerFeatures;
  /** The row as listed, for the header and the preview while the detail loads. */
  listedFile: FileView | null;
  folders: readonly FolderView[];
  rootLabel: string;
  inTrash: boolean;
  canWrite: boolean;
  writesAllowed: boolean;
  /** The manager's dialogs (move, link) and confirmations (trash, restore, purge). */
  handlers: FileItemHandlers;
  linkKinds?: readonly FileLinkKind[];
  formatEventType?: (type: string) => string | null | undefined;
  loadPdfJs?: PdfJsLoader;
  workingCopyLabel?: string;
  workingCopyDescription?: string;
  /** The activity card's tab (`fileTab` in the URL); default `changes`. */
  activityTab?: 'changes' | 'accesses';
  onActivityTabChange?: (tab: 'changes' | 'accesses') => void;
}

/** The drawer id → a file id (numbers stay numbers when the list's ids are numbers). */
const fileIdOf = (shownId: string | undefined, listedFile: FileView | null): FileItemId | null => {
  if (!shownId) return null;
  if (listedFile && String(listedFile.id) === shownId) return listedFile.id;
  return /^\d+$/.test(shownId) ? Number(shownId) : shownId;
};

/**
 * The file drawer: preview, name + description (Save in the footer), facts (type, size, folder, uploader, dates,
 * SHA-256), links, versions, activity; Download and Delete in the header.
 */
export const FileDrawer = ({
  drawer,
  adapter,
  actions,
  features,
  listedFile,
  folders,
  rootLabel,
  inTrash,
  canWrite,
  writesAllowed,
  handlers,
  linkKinds,
  formatEventType,
  loadPdfJs,
  workingCopyLabel,
  workingCopyDescription,
  activityTab = 'changes',
  onActivityTabChange,
}: FileDrawerProps) => {
  const { t } = useTranslate();
  const shownId = drawer.shown?.mode === 'edit' ? String(drawer.shown.id) : undefined;
  const fileId = fileIdOf(shownId, listedFile);
  const detailQuery = adapter.useFile(fileId);
  const detail = detailQuery.data && sameFileId(detailQuery.data.id, fileId) ? detailQuery.data : null;
  const file: FileView | null = detail ?? (listedFile && sameFileId(listedFile.id, fileId) ? listedFile : null);
  const editable = canWrite && writesAllowed && !inTrash;
  const folderName =
    file === null
      ? null
      : file.folderId === null
        ? rootLabel
        : (folders.find(folder => sameFileId(folder.id, file.folderId))?.name ?? file.folderName ?? null);
  const replacementExtension = adapter.capabilities?.versions?.replacementExtension ?? 'same';
  const activityLimit = adapter.capabilities?.activity?.limit ?? 20;
  const dangerOutline = 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive';

  const headerActions = file && (
    <>
      {!inTrash && (
        <FileCopyMenu
          name={file.name}
          onCopyPath={handlers.onCopyPath ? () => handlers.onCopyPath?.(file) : undefined}
          onCopyLink={handlers.onCopyLink ? () => handlers.onCopyLink?.(file) : undefined}
        />
      )}
      {!inTrash && (
        <Button type="button" variant="outline" size="sm" disabled={!isFileReleased(file.scanStatus)} onClick={() => handlers.onDownload(file)}>
          <Download />
          {t('Download', { context: 'action' })}
        </Button>
      )}
      {inTrash ? (
        <>
          {handlers.onRestore && (
            <Button type="button" variant="outline" size="sm" disabled={!canWrite || !writesAllowed} onClick={() => handlers.onRestore?.(file)}>
              <ArchiveRestore />
              {t('Restore', { context: 'action' })}
            </Button>
          )}
          {handlers.onPurge && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={t('Delete %name% permanently', { replacements: { name: file.name } })}
              disabled={!canWrite || !writesAllowed}
              onClick={() => handlers.onPurge?.(file)}
              className={dangerOutline}
            >
              <Trash2 />
            </Button>
          )}
        </>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t('Delete %name%', { replacements: { name: file.name } })}
          disabled={!editable}
          onClick={() => handlers.onTrash(file)}
          className={dangerOutline}
        >
          <Trash2 />
        </Button>
      )}
    </>
  );

  return (
    <FormDrawer
      open={drawer.isOpen}
      onClose={drawer.close}
      title={file?.name ?? t('File', { context: 'drawer-title' })}
      description={file ? `${t(FILE_FAMILY_LABELS[file.family])} · ${formatBytes(file.sizeBytes)}` : undefined}
      headerActions={headerActions}
    >
      {!file ? (
        detailQuery.isLoading ? (
          <div className="space-y-4" role="status" aria-label={t('Loading the file')}>
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : (
          <p className="py-12 text-center text-[13px] text-muted-foreground">{t('This file was not found or is no longer available.')}</p>
        )
      ) : (
        <div className="space-y-6">
          {inTrash && (
            <Alert>
              <Trash2 />
              <AlertTitle>{t('In the trash')}</AlertTitle>
              <AlertDescription>
                {file.purgeAfter
                  ? file.deletedBy
                    ? t('Deleted %date% by %user%. It is removed for good on %purgeDate% unless it is restored.', {
                        replacements: { date: formatDateTime(file.deletedAt), user: file.deletedBy, purgeDate: formatDateTime(file.purgeAfter) },
                      })
                    : t('Deleted %date%. It is removed for good on %purgeDate% unless it is restored.', {
                        replacements: { date: formatDateTime(file.deletedAt), purgeDate: formatDateTime(file.purgeAfter) },
                      })
                  : file.deletedBy
                    ? t('Deleted %date% by %user%.', { replacements: { date: formatDateTime(file.deletedAt), user: file.deletedBy } })
                    : t('Deleted %date%.', { replacements: { date: formatDateTime(file.deletedAt) } })}
              </AlertDescription>
            </Alert>
          )}
          {isFileReleased(file.scanStatus) && newestVersionStateOf(file) !== null && (
            <Alert variant={newestVersionStateOf(file) === 'checking' ? 'default' : 'destructive'}>
              <ShieldEllipsis />
              <AlertTitle>{t(FILE_NEWEST_VERSION_STATE[newestVersionStateOf(file) ?? 'checking'].label)}</AlertTitle>
              <AlertDescription>
                {t(FILE_NEWEST_VERSION_STATE[newestVersionStateOf(file) ?? 'checking'].description ?? '')}
                {(file.newestVersionNumber || file.newestVersionReason) && (
                  <span className="mt-1 block text-muted-foreground">
                    {[file.newestVersionNumber ? t('Version %number%', { replacements: { number: file.newestVersionNumber } }) : null, file.newestVersionReason]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
          {workingCopyLabel && file.hasWorkingCopyChanges && (
            <Alert>
              <FilePen />
              <AlertTitle>{workingCopyLabel}</AlertTitle>
              <AlertDescription>
                {workingCopyDescription ?? t('A working copy holds changes to this file that are not saved yet. The file shows the last saved state.')}
              </AlertDescription>
            </Alert>
          )}
          <FilePreview file={file} getDownload={actions.getDownload} loadPdfJs={loadPdfJs} />
          <FileDetailsForm key={String(file.id)} file={file} actions={actions} editable={editable} onClose={drawer.close} />
          <Card className="gap-4">
            <CardHeader className="flex flex-row items-center gap-3">
              <FileFamilyIcon family={file.family} size="sm" />
              <CardTitle className="text-title-card leading-snug font-semibold">{t('Facts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DefinitionList
                items={[
                  {
                    id: 'type',
                    label: t('Type', { context: 'file-type' }),
                    value: file.extension ? `${t(FILE_FAMILY_LABELS[file.family])} (.${file.extension})` : t(FILE_FAMILY_LABELS[file.family]),
                    hint: file.mimeType,
                  },
                  { id: 'size', label: t('Size', { context: 'file-size' }), value: formatBytes(file.sizeBytes) },
                  {
                    id: 'folder',
                    label: t('Folder', { context: 'file-location' }),
                    value: (
                      <span className="flex items-center gap-2">
                        <span className="truncate">{folderName ?? <EmptyValue />}</span>
                        {!inTrash && (
                          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Move the file')} disabled={!editable} onClick={() => handlers.onMove(file)}>
                            <FolderInput />
                          </Button>
                        )}
                      </span>
                    ),
                  },
                  ...(features.malwareScan
                    ? [{ id: 'scan', label: t('Malware check'), value: <StatusBadge value={file.scanStatus} map={FILE_SCAN_STATUS} /> }]
                    : []),
                  { id: 'uploadedBy', label: t('Uploaded by'), value: file.uploadedBy },
                  { id: 'created', label: t('Created', { context: 'file-date' }), value: <DateCell value={file.createdAt} /> },
                  { id: 'updated', label: t('Updated', { context: 'file-date' }), value: <DateCell value={file.updatedAt} /> },
                  {
                    id: 'sha256',
                    label: 'SHA-256',
                    wide: true,
                    value: detail?.sha256 ? (
                      <span className="group flex min-w-0 items-center gap-1">
                        <span className="truncate font-mono text-xs">{detail.sha256}</span>
                        <CopyButton value={detail.sha256} label={m('Copy SHA-256')} reveal="hover" />
                      </span>
                    ) : null,
                  },
                ]}
              />
            </CardContent>
          </Card>
          {features.links && (
            <Card className="gap-4">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-title-card leading-snug font-semibold">{t('Links', { context: 'file-links' })}</CardTitle>
                {!inTrash && handlers.onLink && (
                  <Button type="button" variant="outline" size="sm" disabled={!editable} onClick={() => handlers.onLink?.(file)}>
                    <Link2 />
                    {t('Edit links')}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <FileLinkChips links={file.links} kinds={linkKinds} max={50} />
              </CardContent>
            </Card>
          )}
          {features.versions || features.activity ? (
            detail ? (
              <>
                {features.versions && (
                  <VersionsCard
                    file={detail}
                    actions={actions}
                    features={features}
                    editable={editable}
                    replacementExtension={replacementExtension}
                    scansUploads={features.malwareScan}
                  />
                )}
                {features.activity && (
                  <ActivityCard
                    fileId={detail.id}
                    events={detail.events ?? []}
                    limit={activityLimit}
                    formatEventType={formatEventType}
                    useAccessEvents={adapter.capabilities?.activity?.useAccessEvents}
                    tab={activityTab}
                    onTabChange={onActivityTabChange}
                  />
                )}
              </>
            ) : (
              <Skeleton className="h-40 w-full rounded-xl" />
            )
          ) : null}
        </div>
      )}
    </FormDrawer>
  );
};
