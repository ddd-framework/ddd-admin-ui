'use client';

import { ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

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

/** The red outline of the destructive bulk actions (`Delete (n)`, an action with `variant: 'destructive'`). */
const DESTRUCTIVE_CLASS = 'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive';

/** One sub-choice of a bulk action with `choices` (a destination, a status). */
export interface EntityListBulkActionChoice {
  id: string;
  label: string;
  disabled?: boolean;
  /** `false`: `label` is already translated (a name from the server). */
  translate?: boolean;
  /** Classes of the choice's menu item (e.g. `min-w-0` with a truncating label: the label sits in a `truncate` span). */
  className?: string;
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
  /** The dismiss button's label (default: the confirmation's own "Cancel"). */
  cancelLabel?: string;
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
  /** `destructive`: the red outline of `Delete (n)` (an irreversible action with choices or a confirmation). */
  variant?: 'default' | 'destructive';
  /**
   * `false`: `label`, `hint`, `choicesLabel` and the `confirm` texts are already translated and shown as given
   * (`%count%` is still filled in). Default: English UI texts, translated by the bar.
   */
  translate?: boolean;
  /**
   * Classes of the count in the label (` (3)`), e.g. a muted tone; without it the label is one text. With it the label
   * is one element holding the text and the count, so the button's gap does not open around the count.
   */
  countClassName?: string;
  /** Classes of the action's button. */
  className?: string;
  /** Classes of the choices menu (an action with `choices`). */
  choicesClassName?: string;
}

export interface EntityListBulkBarProps {
  /** `useRowSelection()` (or anything with `count` + `clear`; `allLoadedState` for `moreOnServer`). */
  selection: { count: number; clear: () => void; allLoadedState?: boolean | 'indeterminate' };
  /** Secondary bulk actions, outline, in this order. */
  actions?: EntityListBulkAction[];
  /** The destructive bulk action, always last: `Delete (n)`. Confirm inside the handler, or set `deleteConfirm`. */
  onDelete?: () => void;
  deleteLabel?: string;
  deleteBusy?: boolean;
  /** Delete is off for this selection (with `deleteHint` saying why). */
  deleteDisabled?: boolean;
  /** Tooltip of Delete (e.g. why it is disabled); English UI text, translated by the bar. */
  deleteHint?: string;
  /** Ask before `onDelete` runs (same rules as an action's `confirm`). */
  deleteConfirm?: EntityListBulkActionConfirm;
  /**
   * `false`: `deleteLabel`, `deleteHint` and the `deleteConfirm` texts are already translated and shown as given
   * (`%count%` is still filled in). Default: English UI texts, translated by the bar.
   */
  deleteTranslate?: boolean;
  /** Classes of the Delete button (after its red outline). */
  deleteClassName?: string;
  /** Classes of the count in Delete's label (as an action's `countClassName`). */
  deleteCountClassName?: string;
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
  /** The visible count is a polite live region: a screen reader hears "3 selected" when the selection changes. */
  countLive?: boolean;
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
  deleteDisabled = false,
  deleteHint,
  deleteConfirm,
  deleteTranslate = true,
  deleteClassName,
  deleteCountClassName,
  countLive = false,
}: EntityListBulkBarProps) => {
  const { t } = useTranslate();
  const writeAccess = useWriteAccess();
  const confirm = useConfirm();
  const { count, clear } = selection;
  if (count === 0) return null;
  const writeBlocked = !writeAccess.allowed;
  const blockedTitle = writeBlocked ? writeAccess.reason : undefined;

  /** A text of an action: translated (default) or as given, `%count%` filled in either way. */
  const textOf = (action: Pick<EntityListBulkAction, 'translate'>, text: string) =>
    action.translate === false ? text.replaceAll('%count%', String(count)) : t(text);
  const fill = (action: Pick<EntityListBulkAction, 'translate'>, text: string) =>
    action.translate === false ? text.replaceAll('%count%', String(count)) : t(text, { count, replacements: { count } });
  /** Runs `run` after the action's confirmation (if any) was accepted. */
  const confirmThen = async (action: Pick<EntityListBulkAction, 'confirm' | 'translate'>, run: () => void) => {
    if (action.confirm) {
      const accepted = await confirm({
        title: fill(action, action.confirm.title),
        description: action.confirm.description ? fill(action, action.confirm.description) : undefined,
        confirmLabel: action.confirm.confirmLabel ? textOf(action, action.confirm.confirmLabel) : undefined,
        ...(action.confirm.cancelLabel ? { cancelLabel: textOf(action, action.confirm.cancelLabel) } : {}),
        confirmVariant: action.confirm.confirmVariant,
      });
      if (!accepted) return;
    }
    run();
  };
  const withHint = (action: Pick<EntityListBulkAction, 'id' | 'hint' | 'translate'>, control: ReactNode) =>
    action.hint ? (
      <Tooltip key={action.id}>
        <TooltipTrigger asChild>
          <span className="inline-flex" tabIndex={-1}>
            {control}
          </span>
        </TooltipTrigger>
        <TooltipContent>{textOf(action, action.hint)}</TooltipContent>
      </Tooltip>
    ) : (
      control
    );
  /** `Label (n)`: one text, or (with `countClassName`) the count in its own span, in the order the translation puts it. */
  const labelWithCount = (label: string, countClassName?: string): ReactNode => {
    if (!countClassName) return t('%label% (%count%)', { replacements: { label, count } });
    const template = t('%label% (%count%)', { replacements: { label: '\u0001', count: '\u0002' } });
    // one element: the button's gap must not open between the label, the brackets and the count
    return <span data-bulk-label="">{template.split(/(\u0001|\u0002)/).map((part, index) =>
      part === '\u0001' ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed template
        <Fragment key={index}>{label}</Fragment>
      ) : part === '\u0002' ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: the parts of one fixed template
        <span key={index} className={countClassName}>
          {count}
        </span>
      ) : (
        part
      )
    )}</span>;
  };

  return (
    <div
      role="toolbar"
      aria-label={t('Bulk actions')}
      data-agent-skip=""
      className={cn(
        'glass-bar flex flex-wrap items-center gap-2 rounded-xl px-3 py-1.5 shadow-[var(--surface-shadow)]',
        className
      )}
    >
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-bold tabular-nums" {...(countLive ? { role: 'status', 'aria-live': 'polite' as const } : {})}>
          {t('{count, plural, other {# selected}}', { count })}
        </span>
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
              {labelWithCount(textOf(action, action.label), action.countClassName)}
            </>
          );
          const buttonClass = cn('h-8 bg-card', action.variant === 'destructive' && DESTRUCTIVE_CLASS, action.className);
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
                    className={buttonClass}
                  >
                    {content}
                    <ChevronDown aria-hidden className="opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={action.choicesClassName}>
                  {action.choicesLabel && (
                    <>
                      <DropdownMenuLabel>{textOf(action, action.choicesLabel)}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {choices.map(choice => (
                    <DropdownMenuItem
                      key={choice.id}
                      disabled={choice.disabled}
                      onSelect={() => void confirmThen(action, () => action.onChoose?.(choice))}
                      className={choice.className}
                    >
                      {choice.className ? (
                        <span className="min-w-0 truncate">{choice.translate === false ? choice.label : t(choice.label)}</span>
                      ) : choice.translate === false ? (
                        choice.label
                      ) : (
                        t(choice.label)
                      )}
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
              className={buttonClass}
            >
              {content}
            </Button>
          );
        })}
        {onDelete &&
          withHint(
            { id: 'delete', hint: deleteHint, translate: deleteTranslate === false ? false : undefined },
            <Button
              key="delete"
              type="button"
              size="sm"
              variant="outline"
              onClick={
                deleteConfirm
                  ? () => void confirmThen({ confirm: deleteConfirm, translate: deleteTranslate === false ? false : undefined }, onDelete)
                  : onDelete
              }
              disabled={disabled || busy || writeBlocked || deleteDisabled}
              title={deleteHint ? undefined : blockedTitle}
              className={cn('h-8 border-destructive/40 bg-card text-destructive hover:bg-destructive/10 hover:text-destructive', deleteClassName)}
            >
              {deleteBusy ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
              {labelWithCount(deleteTranslate === false ? deleteLabel.replaceAll('%count%', String(count)) : t(deleteLabel), deleteCountClassName)}
            </Button>
          )}
      </div>
    </div>
  );
};
