// The shell entry: the application frame (top bar, sidebar with groups, the icon rail and its shortcut, the mobile
// menu, the content frame), the breadcrumbs and the document title from the one navigation tree, and the data-fed
// account and language menus. The navigation model and its resolver are pure and live in ./logic.
export { AccountAvatar, AccountMenu, AccountSummary } from './AccountMenu.tsx';
export type { AccountMenuEntry, AccountMenuProps } from './AccountMenu.tsx';
export { AppShell, ShellNavigationProvider } from './AppShell.tsx';
export type { AppShellProps, ShellNavigationProviderProps } from './AppShell.tsx';
export { LanguageMenu, LanguageMenuItems, LanguageMenuSub } from './LanguageMenu.tsx';
export type { LanguageMenuProps, LanguageOption } from './LanguageMenu.tsx';
export { MarkedNavIcon, NavItemMarks } from './NavItemMarks.tsx';
export { ShellBreadcrumbs } from './ShellBreadcrumbs.tsx';
export type { ShellBreadcrumbsProps } from './ShellBreadcrumbs.tsx';
export { ShellNavigationContext, useShellNavigation } from './shellContext.ts';
export type { EntityLabelRequest, EntityLabelResult, ShellNavigationValue, UseEntityLabel } from './shellContext.ts';
export { ShellDocumentTitle } from './ShellDocumentTitle.tsx';
export type { ShellDocumentTitleProps } from './ShellDocumentTitle.tsx';
export { ShellMenuButton, ShellMobileMenu } from './ShellMobileMenu.tsx';
export type { ShellMenuButtonProps, ShellMobileMenuProps } from './ShellMobileMenu.tsx';
export { ShellNavLink } from './ShellNavLink.tsx';
export type { ShellNavLinkProps } from './ShellNavLink.tsx';
export { ShellNavList } from './ShellNavList.tsx';
export type { ShellNavListProps } from './ShellNavList.tsx';
export { ShellNavRail } from './ShellNavRail.tsx';
export type { ShellNavRailProps } from './ShellNavRail.tsx';
export { ShellSidebar } from './ShellSidebar.tsx';
export type { ShellSidebarProps } from './ShellSidebar.tsx';
export { ShellTopBar } from './ShellTopBar.tsx';
export type { ShellTopBarProps } from './ShellTopBar.tsx';
export { SIDEBAR_COLLAPSED_STORAGE_KEY, useSidebarCollapsed } from './useSidebarCollapsed.ts';
export { SHELL_DESKTOP_QUERY, SIDEBAR_SHORTCUT_KEY, useShellShortcut } from './useShellShortcut.ts';
