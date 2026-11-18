'use client';

import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { Fragment, type ReactNode, useId, useMemo } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import {
  type LeadingCrumb,
  type NavigationAccess,
  type NavigationItem,
  type ResolvedCrumb,
  resolveCrumbs,
} from '../logic/pure/navigation.ts';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../primitives/breadcrumb.tsx';
import { cn } from '../primitives/cn.ts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu.tsx';
import { useCurrentPathname } from '../primitives/pathname.tsx';
import { Skeleton } from '../primitives/skeleton.tsx';
import { type UseEntityLabel, useShellNavigation } from './shellContext.ts';
import { ShellNavLink } from './ShellNavLink.tsx';

/** The container widths at which the trail folds (CSS lengths). */
export interface BreadcrumbFoldWidths {
  /** From this width the full trail shows (default `40rem`); below it the ellipsis, the parent and the current crumb. */
  full?: string;
  /** Below this width only the ellipsis and the current crumb (default `14rem`). */
  currentOnly?: string;
}

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
  /** Crumbs before the navigation's own (a scope). Default: the enclosing shell's. */
  leadingCrumbs?: readonly LeadingCrumb[];
  /** The query string the query crumbs read (`useSearchParams().toString()`). Default: the enclosing shell's. */
  search?: string | URLSearchParams | null;
  /** Rights on any crumb (segments included): `false` turns it into text. Default: the enclosing shell's. */
  canAccessCrumb?: (crumb: ResolvedCrumb<string>) => boolean;
  /** Where the trail folds; default full from 40rem, the current crumb alone under 14rem. */
  foldWidths?: BreadcrumbFoldWidths;
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

/** The roles of the folding parts; with custom `foldWidths` they are data attributes styled by a scoped stylesheet. */
type FoldRole = 'ellipsis-older' | 'ellipsis-parent' | 'ellipsis-separator-parent' | 'older' | 'older-separator' | 'parent';

const FOLD_CLASS: Record<FoldRole, string> = {
  'ellipsis-older': ELLIPSIS_FOR_OLDER,
  'ellipsis-parent': ELLIPSIS_FOR_PARENT,
  'ellipsis-separator-parent': ELLIPSIS_SEPARATOR_FOR_PARENT,
  older: OLDER_CRUMB,
  'older-separator': OLDER_SEPARATOR,
  parent: PARENT_CRUMB,
};

/** A CSS length as given, without characters that could leave the declaration. */
const safeLength = (value: string): string => value.replace(/[^\w.%()+\-* ]/g, '');

/** The scoped rules of custom fold widths (the same behaviour as the default classes, at other widths). */
export const breadcrumbFoldStyles = (scope: string, widths: BreadcrumbFoldWidths): string => {
  const full = safeLength(widths.full ?? '40rem');
  const currentOnly = safeLength(widths.currentOnly ?? '14rem');
  const at = (role: FoldRole) => `[data-crumbs-fold="${scope.replace(/["\\]/g, '')}"] [data-crumb-fold="${role}"]`;
  return [
    `${at('ellipsis-parent')},${at('ellipsis-separator-parent')},${at('older')},${at('older-separator')}{display:none}`,
    `@container crumbs (width >= ${full}){${at('ellipsis-older')}{display:none}${at('older')}{display:inline-flex}${at('older-separator')}{display:block}}`,
    `@container crumbs (width < ${currentOnly}){${at('ellipsis-parent')}{display:inline-flex}${at('ellipsis-separator-parent')}{display:block}${at('parent')}{display:none}}`,
  ].join('');
};

type EntityCrumb = Extract<ResolvedCrumb<string>, { kind: 'entity' }>;

/** What an entity crumb shows once the host hook answered. */
interface EntityCrumbView {
  content: ReactNode;
  /** `false` when the hook refuses the link. */
  link?: boolean;
  state?: string;
}

/** Calls the host hook for an entity crumb and hands its view to `children`: the name (or `node`), a skeleton while it loads, else the id. */
const EntityCrumbLabel = ({
  crumb,
  useEntityLabel,
  children,
}: {
  crumb: EntityCrumb;
  useEntityLabel: UseEntityLabel<string>;
  children: (view: EntityCrumbView) => ReactNode;
}) => {
  const { text, isLoading, node, link, state } = useEntityLabel({ entity: crumb.entity, id: crumb.id, params: crumb.params });
  const content =
    isLoading && !text && (node === undefined || node === null) ? (
      <>
        <Skeleton aria-hidden className="inline-block h-3.5 w-24 align-middle" />
        <span className="sr-only">{crumb.id}</span>
      </>
    ) : node !== undefined && node !== null ? (
      node
    ) : (
      text || crumb.id
    );
  return <>{children({ content, link, state })}</>;
};

