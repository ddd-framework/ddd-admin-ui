'use client';

import { ChevronDown } from 'lucide-react';
import { useContext, useEffect, useId, useRef, useState } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import {
  type ActiveNavigation,
  isNavigationGroup,
  isNavigationGroupActive,
  isNavigationLeafActive,
  type NavigationGroup,
  type NavigationItem,
  type NavigationLeaf,
} from '../logic/pure/navigation.ts';
import { cn } from '../primitives/cn.ts';
import { NAV_GROUP_ACTIVE_CLASS, NAV_ICON_CLASS, NAV_ROW_ACTIVE_CLASS, NAV_ROW_CLASS } from './navClasses.ts';
import { NavItemMarks } from './NavItemMarks.tsx';
import { NavSkeletonRows } from './NavSkeletonRows.tsx';
import { ShellNavLink } from './ShellNavLink.tsx';
import { ShellNavDisplayContext } from './shellContext.ts';

export interface ShellNavListProps {
  /** The tree the viewer may see (already filtered by the rights predicate). */
  items: readonly NavigationItem<string>[];
  /** The active entry (`findActiveNavigation` on the same tree). */
  active: ActiveNavigation<string> | null;
  pathname: string | null;
  /** Called after a link was followed (the mobile menu closes). */
  onNavigate?: () => void;
}

/** The key of the group on this level that holds the active entry. */
const activeGroupKeyOf = (items: readonly NavigationItem<string>[], active: ActiveNavigation<string> | null): string | null =>
  items.find(item => isNavigationGroup(item) && isNavigationGroupActive(item, active))?.key ?? null;

const NavLeafRow = ({ item, pathname, active, onNavigate, child }: { item: NavigationLeaf<string>; pathname: string | null; active: ActiveNavigation<string> | null; onNavigate?: () => void; child: boolean }) => {
  const { t } = useTranslate();
  const display = useContext(ShellNavDisplayContext);
  // the one active entry (the longest match), not every prefix of the path
  const current = active?.item.key === item.key && isNavigationLeafActive(item, pathname);
  const Icon = child && !display.childIconsInList ? undefined : item.icon;
  return (
    <ShellNavLink
      item={item}
      onClick={onNavigate}
      aria-current={current ? 'page' : undefined}
      className={cn(
        NAV_ROW_CLASS,
        display.rowClassName,
        current && NAV_ROW_ACTIVE_CLASS,
        item.lockedReason && !current && 'text-muted-foreground',
        display.rowClassNameFor?.(item),
        current && display.activeRowClassName
      )}
    >
      {Icon ? <Icon aria-hidden className={cn(NAV_ICON_CLASS, child && 'size-4')} /> : child ? null : <span aria-hidden className="size-[1.125rem] shrink-0" />}
      <span className="min-w-0 truncate">{t(item.label)}</span>
      <NavItemMarks item={item} badgeClassName={display.badgeClassName} />
    </ShellNavLink>
  );
};

const NavGroupRow = ({
  group,
  open,
  onToggle,
  active,
  pathname,
  onNavigate,
  depth,
}: {
  group: NavigationGroup<string>;
  open: boolean;
  onToggle: () => void;
  active: ActiveNavigation<string> | null;
  pathname: string | null;
  onNavigate?: () => void;
  depth: number;
}) => {
  const { t } = useTranslate();
  const display = useContext(ShellNavDisplayContext);
  const listId = useId();
  const Icon = group.icon;
  const holdsActive = isNavigationGroupActive(group, active);
  const isCurrent = active?.item.key === group.key;
  const label = t(group.label);
  const caret = (
    <ChevronDown
      aria-hidden
      className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none', open && 'rotate-180')}
    />
  );
  const icon = Icon ? <Icon aria-hidden data-nav-group-icon="" className={cn(NAV_ICON_CLASS, depth > 0 && 'size-4')} /> : null;
  // `groupRowHover="row"`: the row tints as one; its link and caret do not tint on their own
  const rowHover = display.groupRowHover === 'row';
  const hostRowClass = display.rowClassNameFor?.(group);
  const activeGroupClass = holdsActive && !isCurrent ? display.activeGroupClassName : undefined;

  return (
    <li data-nav-group={group.key}>
      {group.href !== undefined ? (
        // a group with its own page: the label is a link, the caret its own button
        <div
          data-nav-group-row={rowHover ? 'row' : undefined}
          className={cn(
            'flex items-center rounded-lg',
            holdsActive && !isCurrent && NAV_GROUP_ACTIVE_CLASS,
            rowHover && 'transition-colors duration-150 hover:bg-tint',
            rowHover && isCurrent && 'hover:bg-tint-strong',
            activeGroupClass
          )}
        >
          <ShellNavLink
            item={{ key: group.key, href: group.href, linkProps: group.linkProps }}
            onClick={onNavigate}
            aria-current={isCurrent ? 'page' : undefined}
            className={cn(
              NAV_ROW_CLASS,
              display.rowClassName,
              'flex-1',
              isCurrent && NAV_ROW_ACTIVE_CLASS,
              rowHover && 'hover:bg-transparent',
              hostRowClass,
              isCurrent && display.activeRowClassName
            )}
          >
            {icon}
            <span className="min-w-0 truncate">{label}</span>
          </ShellNavLink>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={open ? t('Collapse %label%', { replacements: { label } }) : t('Expand %label%', { replacements: { label } })}
            onClick={onToggle}
            className={cn(
              'ms-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full outline-none hover:bg-tint focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:size-11',
              rowHover && 'hover:bg-transparent',
              display.groupToggleClassName
            )}
          >
            {caret}
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={onToggle}
          className={cn(
            NAV_ROW_CLASS,
            display.rowClassName,
            holdsActive && NAV_GROUP_ACTIVE_CLASS,
            hostRowClass,
            display.groupToggleClassName,
            holdsActive && display.activeGroupClassName
          )}
        >
          {icon}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {caret}
        </button>
      )}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          {/* the indent alone marks the sub-list; the 4 px above the first child lives inside the collapsing box */}
          <ShellNavTree
            id={listId}
            items={group.children}
            active={active}
            pathname={pathname}
            onNavigate={onNavigate}
            depth={depth + 1}
            inert={!open}
            className={display.childListClassName ? cn('ms-5 pt-1', display.childListClassName) : 'ms-5 pt-1'}
          />
        </div>
      </div>
    </li>
  );
};

