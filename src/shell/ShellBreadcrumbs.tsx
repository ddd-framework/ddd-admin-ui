'use client';

import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { Fragment, type ReactNode, useMemo } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { type NavigationAccess, type NavigationItem, type ResolvedCrumb, resolveCrumbs } from '../logic/pure/navigation.ts';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../primitives/breadcrumb.tsx';
import { cn } from '../primitives/cn.ts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu.tsx';
import { useCurrentPathname } from '../primitives/pathname.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { type UseEntityLabel, useShellNavigation } from './shellContext.ts';
import { ShellNavLink } from './ShellNavLink.tsx';

export interface ShellBreadcrumbsProps<TEntity extends string = string> {
  /** The whole tree (not the filtered one: the viewer is already on the page). Default: the enclosing shell's. */
  navigation?: readonly NavigationItem<TEntity>[];
  /** The rights predicate: a refused crumb is text. Default: the enclosing shell's. */
  canAccess?: NavigationAccess;
  /** Names entity crumbs. Default: the enclosing shell's. */
  useEntityLabel?: UseEntityLabel<TEntity>;
  /** Default: the enclosing shell's, else the provider's pathname hook. */
  pathname?: string | null;
  /** Between crumbs; default a chevron (mirrored in RTL). */
  separator?: ReactNode;
  className?: string;
}

const ITEM_CLASS = 'min-w-0 max-w-48 lg:max-w-64';
const LINK_CLASS = 'block truncate rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
// Folding by the trail's own width (container queries, written out in full so Tailwind reads them): from 40rem the full
// trail; below it an ellipsis menu, the parent and the current crumb; under 14rem the ellipsis and the current crumb.
const ELLIPSIS_FOR_OLDER = '@min-[40rem]/crumbs:hidden';
const ELLIPSIS_FOR_PARENT = 'hidden @max-[14rem]/crumbs:inline-flex';
const ELLIPSIS_SEPARATOR_FOR_PARENT = 'hidden @max-[14rem]/crumbs:block';
const OLDER_CRUMB = 'hidden @min-[40rem]/crumbs:inline-flex';
const OLDER_SEPARATOR = 'hidden @min-[40rem]/crumbs:block';
const PARENT_CRUMB = '@max-[14rem]/crumbs:hidden';

/** An entity crumb's text: the host hook's name, a skeleton while it loads, else the id. */
const EntityCrumbText = ({ crumb, useEntityLabel }: { crumb: Extract<ResolvedCrumb<string>, { kind: 'entity' }>; useEntityLabel: UseEntityLabel<string> }) => {
  const { text, isLoading } = useEntityLabel({ entity: crumb.entity, id: crumb.id, params: crumb.params });
  if (isLoading && !text) {
    return (
      <>
        <Skeleton aria-hidden className="inline-block h-3.5 w-24 align-middle" />
        <span className="sr-only">{crumb.id}</span>
      </>
    );
  }
  return <>{text || crumb.id}</>;
};

const crumbText = (crumb: ResolvedCrumb<string>, useEntityLabel: UseEntityLabel<string> | undefined): ReactNode => {
  if (crumb.kind !== 'entity') return crumb.label;
  return useEntityLabel ? <EntityCrumbText crumb={crumb} useEntityLabel={useEntityLabel} /> : crumb.id;
};

const titleOf = (crumb: ResolvedCrumb<string>): string | undefined => (crumb.kind === 'entity' ? undefined : crumb.label);

/** A crumb before the current one: a link (the host link; a plain `<a>` for an external entry) or text. */
const AncestorCrumb = ({ crumb, children }: { crumb: ResolvedCrumb<string>; children: ReactNode }) => {
  if (!crumb.link || crumb.href === '') {
    return (
      <span className="block truncate" title={titleOf(crumb)}>
        {children}
      </span>
    );
  }
  if (crumb.kind === 'leaf' && crumb.external) {
    return (
      <BreadcrumbLink href={crumb.href} className={LINK_CLASS} title={titleOf(crumb)}>
        {children}
      </BreadcrumbLink>
    );
  }
  return (
    <BreadcrumbLink asChild className={LINK_CLASS}>
      <ShellNavLink item={{ key: crumb.key, href: crumb.href }} data-nav-key={undefined} title={titleOf(crumb)}>
        {children}
      </ShellNavLink>
    </BreadcrumbLink>
  );
};