/** Renders a crumb through `render` with its shown content, link permission and state (entity crumbs ask the host hook). */
const CrumbView = ({
  crumb,
  useEntityLabel,
  render,
}: {
  crumb: ResolvedCrumb<string>;
  useEntityLabel: UseEntityLabel<string> | undefined;
  render: (crumb: ResolvedCrumb<string>, content: ReactNode, state?: string) => ReactNode;
}) => {
  if (crumb.kind !== 'entity') return <>{render(crumb, crumb.label)}</>;
  if (!useEntityLabel) return <>{render(crumb, crumb.id)}</>;
  return (
    <EntityCrumbLabel crumb={crumb} useEntityLabel={useEntityLabel}>
      {view => render(view.link === false && crumb.link ? { ...crumb, link: false } : crumb, view.content, view.state)}
    </EntityCrumbLabel>
  );
};

const titleOf = (crumb: ResolvedCrumb<string>): string | undefined => (crumb.kind === 'entity' ? undefined : crumb.label);

/** A crumb before the current one: a link (the host link; a plain `<a>` for an external entry) or text. */
const AncestorCrumb = ({ crumb, state, children }: { crumb: ResolvedCrumb<string>; state?: string; children: ReactNode }) => {
  if (!crumb.link || crumb.href === '') {
    return (
      <span className="block truncate" title={titleOf(crumb)} data-crumb-state={state}>
        {children}
      </span>
    );
  }
  if (crumb.kind === 'leaf' && crumb.external) {
    return (
      <BreadcrumbLink href={crumb.href} className={LINK_CLASS} title={titleOf(crumb)} data-crumb-state={state}>
        {children}
      </BreadcrumbLink>
    );
  }
  return (
    <BreadcrumbLink asChild className={LINK_CLASS}>
      <ShellNavLink item={{ key: crumb.key, href: crumb.href }} data-nav-key={undefined} title={titleOf(crumb)} data-crumb-state={state}>
        {children}
      </ShellNavLink>
    </BreadcrumbLink>
  );
};

/** Extra attributes of a crumb's item: a scope crumb, a query crumb. */
const crumbAttributes = (crumb: ResolvedCrumb<string>) =>
  crumb.kind === 'text' ? { 'data-crumb-scope': crumb.scope ? '' : undefined, 'data-crumb-query': crumb.query } : undefined;

/**
 * The breadcrumbs of the current path, resolved from the navigation (`resolveCrumbs`): optional scope crumbs, the groups
 * as text (a link when a group has its own page), the entry as a link, then the segments the entry's `crumbs` describe
 * — fixed texts, texts built from the segment, entity names (or nodes) through the host's hook — and the query crumbs of
 * the page. The current crumb is the page (`aria-current="page"`), never a link; a crumb the rights predicates refuse is
 * text. Narrow containers fold the middle into an ellipsis menu that lists the full path (container queries, no
 * measurement): under 40rem the parent and the current crumb stay, under 14rem only the current one (`foldWidths`
 * moves both). Renders nothing outside the tree.
 */
