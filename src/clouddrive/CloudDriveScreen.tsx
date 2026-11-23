'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { File, Folder, FolderPlus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { FormDialog } from '../form/FormDialog.tsx';
import { useTranslate } from '../i18n/useTranslate.ts';
import { notify } from '../logic/pure/notify.ts';
import { useConfirm } from '../logic/react/useConfirm.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import { PageHeader } from '../page/PageHeader.tsx';
import { Badge } from '../primitives/badge.tsx';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../primitives/breadcrumb.tsx';
import { Button } from '../primitives/button.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { Input } from '../primitives/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/table.tsx';
import type { CloudDriveApi } from './api.ts';
import type { DriveNode, DriveSpace } from './types.ts';
import { formatDriveSize, parseDriveTime, sendDriveUpload } from './upload.ts';

/** One folder of the path shown in the breadcrumbs (`null` id: the root). */
export interface CloudDriveFolderStep {
  id: number | null;
  name: string;
}

export interface CloudDriveScreenProps {
  api: CloudDriveApi;
  /** The page title; default "Drive". */
  title?: ReactNode;
  /** The space shown first; default the first readable space. */
  initialSpaceId?: number;
  /** A folder to open first (a deep link); its space and path are read from the server. */
  initialFolderNodeId?: number;
  /** A file or folder to reveal (a deep link): its folder opens and its row is selected. */
  initialNodeId?: number;
  /** Actions next to the title. */
  headerActions?: ReactNode;
}

const modifiedOf = (driveNode: DriveNode): string =>
  parseDriveTime(driveNode.changeHistory?.modifiedTime ?? driveNode.changeHistory?.createdTime)?.toLocaleString() ?? '';