/**
 * The breadcrumbs of the current path, resolved from the navigation (`resolveCrumbs`): the groups as text (a link when
 * a group has its own page), the entry as a link, then the segments the entry's `crumbs` describe — fixed texts, texts
 * built from the segment, entity names through the host's hook. The current crumb is the page (`aria-current="page"`),
 * never a link; a crumb the rights predicate refuses is text. Narrow containers fold the middle into an ellipsis menu
 * that lists the full path (container queries, no measurement): under 40rem the parent and the current crumb stay,
 * under 14rem only the current one. Renders nothing outside the tree.
 */
export const ShellBreadcrumbs = <TEntity extends string = string>({
  navigation,
  canAccess,
  useEntityLabel,
  pathname,
  separator,
  className,
}: ShellBreadcrumbsProps<TEntity>) => {
  const { t } = useTranslate();
  const shell = useShellNavigation();
  const adapterPathname = useCurrentPathname();
  const items = (navigation ?? shell?.items ?? []) as readonly NavigationItem<string>[];
  const access = canAccess ?? shell?.canAccess;
  const entityHook = (useEntityLabel ?? shell?.useEntityLabel) as UseEntityLabel<string> | undefined;
  const path = pathname !== undefined ? pathname : shell ? shell.pathname : adapterPathname;
  const crumbs = useMemo(() => resolveCrumbs(path, items, { t, canAccess: access }), [path, items, t, access]);
  if (crumbs.length === 0) return null;

  const last = crumbs.length - 1;
  const ancestors = crumbs.slice(0, last);
  const current = crumbs[last] as ResolvedCrumb<string>;
  const separatorNode = separator ?? <ChevronRight className="rtl:rotate-180" />;
  const separatorClass = 'text-muted-foreground/60';

  return (
    <Breadcrumb data-shell-breadcrumbs="" className={cn('@container/crumbs min-w-0 flex-1', className)}>
      <BreadcrumbList className="flex-nowrap gap-1 sm:gap-1.5">
        {ancestors.length > 0 && (
          <>
            <BreadcrumbItem className={ancestors.length > 1 ? ELLIPSIS_FOR_OLDER : ELLIPSIS_FOR_PARENT}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t('Show full path')}
                  className="flex size-6 items-center justify-center rounded-sm outline-none hover:bg-tint hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-w-80">
                  {ancestors.map(crumb =>
                    crumb.link && crumb.href !== '' ? (
                      <DropdownMenuItem key={crumb.key} asChild>
                        {crumb.kind === 'leaf' && crumb.external ? (
                          <a href={crumb.href} className="block truncate">
                            {crumbText(crumb, entityHook)}
                          </a>
                        ) : (
                          <ShellNavLink item={{ key: crumb.key, href: crumb.href }} data-nav-key={undefined} className="block truncate">
                            {crumbText(crumb, entityHook)}
                          </ShellNavLink>
                        )}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem key={crumb.key} disabled className="block truncate">
                        {crumbText(crumb, entityHook)}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator className={cn(separatorClass, ancestors.length > 1 ? ELLIPSIS_FOR_OLDER : ELLIPSIS_SEPARATOR_FOR_PARENT)}>
              {separatorNode}
            </BreadcrumbSeparator>
          </>
        )}
        {ancestors.map((crumb, index) => {
          // the parent stays below the wide width; older crumbs fold into the ellipsis
          const visibility = index < ancestors.length - 1 ? OLDER_CRUMB : PARENT_CRUMB;
          return (
            <Fragment key={crumb.key}>
              <BreadcrumbItem className={cn(ITEM_CLASS, visibility)} data-crumb={crumb.kind}>
                <AncestorCrumb crumb={crumb}>{crumbText(crumb, entityHook)}</AncestorCrumb>
              </BreadcrumbItem>
              <BreadcrumbSeparator className={cn(separatorClass, index < ancestors.length - 1 ? OLDER_SEPARATOR : PARENT_CRUMB)}>
                {separatorNode}
              </BreadcrumbSeparator>
            </Fragment>
          );
        })}
        <BreadcrumbItem className={ITEM_CLASS} data-crumb={current.kind}>
          <BreadcrumbPage className="block truncate font-semibold" title={titleOf(current)}>
            {crumbText(current, entityHook)}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
