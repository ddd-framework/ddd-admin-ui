'use client';

import type { ReactNode } from 'react';

import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { type EntityTab, EntityTabs } from './EntityTabs.tsx';
import type { PageLinkComponent } from '../primitives/link.tsx';
import { isInlineDescription } from '../primitives/descriptionContent.ts';

export interface SectionHeaderProps {
  /** The section title; a two-tone title wraps its brand part in `<em>` (`Top <em>riders</em>`). */
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions of the section (outline; the page's one primary lives in the page header). */
  actions?: ReactNode;
  /** Sub-tabs of the section (compact segmented pills): button tabs with `activeId` + `onSelect`, or route tabs. */
  tabs?: readonly EntityTab[];
  activeTab?: string;
  onTabSelect?: (id: string) => void;
  currentPath?: string;
  linkComponent?: PageLinkComponent;
  /** Accessible name of the sub-tabs; defaults to `<title> sections` when the title is a string. */
  tabsLabel?: string;
  /** `h2` inside a page, `h3` inside a card section. */
  as?: 'h2' | 'h3';
  className?: string;
}

/**
 * The heading row of a section inside a detail tab (title, muted description, actions) with optional sub-tabs below.
 * Sits on the clouds, no panel: the `h2` in the fluid section size, its `<em>` part in the brand ink (host CSS).
 */
export const SectionHeader = ({
  title,
  description,
  actions,
  tabs,
  activeTab,
  onTabSelect,
  currentPath,
  linkComponent,
  tabsLabel,
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) => {
  const { t } = useTranslate();
  return (
  <div className={cn('mb-4 space-y-3', className)}>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Heading
          className={cn('font-semibold tracking-tight', Heading === 'h2' ? 'text-title-section' : 'text-title-card')}
        >
          {title}
        </Heading>
        {description &&
          (isInlineDescription(description) ? (
            <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
          ) : (
            <div className="mt-0.5 text-[13px] text-muted-foreground">{description}</div>
          ))}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {tabs && tabs.length > 0 && (
      <EntityTabs
        tabs={tabs}
        variant="pill"
        activeId={activeTab}
        onSelect={onTabSelect}
        currentPath={currentPath}
        linkComponent={linkComponent}
        aria-label={tabsLabel ?? (typeof title === 'string' ? t('%title% sections', { replacements: { title } }) : t('Sections'))}
      />
    )}
  </div>
  );
};
