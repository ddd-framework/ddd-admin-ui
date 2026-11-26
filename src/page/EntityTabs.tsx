'use client';

import { type ReactNode, useState } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { agentActionProps } from '../logic/pure/agentActions.ts';
import { cn } from '../primitives/cn.ts';
import { type PageLinkComponent, useLinkComponent } from '../primitives/link.tsx';

export interface EntityTab {
  id: string;
  label: string;
  /** Translation context of `label` (key `<label>__<context>`); mark the label with the same context. */
  context?: string;
  /** Route of the tab (route tabs); without it the tab is a button (`onSelect`). */
  href?: string;
  /** A small count after the label (`Teams 12`). */
  count?: number | null;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface EntityTabsProps {
  tabs: readonly EntityTab[];
  /** Accessible name of the tab bar (`World sections`). */
  'aria-label': string;
  /** The active tab; route tabs can derive it from `currentPath` instead. */
  activeId?: string;
  /** The current pathname (`usePathname()`): a route tab is active on its route and every route below it. */
  currentPath?: string;
  /** Button tabs: called with the tab id. */
  onSelect?: (id: string) => void;
  linkComponent?: PageLinkComponent;
  /**
   * Both are the segmented pill control (floating tabs): `segmented` = the entity's main tabs
   * (detail shell, 36 px), `pill` = the compact sub-tabs of a section (`SectionHeader`, 28 px).
   */
  variant?: 'segmented' | 'pill';
  /** `center` puts the control in the middle of its row (detail shells, under the centred title). */
  align?: 'start' | 'center';
  className?: string;
}

const isRouteActive = (href: string, currentPath: string | undefined) =>
  !!currentPath && (currentPath === href || currentPath.startsWith(`${href}/`));

/**
 * Track: a rounded-full tint (navy 6 %, white 8 % in dark) with a light blur over the clouds. Active tab: the
 * `segment-active` pill (white / navy 700) with the card shadow, navy semibold text. Idle: muted text, a tint on hover.
 */
const TRACK_CLASS = 'flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full bg-tint p-0.5 backdrop-blur-md';
const TAB_CLASS = {
  segmented: 'h-9 px-4 text-sm',
  pill: 'h-7 px-3 text-[13px]',
} as const;
const TAB_BASE =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-200 motion-reduce:transition-none';
const TAB_ACTIVE = 'bg-segment-active font-semibold text-foreground shadow-[var(--surface-shadow)]';
const TAB_IDLE = 'text-muted-foreground hover:bg-tint hover:text-foreground';

/**
 * The tab bar of an entity (route tabs under the detail header) or of a section (sub-tabs). One look for every
 * detail screen (replaces the copied tab shells). Active: route match via `currentPath`, or `activeId`. Every tab
 * declares itself to an agent (`data-agent-action="tab"` with its id).
 */
export const EntityTabs = ({
  tabs,
  'aria-label': ariaLabel,
  activeId,
  currentPath,
  onSelect,
  linkComponent,
  variant = 'segmented',
  align = 'start',
  className,
}: EntityTabsProps) => {
  const { t } = useTranslate();
  const Link = useLinkComponent(linkComponent);
  const size = TAB_CLASS[variant];
  // The clicked route tab is active at once (the switch must not wait for the page); the route match
  // takes over again once the path has changed.
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pathAtClick, setPathAtClick] = useState(currentPath);
  if (pathAtClick !== currentPath) {
    setPathAtClick(currentPath);
    setPendingHref(null);
  }
  return (
    <nav aria-label={ariaLabel} data-entity-tabs="" className={cn(TRACK_CLASS, align === 'center' && 'mx-auto', className)}>
      {tabs.map(tab => {
        const isActive =
          activeId !== undefined
            ? activeId === tab.id
            : pendingHref !== null
              ? pendingHref === tab.href
              : tab.href
                ? isRouteActive(tab.href, currentPath)
                : false;
        const content = (
          <>
            {tab.icon}
            {t(tab.label, tab.context ? { context: tab.context } : undefined)}
            {tab.count !== undefined && tab.count !== null && (
              <span className="rounded-full bg-tint px-1.5 text-[11px] font-bold text-muted-foreground tabular-nums">
                {tab.count}
              </span>
            )}
          </>
        );
        const className = cn(
          TAB_BASE,
          size,
          isActive ? TAB_ACTIVE : TAB_IDLE,
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          tab.disabled && 'pointer-events-none opacity-50'
        );
        if (tab.href && !tab.disabled) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? 'page' : undefined}
              {...agentActionProps('tab', tab.id)}
              className={className}
              onClick={() => setPendingHref(tab.href ?? null)}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            {...agentActionProps('tab', tab.id)}
            disabled={tab.disabled}
            onClick={() => onSelect?.(tab.id)}
            className={className}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
};