export const ShellBreadcrumbs = <TEntity extends string = string>({
  navigation,
  canAccess,
  useEntityLabel,
  pathname,
  separator,
  className,
  leadingCrumbs,
  search,
  canAccessCrumb,
  foldWidths,
}: ShellBreadcrumbsProps<TEntity>) => {
  const { t } = useTranslate();
  const shell = useShellNavigation();
  const adapterPathname = useCurrentPathname();
  const foldScope = useId();
  const items = (navigation ?? shell?.items ?? []) as readonly NavigationItem<string>[];
  const access = canAccess ?? shell?.canAccess;
  const entityHook = (useEntityLabel ?? shell?.useEntityLabel) as UseEntityLabel<string> | undefined;
  const path = pathname !== undefined ? pathname : shell ? shell.pathname : adapterPathname;
  const leading = leadingCrumbs ?? shell?.leadingCrumbs;
  const query = search !== undefined ? search : shell?.search;
  const crumbAccess = canAccessCrumb ?? shell?.canAccessCrumb;
  const crumbs = useMemo(
    () => resolveCrumbs(path, items, { t, canAccess: access, leadingCrumbs: leading, search: query, canAccessCrumb: crumbAccess }),
    [path, items, t, access, leading, query, crumbAccess]
  );
  if (crumbs.length === 0) return null;

  const customFold = foldWidths !== undefined;
  /** The folding class of a part, or (custom widths) its data attribute. */
  const fold = (role: FoldRole) => (customFold ? { className: undefined, 'data-crumb-fold': role } : { className: FOLD_CLASS[role] });

  const last = crumbs.length - 1;
  const ancestors = crumbs.slice(0, last);
  const current = crumbs[last] as ResolvedCrumb<string>;
  const separatorNode = separator ?? <ChevronRight className="rtl:rotate-180" />;
  const separatorClass = 'text-muted-foreground/60';
  const ellipsisFold = fold(ancestors.length > 1 ? 'ellipsis-older' : 'ellipsis-parent');
  const ellipsisSeparatorFold = fold(ancestors.length > 1 ? 'ellipsis-older' : 'ellipsis-separator-parent');

  return (
    <Breadcrumb
      data-shell-breadcrumbs=""
      data-crumbs-fold={customFold ? foldScope : undefined}
      className={cn('@container/crumbs min-w-0 flex-1', className)}
    >
      {customFold && <style>{breadcrumbFoldStyles(foldScope, foldWidths)}</style>}
      <BreadcrumbList className="flex-nowrap gap-1 sm:gap-1.5">
        {ancestors.length > 0 && (
          <>
            <BreadcrumbItem className={ellipsisFold.className} data-crumb-fold={ellipsisFold['data-crumb-fold']}>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t('Show full path')}
                  className="flex size-6 items-center justify-center rounded-sm outline-none hover:bg-tint hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-w-80">
                  {ancestors.map(crumb => (
                    <CrumbView
                      key={crumb.key}
                      crumb={crumb}
                      useEntityLabel={entityHook}
                      render={(shown, content, state) =>
                        shown.link && shown.href !== '' ? (
                          <DropdownMenuItem asChild>
                            {shown.kind === 'leaf' && shown.external ? (
                              <a href={shown.href} className="block truncate" data-crumb-state={state}>
                                {content}
                              </a>
                            ) : (
                              <ShellNavLink
                                item={{ key: shown.key, href: shown.href }}
                                data-nav-key={undefined}
                                className="block truncate"
                                data-crumb-state={state}
                              >
                                {content}
                              </ShellNavLink>
                            )}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem disabled className="block truncate" data-crumb-state={state}>
                            {content}
                          </DropdownMenuItem>
                        )
                      }
                    />
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator
              className={cn(separatorClass, ellipsisSeparatorFold.className)}
              data-crumb-fold={ellipsisSeparatorFold['data-crumb-fold']}
            >
              {separatorNode}
            </BreadcrumbSeparator>
          </>
        )}
        {ancestors.map((crumb, index) => {
          // the parent stays below the wide width; older crumbs fold into the ellipsis
          const visibility = fold(index < ancestors.length - 1 ? 'older' : 'parent');
          const separatorVisibility = fold(index < ancestors.length - 1 ? 'older-separator' : 'parent');
          return (
            <Fragment key={crumb.key}>
              <BreadcrumbItem
                className={cn(ITEM_CLASS, visibility.className)}
                data-crumb={crumb.kind}
                data-crumb-fold={visibility['data-crumb-fold']}
                {...crumbAttributes(crumb)}
              >
                <CrumbView
                  crumb={crumb}
                  useEntityLabel={entityHook}
                  render={(shown, content, state) => (
                    <AncestorCrumb crumb={shown} state={state}>
                      {content}
                    </AncestorCrumb>
                  )}
                />
              </BreadcrumbItem>
              <BreadcrumbSeparator
                className={cn(separatorClass, separatorVisibility.className)}
                data-crumb-fold={separatorVisibility['data-crumb-fold']}
              >
                {separatorNode}
              </BreadcrumbSeparator>
            </Fragment>
          );
        })}
        <BreadcrumbItem className={ITEM_CLASS} data-crumb={current.kind} {...crumbAttributes(current)}>
          <CrumbView
            crumb={current}
            useEntityLabel={entityHook}
            render={(shown, content, state) => (
              <BreadcrumbPage className="block truncate font-semibold" title={titleOf(shown)} data-crumb-state={state}>
                {content}
              </BreadcrumbPage>
            )}
          />
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
};
