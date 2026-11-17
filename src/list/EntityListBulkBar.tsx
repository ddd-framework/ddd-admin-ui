'use client';

import { ChevronDown, Loader2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { useConfirm } from '../logic/react/useConfirm.ts';
import { useWriteAccess } from '../logic/react/writeAccess.ts';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';

/** One sub-choice of a bulk action with `choices` (a destination, a status). */
export interface EntityListBulkActionChoice {
  id: string;
  label: string;
  disabled?: boolean;
  /** `false`: `label` is already translated (a name from the server). */
  translate?: boolean;
}

/**
 * A confirmation the bar asks before an action runs (through `useConfirm()`, so the dialog of `AdminUiProvider` or the
 * host's service). `%count%` in `title` and `description` is the number of selected rows; an ICU plural
 * (`{count, plural, one {…} other {…}}`) gets the count as well. Texts are English UI texts, translated by the bar.
 */
export interface EntityListBulkActionConfirm {
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive';
}

export interface EntityListBulkAction {
  id: string;
  /** Without the count: the bar appends ` (n)` (`Recreate (3)`). */
  label: string;
  icon?: ReactNode;
  /** Runs the action (after `confirm`, when set). Not called for an action with `choices` (`onChoose` is). */
  onClick?: () => void;
  /**
   * Sub-choices (move to a section, set a status): the button opens a menu, the picked choice reaches `onChoose`
   * (after `confirm`). An empty list keeps the button visible and disabled.
   */
  choices?: readonly EntityListBulkActionChoice[];
  /** Heading of the choices menu. */
  choicesLabel?: string;
  /** Called with the picked choice of an action with `choices`. */
  onChoose?: (choice: EntityListBulkActionChoice) => void;
  /** Ask before running, with the selection count filled in. */
  confirm?: EntityListBulkActionConfirm;
  /**
   * Shown as a tooltip on the action (e.g. why it is disabled for this selection); a disabled button gets it on a
   * wrapper, which still receives the pointer. Needs the tooltip provider of `AdminUiProvider`.
   */
  hint?: string;
  disabled?: boolean;
  /** This action is running: spinner instead of the icon. */
  busy?: boolean;
  /** An action that only reads (export, copy ids): not disabled by `WriteAccessProvider`. */
  ignoreWriteAccess?: boolean;
}

export interface EntityListBulkBarProps {
  /** `useRowSelection()` (or anything with `count` + `clear`; `allLoadedState` for `moreOnServer`). */
  selection: { count: number; clear: () => void; allLoadedState?: boolean | 'indeterminate' };
  /** Secondary bulk actions, outline, in this order. */
  actions?: EntityListBulkAction[];
  /** The destructive bulk action, always last: `Delete (n)`. Confirm inside the handler. */
  onDelete?: () => void;
  deleteLabel?: string;
  deleteBusy?: boolean;
  /**
   * Disables every action (writes not allowed, another bulk action running); Clear stays usable unless `busy`. A
   * `WriteAccessProvider` with `allowed: false` disables the actions and Delete as well (not Clear, not an action with
   * `ignoreWriteAccess`).
   */
  disabled?: boolean;
  /** A bulk action is running: Clear is locked too. */
  busy?: boolean;
  /** Extra content after the count (e.g. "Select all 1,240 matching"). */
  children?: ReactNode;
  className?: string;
  /**
   * The list has rows on the server beyond the loaded ones: while every loaded row is selected (`allLoadedState`
   * `true` on the selection), the bar notes that only the loaded rows are selected.
   */
  moreOnServer?: boolean;
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
  moreOnServer = false,
}: EntityListBulkBarProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const { count, clear } = selection;
  if (count === 0) return null;
  const writeBlocked = !writeAccess.allowed;
  const blockedTitle = writeBlocked ? writeAccess.reason : undefined;

  const fill = (text: string) => t(text, { count, replacements: { count } });
  /** Runs `run` after the action's confirmation (if any) was accepted. */
  const confirmThen = async (action: EntityListBulkAction, run: () => void) => {
    if (action.confirm) {
      const accepted = await confirm({
        title: fill(action.confirm.title),
        description: action.confirm.description ? fill(action.confirm.description) : undefined,
        confirmLabel: action.confirm.confirmLabel ? t(action.confirm.confirmLabel) : undefined,
        confirmVariant: action.confirm.confirmVariant,
      });
      if (!accepted) return;
    }
    run();
  };
  const withHint = (action: EntityListBulkAction, control: ReactNode) =>
    action.hint ? (
      <Tooltip key={action.id}>
        <TooltipTrigger asChild>
          <span className="inline-flex" tabIndex={-1}>
            {control}
          </span>
        </TooltipTrigger>
        <TooltipContent>{t(action.hint)}</TooltipContent>
      </Tooltip>
    ) : (
      control
    );

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
        {moreOnServer && selection.allLoadedState === true && (
          <span className="text-muted-foreground">{t('Only the loaded rows are selected; more match on the server.')}</span>
        )}
        {children}
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map(action => {
          const actionDisabled = disabled || busy || action.disabled || (writeBlocked && !action.ignoreWriteAccess);
          const content = (
            <>
              {action.busy ? <Loader2 className="animate-spin" aria-hidden /> : action.icon}
              {t('%label% (%count%)', { replacements: { label: t(action.label), count } })}
            </>
          );
          if (action.choices) {
            const choices = action.choices;
            return withHint(
              action,
              <DropdownMenu key={action.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={actionDisabled || choices.length === 0}
                    title={action.ignoreWriteAccess || action.hint ? undefined : blockedTitle}
                    className="h-8 bg-card"
                  >
                    {content}
                    <ChevronDown aria-hidden className="opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {action.choicesLabel && (
                    <>
                      <DropdownMenuLabel>{t(action.choicesLabel)}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {choices.map(choice => (
                    <DropdownMenuItem
                      key={choice.id}
                      disabled={choice.disabled}
                      onSelect={() => void confirmThen(action, () => action.onChoose?.(choice))}
                    >
                      {choice.translate === false ? choice.label : t(choice.label)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }
          return withHint(
            action,
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={action.confirm ? () => void confirmThen(action, () => action.onClick?.()) : action.onClick}
              disabled={actionDisabled}
              title={action.ignoreWriteAccess || action.hint ? undefined : blockedTitle}
              className="h-8 bg-card"
            >
              {content}
            </Button>
          );
        })}
        {onDelete && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onDelete}
            disabled={disabled || busy || writeBlocked}
            title={blockedTitle}
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
