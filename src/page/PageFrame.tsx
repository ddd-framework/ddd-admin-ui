import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';
import { PAGE_INSET_CLASS, PageHeader } from './PageHeader.tsx';

export interface PageFrameProps {
  /** The page title; a two-tone title wraps its brand part in `<em>`. */
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned page actions (one primary at most). */
  actions?: ReactNode;
  /** Before the title (an icon). */
  leading?: ReactNode;
  /** Under the header, before the body (summary tiles, a warning). */
  belowHeader?: ReactNode;
  /** The body: fills the room the header leaves from `md` (a list card, a chat, a map). */
  children: ReactNode;
  /** Minimum frame height from `md` (Tailwind class), default `md:min-h-[520px]`. */
  minHeightClassName?: string;
  /**
   * Drawn as a specimen inside another page (a showcase, a preview): no `data-page-frame` (the host shell's rules for a
   * real page frame stay out) and no full-height frame.
   */
  asSpecimen?: boolean;
  className?: string;
}

/**
 * A full-height page (list page, chat center, map page): from `md` exactly the room the chrome leaves
 * (`100dvh - --nav-h`), so the page never scrolls and the body scrolls inside its card; on a phone the frame grows
 * with its content and the window scrolls. Same inset and the same `PageHeader` as every other page — the title sits
 * where it sits on a form or dashboard. The root is `[data-page-frame]`: the shell's padded column steps aside for it.
 */
export const PageFrame = ({
  title,
  description,
  actions,
  leading,
  belowHeader,
  children,
  minHeightClassName = 'md:min-h-[520px]',
  asSpecimen = false,
  className,
}: PageFrameProps) => (
  <div
    data-page-frame={asSpecimen ? undefined : ''}
    className={cn('flex flex-col', !asSpecimen && 'md:h-[calc(100dvh_-_var(--nav-h))]', minHeightClassName)}
  >
    <div className={cn('flex flex-col md:min-h-0 md:flex-1', PAGE_INSET_CLASS, className)}>
      <PageHeader title={title} description={description} actions={actions} leading={leading} className="shrink-0" />
      {belowHeader && <div className="-mt-3 mb-6 shrink-0 empty:hidden">{belowHeader}</div>}
      <div className="flex flex-col md:min-h-0 md:flex-1">{children}</div>
    </div>
  </div>
);
