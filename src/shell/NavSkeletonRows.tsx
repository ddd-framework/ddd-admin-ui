'use client';

import { useTranslate } from '../i18n/useTranslate.ts';
import { cn } from '../primitives/cn.ts';
import { Skeleton } from '../primitives/skeleton.tsx';
import { NAV_RAIL_ROW_CLASS, NAV_ROW_CLASS } from './navClasses.ts';

/** The default number of skeleton rows while the navigation loads. */
export const NAV_SKELETON_ROW_COUNT = 6;

/** Text widths of the skeleton rows, so the column does not read as a grid. */
const LABEL_WIDTHS = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16', 'w-24'];

/**
 * Placeholder rows while the navigation loads (`navigationLoading`): an icon and a label bar per row in the list, an
 * icon per row on the rail. Decorative; one screen-reader text says the navigation is loading.
 */
export const NavSkeletonRows = ({ count = NAV_SKELETON_ROW_COUNT, rail = false, className }: { count?: number; rail?: boolean; className?: string }) => {
  const { t } = useTranslate();
  return (
    <ul data-nav-loading="" aria-busy="true" className={cn('space-y-1', className)}>
      <li className="sr-only">{t('Loading navigation')}</li>
      {Array.from({ length: Math.max(0, count) }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <li key={index} aria-hidden>
          <div className={cn(NAV_ROW_CLASS, 'hover:bg-transparent', rail && NAV_RAIL_ROW_CLASS)}>
            <Skeleton className="size-[1.125rem] shrink-0 rounded-md" />
            {!rail && <Skeleton className={cn('h-3.5', LABEL_WIDTHS[index % LABEL_WIDTHS.length])} />}
          </div>
        </li>
      ))}
    </ul>
  );
};
