'use client';

import { useTranslate } from '../i18n/index.ts';
import { EntityListEmpty } from './EntityListEmpty.tsx';
import type { EntityListDataProps } from './types.ts';

type EntityListStatusProps = Pick<
  EntityListDataProps<unknown>,
  'isLoading' | 'emptyMessage' | 'noResultsMessage' | 'isSearchActive' | 'onClearSearch' | 'loadingMessage' | 'error' | 'emptyAction' | 'emptyIcon' | 'showEmptyState'
> & { itemCount: number };

/**
 * The non-row states every view shares: the loading announcement, the error block, and empty vs. no results (with
 * the outlined "Clear search"). Renders nothing while rows are on screen.
 */
export const EntityListStatus = ({
  itemCount,
  isLoading = false,
  emptyMessage,
  noResultsMessage,
  isSearchActive = false,
  onClearSearch,
  loadingMessage,
  error,
  emptyAction,
  emptyIcon,
  showEmptyState = true,
}: EntityListStatusProps) => {
  const { t } = useTranslate();
  if (error) return <EntityListEmpty tone="error" message={error} />;
  if (isLoading) {
    return (
      <span role="status" className="sr-only">
        {loadingMessage ?? t('Loading')}
      </span>
    );
  }
  if (itemCount > 0 || !showEmptyState) return null;
  return (
    <EntityListEmpty
      message={
        isSearchActive
          ? (noResultsMessage ?? t('Nothing matches your search'))
          : (emptyMessage ?? t('Nothing here yet'))
      }
      onClearSearch={isSearchActive ? onClearSearch : undefined}
      action={emptyAction}
      icon={emptyIcon}
    />
  );
};
