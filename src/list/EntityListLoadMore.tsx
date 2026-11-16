'use client';

import { useTranslate } from '../i18n/index.ts';
import { useInfiniteScrollSentinel } from '../logic/react/useInfiniteScrollSentinel.ts';

/** How far (px) before the end of the list the next page is requested. */
const PREFETCH_DISTANCE_PX = 400;

export interface EntityListLoadMoreProps {
  /** Rows are on screen and the server has more. */
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore?: () => void;
}

/**
 * The infinite-scroll tail of a table or grid. The list scrolls inside its card, so an
 * IntersectionObserver `rootMargin` (viewport only) cannot prefetch; the distance is built into the target instead:
 * a tall invisible box hanging up from the end of the content. One instance per scroll container: the one in a
 * hidden (`display: none`) container never intersects, so it never fires. The box is `sticky left-0`: inside a wide
 * table scrolled sideways an `absolute left-0` box stays at the content's left edge, is clipped and never intersects.
 */
export const EntityListLoadMore = ({ hasMore, isFetchingMore, onLoadMore }: EntityListLoadMoreProps) => {
  const { t } = useTranslate();
  const sentinelRef = useInfiniteScrollSentinel(() => {
    if (hasMore) onLoadMore?.();
  }, '0px');

  if (isFetchingMore) {
    return (
      <div className="flex justify-center py-4" role="status" aria-label={t('Loading more')}>
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!hasMore) return null;
  return (
    <div className="sticky left-0 h-0" aria-hidden>
      <div
        ref={sentinelRef}
        className="pointer-events-none absolute bottom-0 left-0 w-px"
        style={{ height: PREFETCH_DISTANCE_PX }}
      />
    </div>
  );
};
