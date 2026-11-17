'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { documentTitleParts, type NavigationItem, type ResolvedCrumb, resolveCrumbs } from '../logic/pure/navigation.ts';
import { useCurrentPathname } from '../primitives/pathname.tsx';
import { type UseEntityLabel, useShellNavigation } from './shellContext.ts';

type EntityCrumb = Extract<ResolvedCrumb<string>, { kind: 'entity' }>;

export interface ShellDocumentTitleProps<TEntity extends string = string> {
  /** Appended last (`Items · Admin`); already translated. */
  appName?: string;
  /** How many crumbs, from the current one up, name the page (default 2). */
  depth?: number;
  /** Between the parts; default ` · `. */
  separator?: string;
  /** Outside the navigation tree (a page the config does not name): leave the title alone (default) or show `appName`. */
  outside?: 'keep' | 'app-name';
  /** Default: the enclosing shell's. */
  navigation?: readonly NavigationItem<TEntity>[];
  /** Default: the enclosing shell's. */
  useEntityLabel?: UseEntityLabel<TEntity>;
  /** Default: the enclosing shell's, else the provider's pathname hook. */
  pathname?: string | null;
}

/** Calls the host hook for one entity crumb and reports its text (renders nothing). */
const EntityTitleProbe = ({ crumb, useEntityLabel, onText }: { crumb: EntityCrumb; useEntityLabel: UseEntityLabel<string>; onText: (key: string, text: string | null) => void }) => {
  const { text } = useEntityLabel({ entity: crumb.entity, id: crumb.id, params: crumb.params });
  useEffect(() => onText(crumb.key, text || null), [crumb.key, text, onText]);
  return null;
};

/**
 * Keeps `document.title` on the current page's name from the same navigation as the sidebar and the breadcrumbs, in
 * the UI language (`Details · Blue widget · Admin`): the last crumbs, entity names through the host's hook (the id until
 * they load), then `appName`. Set in an effect (nothing during render); the title before the first change is restored
 * on unmount. Outside the tree it leaves the title alone, unless `outside="app-name"`. A host that also sets titles on
 * the server (Next `metadata`) gets the same text from `resolveDocumentTitle`.
 */
export const ShellDocumentTitle = <TEntity extends string = string>({
  appName,
  depth = 2,
  separator = ' · ',
  outside = 'keep',
  navigation,
  useEntityLabel,
  pathname,
}: ShellDocumentTitleProps<TEntity>) => {
  const { t } = useTranslate();
  const shell = useShellNavigation();
  const adapterPathname = useCurrentPathname();
  const items = (navigation ?? shell?.items ?? []) as readonly NavigationItem<string>[];
  const entityHook = (useEntityLabel ?? shell?.useEntityLabel) as UseEntityLabel<string> | undefined;
  const path = pathname !== undefined ? pathname : shell ? shell.pathname : adapterPathname;
  const crumbs = useMemo(() => resolveCrumbs(path, items, { t }), [path, items, t]);
  const [entityTexts, setEntityTexts] = useState<Readonly<Record<string, string | null>>>({});
  const onText = useCallback(
    (key: string, text: string | null) => setEntityTexts(current => (current[key] === text ? current : { ...current, [key]: text })),
    []
  );

  // the entity crumbs that name the page (within `depth` of the current one)
  const named = crumbs.filter(crumb => crumb.kind !== 'group').slice(-Math.max(1, depth));
  const probes = entityHook ? (named.filter(crumb => crumb.kind === 'entity') as EntityCrumb[]) : [];
  const parts = documentTitleParts(crumbs, { depth, appName, entityText: crumb => entityTexts[crumb.key] });
  const title = crumbs.length === 0 ? (outside === 'app-name' && appName ? appName : null) : parts.join(separator);

  const original = useRef<string | null>(null);
  useEffect(() => {
    if (title === null) return;
    if (original.current === null) original.current = document.title;
    document.title = title;
  }, [title]);
  useEffect(
    () => () => {
      if (original.current !== null) document.title = original.current;
    },
    []
  );

  return (
    <>
      {probes.map(crumb => (
        <EntityTitleProbe key={crumb.key} crumb={crumb} useEntityLabel={entityHook as UseEntityLabel<string>} onText={onText} />
      ))}
    </>
  );
};