/** The folders and files of a space: browse, upload (direct to the store), new folder, download, trash, search. */
export const CloudDriveScreen = ({ api, title, initialSpaceId, initialFolderNodeId, initialNodeId, headerActions }: CloudDriveScreenProps) => {
  const { t } = useTranslate();
  const confirm = useConfirm();
  const writeAccess = useWriteAccess();
  const writeReason = writeAccess.allowed ? undefined : (writeAccess.reason ?? t('Writes are switched off'));
  const spacesQuery = api.useDriveSpacesQuery();
  const spaces: DriveSpace[] = spacesQuery.data?.driveSpaces.elements ?? [];
  const [spaceId, setSpaceId] = useState<number | null>(initialSpaceId ?? null);
  const [path, setPath] = useState<CloudDriveFolderStep[]>([]);
  const [search, setSearch] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploadState, setUploadState] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const deepLinkNodeId = initialNodeId ?? initialFolderNodeId;
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(initialNodeId ?? null);
  const [deepLinkApplied, setDeepLinkApplied] = useState(deepLinkNodeId === undefined);
  const deepLinkQuery = api.useDriveNodeQuery({ driveNodeId: deepLinkNodeId ?? 0 }, { skip: deepLinkNodeId === undefined || deepLinkApplied });

  useEffect(() => {
    if (deepLinkApplied || !deepLinkQuery.data) return;
    const { driveNode, ancestors } = deepLinkQuery.data;
    const steps: CloudDriveFolderStep[] = (ancestors?.elements ?? [])
      .filter(ancestor => ancestor.parentNodeId !== null && ancestor.parentNodeId !== undefined)
      .map(ancestor => ({ id: ancestor.id, name: ancestor.name }));
    if (driveNode.nodeType === 'FOLDER' && initialNodeId === undefined && driveNode.parentNodeId !== null && driveNode.parentNodeId !== undefined) {
      steps.push({ id: driveNode.id, name: driveNode.name });
    }
    setSpaceId(driveNode.driveSpaceId);
    setPath(steps);
    setDeepLinkApplied(true);
  }, [deepLinkApplied, deepLinkQuery.data, initialNodeId]);

  useEffect(() => {
    if (deepLinkQuery.error && !deepLinkApplied) setDeepLinkApplied(true);
  }, [deepLinkQuery.error, deepLinkApplied]);

  useEffect(() => {
    if (deepLinkApplied && spaceId === null && spaces.length > 0) setSpaceId(spaces[0].id);
  }, [deepLinkApplied, spaceId, spaces]);

  const currentFolderId = path.length > 0 ? path[path.length - 1].id : null;
  const childrenQuery = api.useDriveChildrenQuery(
    { driveSpaceId: spaceId ?? 0, folderNodeId: currentFolderId, limit: 500 },
    { skip: spaceId === null || search.trim() !== '' }
  );
  const searchQuery = api.useDriveSearchQuery({ driveSpaceId: spaceId ?? 0, query: search.trim(), limit: 100 }, { skip: spaceId === null || search.trim() === '' });
  const activeQuery = search.trim() !== '' ? searchQuery : childrenQuery;
  const nodes: DriveNode[] = activeQuery.data?.driveNodes.elements ?? [];
  const space = useMemo(() => spaces.find(candidate => candidate.id === spaceId) ?? null, [spaces, spaceId]);

  const [createFolder, createFolderState] = api.useCreateDriveFolderMutation();
  const [reserveUpload] = api.useReserveDriveUploadMutation();
  const [completeUpload] = api.useCompleteDriveUploadMutation();
  const [requestContent] = api.useDriveContentMutation();
  const [trashNode] = api.useTrashDriveNodeMutation();
  const [restoreNode] = api.useRestoreDriveNodeMutation();

  useEffect(() => {
    if (selectedNodeId === null || typeof document === 'undefined') return;
    document.querySelector(`[data-drive-node-id="${selectedNodeId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedNodeId, nodes]);

  const openNode = (driveNode: DriveNode) => {
    setSelectedNodeId(driveNode.id);
    if (driveNode.nodeType === 'FOLDER') {
      setSearch('');
      setPath(steps => [...steps, { id: driveNode.id, name: driveNode.name }]);
      return;
    }
    void download(driveNode);
  };

  const download = async (driveNode: DriveNode) => {
    try {
      const answer = await requestContent({ driveNodeId: driveNode.id, purpose: 'DOWNLOAD' }).unwrap();
      window.open(answer.grant.url, '_blank', 'noopener');
    } catch (error) {
      notify.error(normalizeDddError(error, t('The file cannot be downloaded.')).message);
    }
  };

  const trash = async (driveNode: DriveNode) => {
    if (!(await confirm({ title: t('Move "%name%" to the trash?', { replacements: { name: driveNode.name } }), confirmLabel: t('Move to trash'), confirmVariant: 'destructive' }))) return;
    try {
      await trashNode({ driveNodeId: driveNode.id }).unwrap();
      notify.success(t('Moved to the trash.'), {
        action: { label: t('Undo'), onClick: () => void restoreNode({ driveNodeId: driveNode.id }) },
      });
    } catch (error) {
      notify.error(normalizeDddError(error, t('The file could not be moved to the trash.')).message);
    }
  };

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (spaceId === null || files.length === 0) return;
    for (const file of files) {
      try {
        setUploadState(t('Uploading %name%…', { replacements: { name: file.name } }));
        const reservation = await reserveUpload({ driveSpaceId: spaceId, sizeBytes: file.size, contentType: file.type || null }).unwrap();
        await sendDriveUpload(reservation.reservation, file, (sentBytes, totalBytes) =>
          setUploadState(t('Uploading %name%: %percent%', { replacements: { name: file.name, percent: `${totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 100} %` } }))
        );
        const existing = nodes.find(node => node.nodeType === 'FILE' && node.name === file.name);
        const answer = await completeUpload({
          driveBlobId: reservation.reservation.driveBlobId,
          folderNodeId: currentFolderId,
          name: file.name,
          expectedLatestVersionId: existing?.latestVersionId ?? null,
        }).unwrap();
        if (answer.isConflict) {
          notify.error(t('"%name%" was not saved: %reason%', { replacements: { name: file.name, reason: answer.conflictReason ?? '' } }));
        } else {
          notify.success(t('"%name%" uploaded.', { replacements: { name: file.name } }));
        }
      } catch (error) {
        notify.error(normalizeDddError(error, t('"%name%" could not be uploaded.', { replacements: { name: file.name } })).message);
      }
    }
    setUploadState(null);
  };

  const submitFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (spaceId === null || folderName.trim() === '') return;
    try {
      await createFolder({ driveSpaceId: spaceId, parentNodeId: currentFolderId, name: folderName.trim() }).unwrap();
      setFolderDialogOpen(false);
      setFolderName('');
    } catch (error) {
      notify.error(normalizeDddError(error, t('The folder could not be created.')).message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={title ?? t('Drive')}
        description={space ? t('%used% of %quota% used · %files% files', { replacements: {
          used: formatDriveSize(space.usedBytes ?? 0),
          quota: formatDriveSize(space.quotaBytes ?? null) || t('the quota of its kind'),
          files: space.fileCount ?? 0,
        } }) : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {headerActions}
            <Button variant="outline" onClick={() => setFolderDialogOpen(true)} disabled={spaceId === null || !writeAccess.allowed} title={writeReason}>
              <FolderPlus className="size-4" />
              {t('New folder')}
            </Button>
            <Button onClick={() => fileInput.current?.click()} disabled={spaceId === null || uploadState !== null || !writeAccess.allowed} title={writeReason}>
              <Upload className="size-4" />
              {t('Upload')}
            </Button>
            <input ref={fileInput} type="file" multiple className="hidden" onChange={event => void upload(event)} />
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Select value={spaceId !== null ? String(spaceId) : ''} onValueChange={value => { setSpaceId(Number(value)); setPath([]); setSearch(''); }}>
          <SelectTrigger className="w-64" aria-label={t('Space')}>
            <SelectValue placeholder={t('Space')} />
          </SelectTrigger>
          <SelectContent>
            {spaces.map(candidate => (
              <SelectItem key={candidate.id} value={String(candidate.id)}>
                {candidate.title || `${candidate.spaceKind ?? ''} ${candidate.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="w-64" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('Search by name')} aria-label={t('Search by name')} />
        {space?.audience === 'SHARED' ? <Badge variant="outline">{t('Shared space')}</Badge> : null}
        {uploadState ? <span className="text-sm text-muted-foreground">{uploadState}</span> : null}
      </div>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {path.length === 0 ? <BreadcrumbPage>{space?.title || t('Root')}</BreadcrumbPage> : (
              <BreadcrumbLink asChild><button type="button" onClick={() => setPath([])}>{space?.title || t('Root')}</button></BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {path.map((step, index) => (
            <BreadcrumbItem key={`${step.id}`}>
              <BreadcrumbSeparator />
              {index === path.length - 1 ? <BreadcrumbPage>{step.name}</BreadcrumbPage> : (
                <BreadcrumbLink asChild><button type="button" onClick={() => setPath(steps => steps.slice(0, index + 1))}>{step.name}</button></BreadcrumbLink>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <Card>
        <CardContent className="p-0">
          {activeQuery.isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : activeQuery.error ? (
            <p className="p-4 text-sm text-destructive">{normalizeDddError(activeQuery.error, t('The folder could not be loaded.')).message}</p>
          ) : nodes.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{search.trim() !== '' ? t('Nothing found.') : t('This folder is empty.')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead className="w-28 text-right">{t('File size')}</TableHead>
                  <TableHead className="w-48">{t('Modified')}</TableHead>
                  <TableHead className="w-20">{t('Version')}</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map(driveNode => (
                  <TableRow
                    key={driveNode.id}
                    data-row-key={String(driveNode.id)}
                    data-drive-node-id={String(driveNode.id)}
                    data-state={driveNode.id === selectedNodeId ? 'selected' : undefined}
                    className={driveNode.id === selectedNodeId ? 'bg-accent' : undefined}
                  >
                    <TableCell>
                      <button type="button" className="flex items-center gap-2 text-left hover:underline" onClick={() => openNode(driveNode)}>
                        {driveNode.nodeType === 'FOLDER' ? <Folder className="size-4 text-muted-foreground" /> : <File className="size-4 text-muted-foreground" />}
                        <span className="break-all">{driveNode.name}</span>
                        {driveNode.isSystem ? <Badge variant="outline">{t('System')}</Badge> : null}
                        {driveNode.nodeType === 'FILE' && driveNode.latestVersionId !== driveNode.currentVersionId ? <Badge variant="outline">{t('Pending scan')}</Badge> : null}
                      </button>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {driveNode.nodeType === 'FOLDER' ? t('%count% entries', { replacements: { count: driveNode.childCount ?? 0 } }) : formatDriveSize(driveNode.sizeBytes)}
                    </TableCell>
                    <TableCell>{modifiedOf(driveNode)}</TableCell>
                    <TableCell>{driveNode.nodeType === 'FILE' && driveNode.versionNumber ? `v${driveNode.versionNumber}` : ''}</TableCell>
                    <TableCell className="text-right">
                      {driveNode.trashedAt ? (
                        <Button variant="ghost" size="icon" aria-label={t('Restore')} disabled={!writeAccess.allowed} title={writeReason} onClick={() => void restoreNode({ driveNodeId: driveNode.id })}>
                          <RotateCcw className="size-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" aria-label={t('Move to trash')} disabled={!writeAccess.allowed} title={writeReason} onClick={() => void trash(driveNode)}>
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <FormDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        title={t('New folder')}
        submitLabel={t('Create')}
        isPending={createFolderState.isLoading}
        submitDisabled={!writeAccess.allowed}
        isDirty={folderName !== ''}
        onSubmit={submitFolder}
      >
        <Input value={folderName} onChange={event => setFolderName(event.target.value)} placeholder={t('Folder name')} aria-label={t('Folder name')} autoFocus />
      </FormDialog>
    </div>
  );
};
