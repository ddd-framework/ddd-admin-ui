'use client';

import { normalizeDddError } from '@mgamadeus/ddd-web/contract';
import { Link2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { SearchField } from '../list/SearchField.tsx';
import { useDebouncedValue } from '../logic/react/useDebouncedValue.ts';
import { Button } from '../primitives/button.tsx';
import { Checkbox } from '../primitives/checkbox.tsx';
import { cn } from '../primitives/cn.ts';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../primitives/dialog.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import type { FileLinksCapability, FileManagerActions } from './fileManagerAdapter.ts';
import type { FileAreaKey, FileLinkRef, FileView, LinkTargetView } from './fileView.ts';
import { bulkLinkChanges, initialLinkStates, type LinkState, linkKeyOf, linkReferencesOf, linkSetOf } from './linkSelection.ts';

export interface LinkTargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One file (its complete link set is saved) or several (tri-state, only the changes are saved). */
  files: readonly FileView[];
  areaKey: FileAreaKey;
  links: FileLinksCapability;
  actions: Pick<FileManagerActions, 'setLinks' | 'bulkLinks'>;
  writesAllowed: boolean;
  /** After a successful save (the manager toasts). */
  onSaved?: (count: number) => void;
}

interface TargetRowProps {
  id: string;
  label: string;
  hint?: string | null;
  kindLabel: string;
  state: LinkState;
  depth: number;
  onToggle: () => void;
}

const TargetRow = ({ id, label, hint, kindLabel, state, depth, onToggle }: TargetRowProps) => (
  <label
    htmlFor={id}
    className={cn(
      'flex min-h-8 cursor-pointer items-center gap-2.5 rounded-md py-1 pr-2 text-[13px] transition-colors duration-150 hover:bg-foreground/5 motion-reduce:transition-none',
      state !== false && 'font-semibold'
    )}
    style={{ paddingLeft: `${8 + depth * 28}px` }}
  >
    <Checkbox id={id} checked={state} onCheckedChange={onToggle} />
    <Link2 aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
    <span className="min-w-0 flex-1 truncate">{label}</span>
    <span className="shrink-0 truncate text-[11px] font-normal text-muted-foreground">{hint ? `${kindLabel} · ${hint}` : kindLabel}</span>
  </label>
);

const flattenTargets = (targets: readonly LinkTargetView[], depth = 0): { target: LinkTargetView; depth: number }[] =>
  targets.flatMap(target => [{ target, depth }, ...flattenTargets(target.children ?? [], depth + 1)]);

const LinkTargetsForm = ({ files, areaKey, links, actions, writesAllowed, onSaved, onOpenChange }: Omit<LinkTargetsDialogProps, 'open'>) => {
  const { t } = useTranslate();
  const searchId = useId();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300).trim();
  const targets = links.useLinkTargets({ areaKey, q: debouncedSearch || undefined });
  const initial = useMemo(() => initialLinkStates(files), [files]);
  const [states, setStates] = useState<Map<string, LinkState>>(() => new Map(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bulk = files.length > 1;
  const rows = useMemo(() => flattenTargets(targets.data?.targets ?? []), [targets.data]);
  const references = useMemo(
    () => linkReferencesOf(files, rows.map(({ target }) => ({ kind: target.kind, id: target.id }) satisfies FileLinkRef)),
    [files, rows]
  );
  const kindLabel = (kind: string) => {
    const label = links.kinds.find(candidate => candidate.kind === kind)?.label;
    return label ? t(label) : kind;
  };

  const stateOf = (key: string): LinkState => states.get(key) ?? false;
  // indeterminate → on → off → on: a mixed target becomes "all files" on the first click.
  const toggle = (key: string) =>
    setStates(previous => {
      const next = new Map(previous);
      next.set(key, previous.get(key) !== true);
      return next;
    });

  const selected = linkSetOf(states, references);
  const change = bulkLinkChanges(
    files.map(file => file.id),
    initial,
    states,
    references
  );
  const dirty = bulk ? change.add.length + change.remove.length > 0 : (() => {
    const before = linkSetOf(initial, references).links.map(link => linkKeyOf(link.kind, link.id)).sort().join(',');
    return before !== selected.links.map(link => linkKeyOf(link.kind, link.id)).sort().join(',');
  })();
  const canSave = bulk ? actions.bulkLinks !== undefined : actions.setLinks !== undefined;

  const save = async () => {
    const [single] = files;
    if (!writesAllowed || !dirty || !single || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (bulk) await actions.bulkLinks?.(change);
      else await actions.setLinks?.(single.id, selected);
      onSaved?.(files.length);
      onOpenChange(false);
    } catch (saveError) {
      setError(normalizeDddError(saveError).message);
    } finally {
      setSaving(false);
    }
  };

  const isEmpty = !targets.isLoading && rows.length === 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {bulk
            ? t('Edit the links of {count, plural, one {# file} other {# files}}', { count: files.length })
            : t('Edit the links of “%name%”', { replacements: { name: files[0]?.name ?? '' } })}
        </DialogTitle>
        <DialogDescription>{links.dialogDescription ? t(links.dialogDescription) : t('A link labels the file; it does not share it.')}</DialogDescription>
      </DialogHeader>
      <SearchField id={searchId} value={search} onChange={setSearch} placeholder={t('Search link targets…')} aria-label={t('Search link targets')} />
      <div className="max-h-80 min-h-40 overflow-y-auto rounded-lg border p-1.5" aria-busy={targets.isFetching}>
        {targets.isLoading ? (
          <div className="space-y-2 p-2" aria-hidden>
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="ml-7 h-5 w-1/2" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : targets.isError ? (
          <p className="p-4 text-center text-[13px] text-destructive" role="alert">
            {t('The link targets could not be loaded.')}
          </p>
        ) : isEmpty ? (
          <p className="p-4 text-center text-[13px] text-muted-foreground">
            {debouncedSearch ? t('Nothing matches this search.') : t('There is nothing to link yet.')}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map(({ target, depth }) => {
              const key = linkKeyOf(target.kind, target.id);
              return (
                <li key={key}>
                  <TargetRow
                    id={`${searchId}-${key}`}
                    label={target.name}
                    hint={target.hint}
                    kindLabel={kindLabel(target.kind)}
                    depth={depth}
                    state={stateOf(key)}
                    onToggle={() => toggle(key)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {bulk
          ? dirty
            ? t('%add% to add · %remove% to remove on all %count% files', {
                replacements: { add: change.add.length, remove: change.remove.length, count: files.length },
              })
            : t('A dash means only some of the files have that link; one click links all of them.')
          : t('{count, plural, one {# link selected} other {# links selected}}', { count: selected.links.length })}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t('Cancel')}
        </Button>
        <Button type="button" onClick={() => void save()} disabled={!writesAllowed || saving || !dirty || !canSave}>
          {saving ? t('Saving…') : t('Save links')}
        </Button>
      </DialogFooter>
    </>
  );
};

/** Link files to the host's targets: searchable targets (sub-targets nested), checkboxes, tri-state for several files. */
export const LinkTargetsDialog = ({ open, onOpenChange, ...props }: LinkTargetsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">{open && <LinkTargetsForm {...props} onOpenChange={onOpenChange} />}</DialogContent>
  </Dialog>
);
