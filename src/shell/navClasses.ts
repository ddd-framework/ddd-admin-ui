// The class names of the navigation rows: one set for the sidebar column, the icon rail and the mobile menu, so the
// three never drift apart. Labels in the foreground colour (not muted: they must read on an animated background).

/** A row: 36 px (44 px on a touch pointer), 14 px text, 18 px icons, hover a tint. */
export const NAV_ROW_CLASS =
  'flex h-9 w-full min-w-0 items-center gap-3 rounded-lg px-3 text-start text-sm text-foreground transition-colors duration-150 outline-none pointer-coarse:h-11 hover:bg-tint focus-visible:ring-2 focus-visible:ring-ring';

/** The current entry: a strong tint, semibold; its icon takes the brand colour. */
export const NAV_ROW_ACTIVE_CLASS = 'bg-tint-strong font-semibold hover:bg-tint-strong [&>svg:first-child]:text-brand [&>[data-nav-icon]>svg]:text-brand';

/** A group holding the current entry: only its icon takes the brand colour (the entry carries the fill). */
export const NAV_GROUP_ACTIVE_CLASS = '[&>svg:first-child]:text-brand [&_[data-nav-group-icon]]:text-brand';

export const NAV_ICON_CLASS = 'size-[1.125rem] shrink-0 [stroke-width:1.75]';

/** A rail row: icon only, centred. */
export const NAV_RAIL_ROW_CLASS = 'relative mx-auto w-11 justify-center px-0';

/** The waiting count on an entry. */
export const NAV_BADGE_CLASS =
  'ms-auto shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs leading-none font-bold text-primary-foreground tabular-nums';
