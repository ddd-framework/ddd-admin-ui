import type { ReactNode } from 'react';

import { PageFrame } from './PageFrame.tsx';
import { EntityListCard } from '../list/EntityListCard.tsx';

export interface EntityListPageProps {
  /** The page title; a two-tone title wraps its brand part in `<em>` (then pass `label`). */
  title: ReactNode;
  /** Accessible name of the list card; defaults to `title` when that is a string. */
  label?: string;
  description?: ReactNode;
  /** Page actions at the right edge of the header (one primary at most). */
  headerActions?: ReactNode;
  /** Before the title (an icon, a back link). */
  headerLeading?: ReactNode;
  /** Under the title row (summary tiles, a warning). */
  belowHeader?: ReactNode;
  /** The list card's fixed chrome, usually an `EntityListToolbar`. */
  toolbar?: ReactNode;
  /** A background refetch is in flight: a thin sweeping bar over the toolbar's bottom rule; rows stay mounted. */
  isRefetching?: boolean;
  /** The list body, usually an `EntityListTable`. */
  children: ReactNode;
  /** Drawn as a specimen inside another page (see `PageFrame.asSpecimen`): no `data-page-frame`, no full-height frame. */
  asSpecimen?: boolean;
  className?: string;
}

/**
 * A full list page in the clouds look: a `PageFrame` — the standard `PageHeader`
 * (title, description, actions on the clouds, no panel) at the standard page inset — then the `EntityListCard`
 * (toolbar as fixed chrome, the table or card grid scrolling inside the card). Full content width. From `md` the frame
 * is exactly the room the chrome leaves (`100dvh - --nav-h`), so the page itself never scrolls and the table header
 * never chases the top bar; on a phone the frame grows with its content and the window scrolls.
 */
export const EntityListPage = ({
  title,
  label,
  description,
  headerActions,
  headerLeading,
  belowHeader,
  toolbar,
  isRefetching = false,
  children,
  asSpecimen,
  className,
}: EntityListPageProps) => (
  <PageFrame
    asSpecimen={asSpecimen}
    title={title}
    description={description}
    actions={headerActions}
    leading={headerLeading}
    belowHeader={belowHeader}
  >
    <EntityListCard
      label={label ?? (typeof title === 'string' ? title : undefined)}
      toolbar={toolbar}
      isRefetching={isRefetching}
      fill
      className={className}
    >
      {children}
    </EntityListCard>
  </PageFrame>
);
