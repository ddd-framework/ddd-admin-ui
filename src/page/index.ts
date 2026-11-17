export { PageHeader } from './PageHeader.tsx';
export type { PageHeaderProps } from './PageHeader.tsx';
export { EntityMetadata } from './EntityMetadata.tsx';
export type { EntityMetadataProps } from './EntityMetadata.tsx';

// Standardised blocks (usage in ../STANDARDS.md).
export { DefinitionList } from './DefinitionList.tsx';
export type { DefinitionItem, DefinitionListProps } from './DefinitionList.tsx';
export { EntityDetailShell } from './EntityDetailShell.tsx';
export type { EntityDetailBack, EntityDetailShellProps } from './EntityDetailShell.tsx';
export { EntityTabs } from './EntityTabs.tsx';
export type { EntityTab, EntityTabsProps } from './EntityTabs.tsx';
export { AnchorLink } from './links.tsx';
export type { PageLinkComponent, PageLinkProps } from './links.tsx';
export { AddEntityButton, ExportButton, MoreActionsMenu, PageToolbar } from './PageToolbar.tsx';
export type {
  AddEntityButtonProps,
  ExportButtonProps,
  MoreActionItem,
  MoreActionsMenuProps,
  PageToolbarProps,
} from './PageToolbar.tsx';
export { SectionHeader } from './SectionHeader.tsx';
export type { SectionHeaderProps } from './SectionHeader.tsx';

// Clouds look: read-first settings card, icon + value facts, page rhythm.
export { EditableCard, IconValue, IconValueRow } from './EditableCard.tsx';
export type { EditableCardProps, IconValueProps, IconValueRowProps } from './EditableCard.tsx';
export { CardGrid, PageSections } from './PageLayout.tsx';

// One header and one inset for every page.
export { DetailHeader } from './DetailHeader.tsx';
export type { DetailHeaderProps } from './DetailHeader.tsx';
export { PageFrame } from './PageFrame.tsx';
export type { PageFrameProps } from './PageFrame.tsx';
export { EntityListPage } from './EntityListPage.tsx';
export type { EntityListPageProps } from './EntityListPage.tsx';
export { PAGE_INSET_CLASS } from './PageHeader.tsx';

// One notice box in four tones.
export { StatusCallout, StatusCalloutAction } from './StatusCallout.tsx';
export type { StatusCalloutProps, StatusCalloutTone } from './StatusCallout.tsx';

// Route states (Next `error.tsx` / `loading.tsx`).
export { RouteError } from './RouteError.tsx';
export type { RouteErrorProps } from './RouteError.tsx';
export { RouteLoading } from './RouteLoading.tsx';
export type { RouteLoadingProps } from './RouteLoading.tsx';

// One maintenance action: run button and the outcome of the last run.
export { MaintenanceActionCard } from './MaintenanceActionCard.tsx';
export type { MaintenanceActionCardProps, MaintenanceActionOutcome } from './MaintenanceActionCard.tsx';