const ShellNavTree = ({
  items,
  active,
  pathname,
  onNavigate,
  depth,
  id,
  inert,
  className,
}: ShellNavListProps & { depth: number; id?: string; inert?: boolean; className?: string }) => {
  // one open group per level; the group of the current route opens on every route change
  const display = useContext(ShellNavDisplayContext);
  const activeGroupKey = activeGroupKeyOf(items, active);
  const [ownOpenKey, setOwnOpenKey] = useState<string | null>(activeGroupKey);
  // controlled (`openGroupKeys`): the latest keys, so two levels changing in one commit do not undo each other
  const controlledKeys = display.openGroupKeys;
  const latestKeys = useRef(controlledKeys);
  latestKeys.current = controlledKeys;
  const onKeysChange = useRef(display.onOpenGroupKeysChange);
  onKeysChange.current = display.onOpenGroupKeysChange;
  const levelKeys = items.filter(isNavigationGroup).map(item => item.key);
  const controlled = controlledKeys !== undefined;
  const openKey = controlled ? (levelKeys.find(key => controlledKeys.includes(key)) ?? null) : ownOpenKey;
  const setOpenKey = (update: string | null | ((current: string | null) => string | null)) => {
    if (!controlled) {
      setOwnOpenKey(update);
      return;
    }
    const current = latestKeys.current ?? [];
    const currentLevelKey = levelKeys.find(key => current.includes(key)) ?? null;
    const nextLevelKey = typeof update === 'function' ? update(currentLevelKey) : update;
    if (nextLevelKey === currentLevelKey && current.filter(key => levelKeys.includes(key)).length <= 1) return;
    const next = [...current.filter(key => !levelKeys.includes(key)), ...(nextLevelKey === null ? [] : [nextLevelKey])];
    latestKeys.current = next;
    onKeysChange.current?.(next);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: a route change re-opens the active group; setOpenKey reads refs
  useEffect(() => setOpenKey(activeGroupKey), [activeGroupKey, controlled]);

  return (
    <ul id={id} inert={inert} className={cn('space-y-1', className)}>
      {items.map(item =>
        isNavigationGroup(item) ? (
          <NavGroupRow
            key={item.key}
            group={item}
            open={openKey === item.key}
            onToggle={() => setOpenKey(current => (current === item.key ? null : item.key))}
            active={active}
            pathname={pathname}
            onNavigate={onNavigate}
            depth={depth}
          />
        ) : (
          <li key={item.key}>
            <NavLeafRow item={item} pathname={pathname} active={active} onNavigate={onNavigate} child={depth > 0} />
          </li>
        )
      )}
    </ul>
  );
};

/**
 * The navigation as a list: entries as rows (icon, label, waiting count, lock, external mark), groups as an accordion
 * (one open per level, the group of the current page opens on every route change; a group with its own page links its
 * label and toggles with the caret). The current entry carries `aria-current="page"`. Lists are `<ul>`, groups are
 * disclosure buttons (`aria-expanded`, `aria-controls`); a closed group's entries are `inert`.
 */
export const ShellNavList = (props: ShellNavListProps) => {
  const display = useContext(ShellNavDisplayContext);
  if (display.loading) return <NavSkeletonRows count={display.loading === true ? undefined : display.loading} className={display.listClassName} />;
  return <ShellNavTree {...props} depth={0} className={display.listClassName} />;
};
