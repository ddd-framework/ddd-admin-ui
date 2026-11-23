import type { FileBulkLinksInput, FileLinkSet } from './fileManagerAdapter.ts';
import type { FileItemId, FileLinkRef, FileView } from './fileView.ts';

/** A checkbox state: every file has the link, some have it (several files only), none. */
export type LinkState = boolean | 'indeterminate';

export const linkKeyOf = (kind: string, id: FileItemId): string => `${kind}:${String(id)}`;

const parseLinkKey = (key: string, references: ReadonlyMap<string, FileLinkRef>): FileLinkRef => {
  const known = references.get(key);
  if (known) return known;
  const separator = key.indexOf(':');
  return { kind: key.slice(0, separator), id: key.slice(separator + 1) };
};

/** The links of the files keyed `kind:id` (keeps each id's original type for the requests). */
export const linkReferencesOf = (files: readonly Pick<FileView, 'links'>[], extra: readonly FileLinkRef[] = []): Map<string, FileLinkRef> => {
  const references = new Map<string, FileLinkRef>();
  for (const file of files) for (const link of file.links ?? []) references.set(linkKeyOf(link.kind, link.id), { kind: link.kind, id: link.id });
  for (const link of extra) references.set(linkKeyOf(link.kind, link.id), { kind: link.kind, id: link.id });
  return references;
};

/** The starting state of each target over the edited files (tri-state for several files). */
export const initialLinkStates = (files: readonly Pick<FileView, 'links'>[]): Map<string, LinkState> => {
  const counts = new Map<string, number>();
  for (const file of files) {
    for (const key of new Set((file.links ?? []).map(link => linkKeyOf(link.kind, link.id)))) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const states = new Map<string, LinkState>();
  for (const [key, count] of counts) states.set(key, count === files.length ? true : 'indeterminate');
  return states;
};

/** One file: the complete set. */
export const linkSetOf = (states: ReadonlyMap<string, LinkState>, references: ReadonlyMap<string, FileLinkRef> = new Map()): FileLinkSet => ({
  links: [...states].filter(([, state]) => state === true).map(([key]) => parseLinkKey(key, references)),
});

/** Several files: what changed against the start; untouched mixed targets stay as they are per file. */
export const bulkLinkChanges = (
  fileIds: readonly FileItemId[],
  initial: ReadonlyMap<string, LinkState>,
  states: ReadonlyMap<string, LinkState>,
  references: ReadonlyMap<string, FileLinkRef> = new Map()
): FileBulkLinksInput => {
  const add: FileLinkRef[] = [];
  const remove: FileLinkRef[] = [];
  for (const key of new Set([...initial.keys(), ...states.keys()])) {
    const before = initial.get(key) ?? false;
    const after = states.get(key) ?? false;
    if (before === after) continue;
    if (after === true) add.push(parseLinkKey(key, references));
    else if (after === false) remove.push(parseLinkKey(key, references));
  }
  return { fileIds, add, remove };
};
