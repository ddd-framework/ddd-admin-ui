'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { FileManager, type FileAreaMaintenanceSlotProps, type FileAreaSettingsSlotProps } from '../files/FileManager.tsx';
import type { FileAreaKey } from '../files/fileView.ts';
import type { PdfJsLoader } from '../files/PdfPreview.tsx';
import { useTranslate } from '../i18n/useTranslate.ts';
import type { EntityDrawerUrlAdapter } from '../logic/pure/entityDrawer.ts';
import type { UrlStateAdapter } from '../logic/pure/urlListState.ts';
import { useMemoryUrlState } from '../logic/react/useMemoryUrlState.ts';
import { PageHeader } from '../page/PageHeader.tsx';
import { Card, CardContent } from '../primitives/card.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { CloudDriveApi } from './api.ts';
import { CloudDriveSpacePicker } from './CloudDriveSpacePicker.tsx';
import { DRIVE_EVENT_LABELS, driveAreaRefOf, driveFolderIdOf } from './driveFileMapping.ts';
import { useCloudDriveFileAdapter } from './useCloudDriveFileAdapter.ts';

/** One folder of a path (`null` id: the root). Kept for hosts that typed deep links with it. */
export interface CloudDriveFolderStep {
  id: number | null;
  name: string;
}

export interface CloudDriveScreenProps {
  api: CloudDriveApi;
  /** The page title; default "Drive". */
  title?: ReactNode;
  description?: ReactNode;
  /** The space shown first; default the first space in the picker's order. */
  initialSpaceId?: number;
  /** A folder to open first (a deep link); its space is read from the server. */
  initialFolderNodeId?: number;
  /** A file to open first (a deep link): its folder opens and its details drawer. */
  initialNodeId?: number;
  /** Actions next to the title. */
  headerActions?: ReactNode;
  /** The host's URL adapters (`useNextUrlStateAdapter`, `useNextDrawerUrlAdapter`); component state otherwise. */
  urlStateAdapter?: UrlStateAdapter;
  drawerUrlAdapter?: EntityDrawerUrlAdapter;
  /** pdf.js of the host for the PDF preview (without it a PDF offers its download only). */
  loadPdfJs?: PdfJsLoader;
  /** Host controls next to the page actions (a usage link, a maintenance action). */
  renderAreaMaintenance?: (props: FileAreaMaintenanceSlotProps) => ReactNode;
  /** The space's settings (a drawer of the host): the manager adds a "Space settings" button that opens it. */
  renderAreaSettings?: (props: FileAreaSettingsSlotProps) => ReactNode;
  /** The label of an event type the drive does not know (host events); `null` = the built-in label. */
  formatEventType?: (type: string) => string | null | undefined;
  /** Grid or table first; default grid. */
  defaultView?: 'grid' | 'table';
  /** `page` (default): a full-height page with its header; `embedded`: inside a tab or a preview, header-less. */
  variant?: 'page' | 'embedded';
}

/**
 * The drive screen: the file manager of `./files` on the drive (`useCloudDriveFileAdapter`) with a grouped, searchable
 * space picker. Folders, grid and table, upload straight to the store, details with preview, versions (restore) and
 * history, the malware status, the agents' unsaved changes, filters and orders, the trash (purge and empty for
 * managers). Needs mgamadeus/ddd-clouddrive ≥ 0.1.0-rc.10.
 */
