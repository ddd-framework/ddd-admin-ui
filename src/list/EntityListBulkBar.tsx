'use client';

import { Loader2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

export interface EntityListBulkAction {
  id: string;
  /** Without the count: the bar appends ` (n)` (`Recreate (3)`). */
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** This action is running: spinner instead of the icon. */
  busy?: boolean;
}

export interface EntityListBulkBarProps {
  /** `useRowSelection()` (or anything with `count` + `clear`). */
  selection: { count: number; clear: () => void };
  /** Secondary bulk actions, outline, in this order. */
  actions?: EntityListBulkAction[];
  /** The destructive bulk action, always last: `Delete (n)`. Confirm inside the handler. */
  onDelete?: () => void;
  deleteLabel?: string;
  deleteBusy?: boolean;
  /** Disables every action (writes not allowed, another bulk action running); Clear stays usable unless `busy`. */
  disabled?: boolean;
  /** A bulk action is running: Clear is locked too. */
  busy?: boolean;
  /** Extra content after the count (e.g. "Select all 1,240 matching"). */
  children?: ReactNode;
  className?: string;
}

/**
 * The one bulk-action bar: pass it as `EntityListToolbar.bulkBar`; it renders nothing while no
 * row is selected. Left: `n selected · Clear`; right: outline actions, then the destructive `Delete (n)` last. Every
 * write action also takes the host's write guard via `disabled`.
 */
export const EntityListBulkBar = ({
  selection,
  actions = [],
  onDelete,
  deleteLabel = 'Delete',
  deleteBusy = false,
  disabled = false,
  busy = false,
  children,
  className,
}: EntityListBulkBarProps) => {
  const { t } = useTranslate();
  const { count, clear } = selection;
  if (count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label={t('Bulk actions')}
      className={cn(
        'glass-bar flex flex-wrap items-center gap-2 rounded-xl px-3 py-1.5 shadow-[var(--surface-shadow)]',
        className
      )}
    >
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-bold tabular-nums">{t('{count, plural, other {# selected}}', { count })}</span>
        <span className="text-muted-foreground" aria-hidden>
          ·
        </span>
        <Button type="button" variant="link" size="xs" onClick={clear} disabled={busy} className="h-auto px-0 text-[13px] font-semibold">
          {t('Clear', { context: 'selection-action' })}
        </Button>
        {children}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map(action => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={action.onClick}
            disabled={disabled || busy || action.disabled}
            className="h-8 bg-card"
          >
            {action.busy ? <Loader2 className="animate-spin" aria-hidden /> : action.icon}
            {t('%label% (%count%)', { replacements: { label: t(action.label), count } })}
          </Button>
        ))}
        {onDelete && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={disabled || busy}
            className="h-8 border-destructive/40 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {deleteBusy ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
            {t('%label% (%count%)', { replacements: { label: t(deleteLabel), count } })}
          </Button>
        )}
      </div>
    </div>
  );
};
