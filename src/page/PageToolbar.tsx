'use client';

import { Download, Loader2, MoreHorizontal, Plus } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import { type PageLinkComponent, useLinkComponent } from '../primitives/link.tsx';

// ─── Export ────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ExportButtonProps {
  /** Starts the download; a returned promise shows the spinner until it settles. */
  onExport: () => unknown;
  /** `Export to Excel` by default (the old wording everywhere). */
  label?: string;
  /** External pending state (e.g. a mutation's `isLoading`). */
  isExporting?: boolean;
  disabled?: boolean;
}

/** The one export button: outline, download icon, right before the overflow menu and the primary. */
export const ExportButton = ({ onExport, label, isExporting, disabled }: ExportButtonProps) => {
  const { t } = useTranslate();
  const [pending, setPending] = useState(false);
  const busy = isExporting ?? pending;

  const handleClick = () => {
    const result = onExport();
    if (!(result instanceof Promise)) return;
    setPending(true);
    void result.finally(() => setPending(false));
  };

  return (
    <Button type="button" variant="outline" onClick={handleClick} disabled={disabled || busy}>
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
      {label ?? t('Export to Excel')}
    </Button>
  );
};

// ─── Overflow menu ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface MoreActionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Irreversible or global maintenance: destructive text. */
  destructive?: boolean;
  /** A rule above this item (groups). */
  separatorBefore?: boolean;
}

export interface MoreActionsMenuProps {
  items: readonly MoreActionItem[];
  /** Accessible name of the trigger. */
  label?: string;
  disabled?: boolean;
}

/** Rare and maintenance actions in one overflow menu (outline `…` button), never as extra header buttons. */
export const MoreActionsMenu = ({ items, label, disabled }: MoreActionsMenuProps) => {
  const { t } = useTranslate();
  if (items.length === 0) return null;
  const triggerLabel = label ?? t('More actions');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label={triggerLabel} title={triggerLabel} disabled={disabled}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            {item.separatorBefore && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={item.disabled}
              onSelect={item.onSelect}
              variant={item.destructive ? 'destructive' : 'default'}
            >
              {item.icon}
              {t(item.label)}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ─── Add ───────────────────────────────────────────────────────────────────────────────────────────────────────────

interface AddEntityButtonBaseProps {
  /** Route of the create screen … */
  href?: string;
  linkComponent?: PageLinkComponent;
  /** … or a handler (opens a drawer / dialog). */
  onClick?: () => void;
  disabled?: boolean;
}

export type AddEntityButtonProps = AddEntityButtonBaseProps &
  (
    | {
        /** Singular entity name: the label reads `Add <entity>` (`Add World`, `Add Push Notification`). */
        entity: string;
        label?: undefined;
      }
    | {
        entity?: string;
        /** The whole label instead of `Add <entity>`, already translated by the host (`New cuisine`). */
        label: string;
      }
  );

/**
 * The page's one primary button, top right: `+ Add <Entity>`, or the host's `label`. A disabled link renders as a
 * disabled button.
 */
export const AddEntityButton = ({ entity, label, href, linkComponent, onClick, disabled }: AddEntityButtonProps) => {
  const { t } = useTranslate();
  const Link = useLinkComponent(linkComponent);
  const content = (
    <>
      <Plus aria-hidden />
      {label ?? t('Add %entity%', { replacements: { entity: t(entity ?? '') } })}
    </>
  );
  if (href && !disabled) {
    return (
      <Button asChild>
        <Link href={href}>{content}</Link>
      </Button>
    );
  }
  return (
    <Button type="button" onClick={onClick} disabled={disabled || (!onClick && !href)}>
      {content}
    </Button>
  );
};

// ─── Toolbar ───────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PageToolbarProps {
  /** Outline secondary actions, left. */
  children?: ReactNode;
  /** `ExportButton`. */
  exportAction?: ReactNode;
  /** Items of the `MoreActionsMenu`. */
  moreActions?: readonly MoreActionItem[];
  /** The one primary (`AddEntityButton`), always last. */
  primaryAction?: ReactNode;
  className?: string;
}

/**
 * The page header's action row in the fixed order: outline secondaries → export → overflow
 * menu → the single primary "Add <Entity>". Pass it as `EntityListPage.headerActions`, `PageHeader.actions` or
 * `EntityDetailShell.actions`.
 */
export const PageToolbar = ({ children, exportAction, moreActions, primaryAction, className }: PageToolbarProps) => (
  <div className={cn('flex flex-wrap items-center gap-2', className)}>
    {children}
    {exportAction}
    {moreActions && <MoreActionsMenu items={moreActions} />}
    {primaryAction}
  </div>
);
