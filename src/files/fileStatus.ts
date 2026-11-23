import { Loader2, ShieldAlert, ShieldCheck, ShieldEllipsis, ShieldOff, ShieldX } from 'lucide-react';

import { m } from '../i18n/store.ts';
import { defineStatusMap } from '../logic/pure/status.ts';
import type { FileNewestVersionState, FileScanStatus } from './fileView.ts';

/** The malware check of a file (version) as a status badge. */
export const FILE_SCAN_STATUS = defineStatusMap<FileScanStatus>(
  {
    UPLOADING: {
      label: m('Uploading', { context: 'file-scan-status' }),
      tone: 'neutral',
      icon: Loader2,
      description: m('The upload has not finished yet.', { context: 'file-scan-status' }),
    },
    PENDING: {
      label: m('Being checked', { context: 'file-scan-status' }),
      tone: 'warning',
      icon: ShieldEllipsis,
      description: m('The malware check is running. The file can be downloaded once it is done.', { context: 'file-scan-status' }),
    },
    CLEAN: {
      label: m('Checked', { context: 'file-scan-status' }),
      tone: 'success',
      icon: ShieldCheck,
      description: m('No malware found.', { context: 'file-scan-status' }),
    },
    INFECTED: {
      label: m('Malware detected', { context: 'file-scan-status' }),
      tone: 'danger',
      icon: ShieldX,
      description: m('The malware check refused this upload; nobody can download it.', { context: 'file-scan-status' }),
    },
    BLOCKED: {
      label: m('Type not allowed', { context: 'file-scan-status' }),
      tone: 'danger',
      icon: ShieldOff,
      description: m('The content does not match a file type this area allows; it was refused and nobody can download it.', { context: 'file-scan-status' }),
    },
    FAILED: {
      label: m('Check failed', { context: 'file-scan-status' }),
      tone: 'danger',
      icon: ShieldAlert,
      description: m('The malware check could not finish. The file stays locked until it is checked again.', { context: 'file-scan-status' }),
    },
    SKIPPED: {
      label: m('Not checked', { context: 'file-scan-status' }),
      tone: 'info',
      icon: ShieldOff,
      description: m('This area runs without a malware check; the file is released unchecked.', { context: 'file-scan-status' }),
    },
  },
  { context: 'file-scan-status' }
);

/** What the drawer and the preview say about a file that is not (yet) downloadable. */
export const SCAN_STATUS_EXPLANATION: Readonly<Record<FileScanStatus, string>> = {
  UPLOADING: m('The upload has not finished yet.'),
  PENDING: m('This file is being checked for malware. It can be previewed and downloaded once the check is done.'),
  CLEAN: m('No malware found.'),
  INFECTED: m('The malware check found malware in this upload. It was refused; nobody can download it.'),
  BLOCKED: m('The content of this upload does not match a file type this area allows. It was refused; nobody can download it.'),
  FAILED: m('The malware check could not finish. The file stays locked until it is checked again.'),
  SKIPPED: m('This area runs without a malware check; the file is released unchecked.'),
};

/** The newest version of a file while it is not the current one: being checked, check failed, blocked. */
export const FILE_NEWEST_VERSION_STATE = defineStatusMap<FileNewestVersionState>(
  {
    checking: {
      label: m('New version being checked'),
      tone: 'warning',
      icon: ShieldEllipsis,
      description: m('The current version stays available until the new one has passed the malware check.'),
    },
    failed: {
      label: m('New version: check failed'),
      tone: 'danger',
      icon: ShieldAlert,
      description: m('The malware check of the new version could not finish; the current version stays available.'),
    },
    blocked: {
      label: m('New version refused: type not allowed'),
      tone: 'danger',
      icon: ShieldOff,
      description: m('The new version does not match a file type this area allows; it was refused and the current version stays.'),
    },
    infected: {
      label: m('New version: malware found'),
      tone: 'danger',
      icon: ShieldX,
      description: m('The malware check found malware in the new version; it was refused and the current version stays.'),
    },
  }
);