export const CloudDriveScreen = ({
  api,
  title,
  description,
  initialSpaceId,
  initialFolderNodeId,
  initialNodeId,
  headerActions,
  urlStateAdapter,
  drawerUrlAdapter,
  loadPdfJs,
  renderAreaMaintenance,
  renderAreaSettings,
  formatEventType,
  defaultView,
  variant,
}: CloudDriveScreenProps) => {
  const { t } = useTranslate();
  const spacesQuery = api.useDriveSpacesQuery();
  const spaceItems = spacesQuery.data?.items?.elements;
  const areas = useMemo(() => (spaceItems ?? []).map(driveAreaRefOf), [spaceItems]);
  const memory = useMemoryUrlState();
  const listUrl = urlStateAdapter ?? memory.urlStateAdapter;
  const drawerUrl = drawerUrlAdapter ?? memory.drawerUrlAdapter;

  const [chosenSpaceId, setChosenSpaceId] = useState<number | null>(initialSpaceId ?? null);
  const spaceId = chosenSpaceId ?? (areas[0] ? Number(areas[0].key) : null);
  const spaceItem = spaceItems?.find(item => item.id === spaceId);
  const adapter = useCloudDriveFileAdapter({ api, spaceId: spaceId ?? 0 });

  // A deep link: its space, folder and (for a file) the details drawer, once the node is known.
  const deepLinkNodeId = initialNodeId ?? initialFolderNodeId;
  const [deepLinkApplied, setDeepLinkApplied] = useState(deepLinkNodeId === undefined);
  const deepLinkQuery = api.useDriveNodeQuery({ driveNodeId: deepLinkNodeId ?? 0 }, { skip: deepLinkApplied || deepLinkNodeId === undefined });
  const deepLinkSpace = spaceItems?.find(item => item.id === deepLinkQuery.data?.driveNode.driveSpaceId);
  useEffect(() => {
    if (deepLinkApplied || !deepLinkQuery.data || !deepLinkSpace) return;
    const { driveNode } = deepLinkQuery.data;
    const isFolder = driveNode.nodeType === 'FOLDER';
    const folderId = isFolder ? driveFolderIdOf(driveNode.id, deepLinkSpace.rootNodeId) : driveFolderIdOf(driveNode.parentNodeId, deepLinkSpace.rootNodeId);
    setChosenSpaceId(driveNode.driveSpaceId);
    listUrl.replace({ folder: folderId === null ? null : String(folderId) });
    if (!isFolder) drawerUrl.replace({ file: String(driveNode.id) });
    setDeepLinkApplied(true);
  }, [deepLinkApplied, deepLinkQuery.data, deepLinkSpace, listUrl, drawerUrl]);

  const selectArea = useCallback((areaKey: FileAreaKey) => setChosenSpaceId(Number(areaKey)), []);
  const eventLabel = useCallback(
    (type: string) => formatEventType?.(type) ?? (DRIVE_EVENT_LABELS[type] ? t(DRIVE_EVENT_LABELS[type]) : null),
    [formatEventType, t]
  );
  const heading = title ?? t('Drive');

  if (spacesQuery.isLoading || (!deepLinkApplied && deepLinkQuery.isLoading)) {
    return (
      <div className="space-y-4">
        <PageHeader title={heading} description={description} actions={headerActions} />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (spaceId === null || spaceItems === undefined) {
    return (
      <div className="space-y-4">
        <PageHeader title={heading} description={description} actions={headerActions} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {spacesQuery.isError
              ? t('The spaces could not be loaded.')
              : spaceItems === undefined && spacesQuery.data
                ? t('This drive needs mgamadeus/ddd-clouddrive 0.1.0-rc.10 or newer on the server.')
                : t('There is no space you may read.')}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FileManager
      adapter={adapter}
      variant={variant}
      areas={areas}
      areaKey={spaceId}
      onAreaKeyChange={selectArea}
      title={heading}
      description={description}
      headerActions={headerActions}
      canWrite={spaceItem?.canWrite ?? false}
      urlStateAdapter={listUrl}
      drawerUrlAdapter={drawerUrl}
      loadPdfJs={loadPdfJs}
      defaultView={defaultView}
      renderAreaPicker={props => <CloudDriveSpacePicker {...props} spaces={spaceItems} />}
      renderAreaMaintenance={renderAreaMaintenance}
      renderAreaSettings={renderAreaSettings}
      formatEventType={eventLabel}
    />
  );
};
