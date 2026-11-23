// The cloud drive entry: the drive screen on the endpoints of mgamadeus/ddd-clouddrive (`CloudDriveControllerTrait`)
// through the host's RTK Query api (`createCloudDriveApi`): the file manager of `./files` bound to the drive
// (`useCloudDriveFileAdapter`), the space picker, the direct upload to the store and the payload types.

export { buildCloudDriveRequests, CLOUD_DRIVE_TAG, cloudDriveEndpointDefinitions, createCloudDriveApi, createStaticCloudDriveApi } from './api.ts';
export type { CloudDriveApi, CreateCloudDriveApiOptions, StaticCloudDriveData } from './api.ts';
export type * from './types.ts';
export { CloudDriveScreen } from './CloudDriveScreen.tsx';
export type { CloudDriveFolderStep, CloudDriveScreenProps } from './CloudDriveScreen.tsx';
export { CloudDriveSpacePicker, groupDriveSpaces } from './CloudDriveSpacePicker.tsx';
export type { CloudDriveSpacePickerProps } from './CloudDriveSpacePicker.tsx';
export { CLOUD_DRIVE_FILE_CAPABILITIES, createCloudDriveFileAdapter, DRIVE_ACTIVITY_LIMIT, useCloudDriveFileAdapter } from './useCloudDriveFileAdapter.ts';
export type { UseCloudDriveFileAdapterOptions } from './useCloudDriveFileAdapter.ts';
export {
  DRIVE_EMPTY_TRASH_MAX_CALLS,
  DRIVE_EVENT_LABELS,
  DRIVE_LIST_MAX_LIMIT,
  DRIVE_LIST_PAGE_SIZE,
  driveAreaRefOf,
  driveAreaViewOf,
  driveChildrenArgOf,
  driveEventViewOf,
  driveFamilyOf,
  driveFileItemsOf,
  driveFileViewOf,
  driveFolderIdOf,
  driveFolderViewsOf,
  driveScanStatusOf,
  driveVersionViewOf,
  emptyDriveTrashFully,
  nextDriveListLimit,
} from './driveFileMapping.ts';
export type { DriveEmptyTrashOutcome } from './driveFileMapping.ts';
export { formatDriveSize, parseDriveTime, sendDriveUpload } from './upload.ts';
export type { DriveUploadProgress } from './upload.ts';
