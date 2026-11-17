'use client';

import { Skeleton } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { PAGE_INSET_CLASS } from './PageHeader.tsx';

export interface RouteLoadingProps {
  /** `list` (default): a title, a toolbar and a list card. `detail`: the cards of a detail tab. `form`: form sections. */
  variant?: 'list' | 'detail' | 'form';
  /** Rows of the list card (default 8). */
  rows?: number;
  /** The page inset (`PAGE_INSET_CLASS`), for a route whose layout brings none. */
  inset?: boolean;
  className?: string;
}

const keys = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => `${prefix}-${index}`);

/**
 * The instant placeholder of a route while its page loads (Next `loading.tsx`): a click switches at once, the
 * wireframe shows, then the content; the layouts above it (the shell, a detail header with its tabs) stay mounted.
 * A `status` region named "Loading…".
 */
export const RouteLoading = ({ variant = 'list', rows = 8, inset = false, className }: RouteLoadingProps) => {
  const { t } = useTranslate();
  return (
    <div role="status" aria-busy className={cn('space-y-4 py-2', inset && PAGE_INSET_CLASS, className)}>
      <span className="sr-only">{t('Loading…')}</span>
      {variant === 'list' && (
        <>
          <Skeleton className="h-9 w-56 max-w-full rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-72 max-w-full rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="surface space-y-3 rounded-3xl p-6">
            {keys(rows, 'row').map(key => (
              <Skeleton key={key} className="h-6 w-full" />
            ))}
          </div>
        </>
      )}
      {variant === 'detail' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {keys(3, 'card').map(key => (
            <Skeleton key={key} className="h-96 rounded-2xl" />
          ))}
        </div>
      )}
      {variant === 'form' && (
        <div className="space-y-4">
          {keys(2, 'section').map(key => (
            <div key={key} className="surface space-y-4 rounded-3xl p-6">
              <Skeleton className="h-5 w-40" />
              {keys(3, `${key}-field`).map(field => (
                <div key={field} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
