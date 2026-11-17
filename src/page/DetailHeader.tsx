import type { ReactNode } from 'react';

import { FormActionsSlot, Skeleton } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import { isInlineDescription } from '../primitives/descriptionContent.ts';

export interface DetailHeaderProps {
  /** The ghost back button (left column). */
  back?: ReactNode;
  title: ReactNode;
  /** One muted line under the title. */
  description?: ReactNode;
  /** Right column: the stacked `EntityMetadata` block, then the page actions. */
  aside?: ReactNode;
  /** A skeleton title while the entity loads (the aside is hidden). */
  isLoading?: boolean;
  /**
   * A sub-entity or sub-form inside another entity's detail shell (a team in a world, a track in an account): the
   * title is an `h2` in the section size — the page keeps one `h1` and the outer header stays the dominant one.
   */
  nested?: boolean;
  /**
   * A `FormActionsSlot` at the end of the right column: the actions of the form below move up into the header (needs
   * a `FormActionsSlotProvider` around header and form; `EntityDetailShell formActionsSlot` brings one).
   */
  formActionsSlot?: boolean;
  className?: string;
}

/**
 * The header of every entity detail and form page: back left, the title centred, metadata
 * and actions right. Two equal side columns keep the title on the page's centre line whatever the actions' width;
 * stacked (back, title, aside) below `md`. `EntityDetailShell` and `FormHeader` both draw it, so a create page and the
 * entity's detail page have the same header.
 */
export const DetailHeader = ({
  back,
  title,
  description,
  aside,
  isLoading = false,
  nested = false,
  formActionsSlot = false,
  className,
}: DetailHeaderProps) => {
  const Heading = nested ? 'h2' : 'h1';
  return (
  <header className={cn('mb-6 flex flex-col gap-3 md:flex-row md:items-center md:gap-4', className)}>
    <div className="flex items-center md:flex-1 md:basis-0">{back}</div>
    {isLoading ? (
      <div className="flex min-w-0 flex-col items-center gap-2 md:max-w-[60%]" aria-busy>
        <Skeleton className={cn('w-64 max-w-full', nested ? 'h-7' : 'h-9')} />
        <Skeleton className="h-4 w-40 max-w-full" />
        <span className="sr-only">Loading…</span>
      </div>
    ) : (
      <div className="min-w-0 text-center md:max-w-[60%]">
        <Heading
          className={cn('truncate font-semibold tracking-tight', nested ? 'text-title-section' : 'text-title-page')}
        >
          {title}
        </Heading>
        {description &&
          (isInlineDescription(description) ? (
            <p className="mt-1.5 truncate text-sm text-muted-foreground">{description}</p>
          ) : (
            <div className="mt-1.5 truncate text-sm text-muted-foreground">{description}</div>
          ))}
      </div>
    )}
    <div className="flex flex-wrap items-center justify-center gap-3 md:flex-1 md:basis-0 md:justify-end">
      {!isLoading && aside}
      {formActionsSlot && <FormActionsSlot />}
    </div>
  </header>
  );
};
