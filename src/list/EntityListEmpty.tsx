'use client';

import type { ComponentProps, ReactNode } from 'react';

import { Button } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface EntityListEmptyProps {
  message: ReactNode;
  tone?: 'default' | 'error';
  icon?: ReactNode;
  /** Renders an outlined "Clear search" button (the no-results state). */
  onClearSearch?: () => void;
  /**
   * One outlined call to action (e.g. "Create …"), rendered as given: give it the size of the built-in "Clear search"
   * button (`sm`; `xs` with `size="compact"`) or set `clearSearchSize` to match yours.
   */
  action?: ReactNode;
  /** Button size of the built-in "Clear search" (default `sm`, `xs` with `size="compact"`). */
  clearSearchSize?: ComponentProps<typeof Button>['size'];
  /**
   * `default`: the 64 px centred block of a list card. `compact`: one inline line (icon, message, buttons), for a
   * small list inside a card or a section.
   */
  size?: 'default' | 'compact';
}

/** Empty, no-results and error state of a list: one short sentence, at most one CTA. */
export const EntityListEmpty = ({
  message,
  tone = 'default',
  icon,
  onClearSearch,
  action,
  size = 'default',
  clearSearchSize,
}: EntityListEmptyProps) => {
  const { t } = useTranslate();
  if (size === 'compact') {
    return (
      <div
        data-list-empty
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-[13px] text-muted-foreground"
        role={tone === 'error' ? 'alert' : undefined}
      >
        {icon && <span className="flex shrink-0 [&_svg]:size-4">{icon}</span>}
        <span className={cn(tone === 'error' && 'text-destructive')}>{message}</span>
        {onClearSearch && (
          <Button variant="outline" size={clearSearchSize ?? 'xs'} onClick={onClearSearch}>
            {t('Clear search')}
          </Button>
        )}
        {action}
      </div>
    );
  }
  return (
  <div data-list-empty className="rounded-3xl px-4 py-16 text-center" role={tone === 'error' ? 'alert' : undefined}>
    {icon && <div className="mb-4 flex justify-center text-muted-foreground">{icon}</div>}
    <p className={cn('text-[13px] text-muted-foreground', tone === 'error' && 'text-destructive')}>{message}</p>
    {(onClearSearch || action) && (
      <div className="mt-4 flex items-center justify-center gap-2">
        {onClearSearch && (
          <Button variant="outline" size={clearSearchSize ?? 'sm'} onClick={onClearSearch}>
            {t('Clear search')}
          </Button>
        )}
        {action}
      </div>
    )}
  </div>
  );
};
