/**
 * The labels of the file activity (event types, access audiences and variants) and their translation. A label marked
 * with a context is translated with that context (key `<text>__<context>`); without it the lookup misses the
 * translation and shows the English text.
 */

import { m, type TranslateFn } from '../i18n/store.ts';

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

/** The audiences of an access, as the drawer names them. */
export const ACCESS_AUDIENCE_LABELS: Readonly<Record<string, string>> = {
  INTERNAL: m('Staff', { context: 'file-access-audience' }),
  SHARED: m('Partner', { context: 'file-access-audience' }),
};

/** What an access opened. */
export const ACCESS_VARIANT_LABELS: Readonly<Record<string, string>> = {
  INLINE: m('Preview', { context: 'file-access-variant' }),
  PREVIEW: m('Preview', { context: 'file-access-variant' }),
  DOWNLOAD: m('Original', { context: 'file-access-variant' }),
  ORIGINAL: m('Original', { context: 'file-access-variant' }),
};

/** The translation context of an event label marked with one (`t(label, { context })`, key `<text>__<context>`). */
const FILE_EVENT_LABEL_CONTEXTS: Readonly<Record<string, string>> = {
  UPLOADED: 'file-event',
  CREATED: 'file-event',
  RENAMED: 'file-event',
  MOVED: 'file-event',
  LINKED: 'file-event',
  UNLINKED: 'file-event',
  RESTORED: 'file-event',
  VIEWED: 'file-event',
  DOWNLOADED: 'file-event',
};

/** The translation context of each access audience label. */
const ACCESS_AUDIENCE_LABEL_CONTEXTS: Readonly<Record<string, string>> = {
  INTERNAL: 'file-access-audience',
  SHARED: 'file-access-audience',
};

/** The translation context of each access variant label. */
const ACCESS_VARIANT_LABEL_CONTEXTS: Readonly<Record<string, string>> = {
  INLINE: 'file-access-variant',
  PREVIEW: 'file-access-variant',
  DOWNLOAD: 'file-access-variant',
  ORIGINAL: 'file-access-variant',
};

/** The translated label of an event type; an unknown type is shown as it is. */
export const translateFileEventType = (type: string, t: TranslateFn): string =>
  FILE_EVENT_LABELS[type] ? t(FILE_EVENT_LABELS[type], { context: FILE_EVENT_LABEL_CONTEXTS[type] }) : type;

/** The translated audience of an access ("Staff", "Partner"); an unknown audience is shown as it is. */
export const translateFileAccessAudience = (audience: string, t: TranslateFn): string =>
  ACCESS_AUDIENCE_LABELS[audience] ? t(ACCESS_AUDIENCE_LABELS[audience], { context: ACCESS_AUDIENCE_LABEL_CONTEXTS[audience] }) : audience;

/** The translated variant of an access ("Preview", "Original"); an unknown variant is shown as it is. */
export const translateFileAccessVariant = (variant: string, t: TranslateFn): string =>
  ACCESS_VARIANT_LABELS[variant] ? t(ACCESS_VARIANT_LABELS[variant], { context: ACCESS_VARIANT_LABEL_CONTEXTS[variant] }) : variant;
