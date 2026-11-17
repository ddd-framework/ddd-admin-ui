import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';
import { isInlineDescription } from '../primitives/descriptionContent.ts';

/**
 * The one page inset: 16 px on a phone, 24 px from `sm`, 32 px from `lg`; 16 / 24 / 32 px top
 * and bottom. The shell's padded column (`[data-page-shell]`) and every full-height frame (`PageFrame`, the list page)
 * use it, so a title, a card edge and the page's right edge sit on the same lines on every screen.
 */
export const PAGE_INSET_CLASS = 'px-4 py-4 sm:px-6 md:py-6 lg:px-8 lg:py-8';

export interface PageHeaderProps {
  /** The page title; a two-tone title wraps its brand part in `<em>` (`Good <em>morning</em>`). */
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions (one primary at most). */
  actions?: ReactNode;
  /** Before the title (an icon). A back link belongs to a detail or form header (`EntityDetailShell`, `FormHeader`). */
  leading?: ReactNode;
  /** `center` puts title and description on the page's centre line (dashboards and settings pages). */
  align?: 'start' | 'center';
  className?: string;
}

/**
 * Title block of every page that is not an entity detail or form (clouds look: no panel,
 * fluid page-title size, the `<em>` part in the brand ink). List pages (`EntityListPage`) and full-height frames
 * (`PageFrame`) render this same block, so the header is identical everywhere: same size, same position, 24 px to the
 * first card.
 */
export const PageHeader = ({ title, description, actions, leading, align = 'start', className }: PageHeaderProps) => (
  <div
    className={cn(
      'mb-6 flex flex-col gap-4 md:flex-row md:items-center',
      align === 'center' ? 'items-center text-center md:flex-col' : 'items-start justify-between',
      className
    )}
  >
    <div className={cn('flex min-w-0 items-center gap-3', align === 'start' && 'md:flex-1')}>
      {leading}
      <div className="min-w-0">
        <h1 className="text-title-page font-semibold tracking-tight break-words">{title}</h1>
        {description &&
          (isInlineDescription(description) ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          ) : (
            <div className="mt-1.5 text-sm text-muted-foreground">{description}</div>
          ))}
      </div>
    </div>
    {actions && (
      <div
        className={cn(
          'flex w-full flex-wrap items-center gap-2 md:w-auto',
          align === 'center' ? 'justify-center' : 'md:justify-end'
        )}
      >
        {actions}
      </div>
    )}
  </div>
);
