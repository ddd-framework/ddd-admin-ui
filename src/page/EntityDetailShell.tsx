'use client';

import type { ChangeHistory } from '@mgamadeus/ddd-web/contract';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { EntityListEmpty } from '../list/EntityListEmpty.tsx';
import { DetailHeader } from './DetailHeader.tsx';
import { EntityMetadata } from './EntityMetadata.tsx';
import { type EntityTab, EntityTabs } from './EntityTabs.tsx';
import { AnchorLink, type PageLinkComponent } from './links.tsx';

export interface EntityDetailBack {
  /** The list route (`/worlds`). */
  href: string;
  /** `Back to worlds` — the back button's accessible name and the error state's button. */
  label: string;
}

export interface EntityDetailShellProps {
  /** The entity's name (`World name`); falls back to `fallbackTitle` while empty. */
  title?: string | null;
  /** `World #12` — shown when the entity has no name. */
  fallbackTitle: string;
  /** One muted line under the title (relations: `Partner · Parent world`). */
  description?: ReactNode;
  back?: EntityDetailBack;
  /** The app's router link (Next `Link`); a plain `<a>` without it. */
  linkComponent?: PageLinkComponent;
  /** Page actions right of the title: a `PageToolbar` (outline secondaries → export → more → one primary). */
  actions?: ReactNode;
  /** The ID / Created / Updated strip; omit `id` on create screens (renders nothing). */
  metadata?: { id: number | string | null | undefined; changeHistory?: ChangeHistory | null };
  /** Route tabs of the entity; `currentPath` (`usePathname()`) marks the active one. */
  tabs?: readonly EntityTab[];
  currentPath?: string;
  /** Accessible name of the tab bar (`World sections`). */
  tabsLabel?: string;
  /** First load of the entity: a skeleton header; the tabs stay (they need only the id). */
  isLoading?: boolean;
  /** Inside another entity's shell (a team in a world, a track in an account): `h2` title in the section size. */
  nested?: boolean;
  /** Load failed or the entity does not exist: one error block with the back button instead of the page. */
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * The frame of every entity detail screen: back button + title + description + actions, the `EntityMetadata` strip (ID, Created, Updated), the route
 * tabs, then the active tab. Clouds layout: title centred above the centred segmented tabs, fluid page-title size; full
 * content width on every tab (host CSS `[data-page-shell]`). The breadcrumb trail lives in the top bar, not here.
 */
export const EntityDetailShell = ({
  title,
  fallbackTitle,
  description,
  back,
  linkComponent: Link = AnchorLink,
  actions,
  metadata,
  tabs,
  currentPath,
  tabsLabel,
  isLoading = false,
  nested = false,
  error,
  children,
  className,
}: EntityDetailShellProps) => {
  const { t } = useTranslate();
  if (error) {
    return (
      <div className={cn('w-full', className)}>
        <EntityListEmpty
          tone="error"
          message={error}
          action={
            back && (
              <Button asChild variant="outline" size="sm">
                <Link href={back.href}>{back.label}</Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  const backButton = back && (
    <Button asChild variant="ghost" size="icon-sm" className="shrink-0">
      <Link href={back.href} aria-label={back.label}>
        <ArrowLeft />
      </Link>
    </Button>
  );

  return (
    <div className={cn('w-full', className)}>
      <DetailHeader
        back={backButton}
        title={title || fallbackTitle}
        description={description}
        isLoading={isLoading}
        nested={nested}
        className={tabs && tabs.length > 0 ? 'mb-5' : undefined}
        aside={
          <>
            {/* ID / Created / Updated sit in the header's right corner next to the actions — no row of their own. */}
            {metadata && <EntityMetadata id={metadata.id} changeHistory={metadata.changeHistory} variant="stacked" />}
            {actions}
          </>
        }
      />
      {tabs && tabs.length > 0 && (
        <EntityTabs
          tabs={tabs}
          currentPath={currentPath}
          linkComponent={Link}
          aria-label={tabsLabel ?? t('Sections', { context: 'tab-navigation' })}
          align="center"
          className="mb-6"
        />
      )}
      {children}
    </div>
  );
};
