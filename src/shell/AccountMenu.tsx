'use client';

import { ChevronDown } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';

import { useTranslate } from '../i18n/useTranslate.ts';
import type { NavigationIcon } from '../logic/pure/navigation.ts';
import { cn } from '../primitives/cn.ts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu.tsx';
import { ShellNavLink } from './ShellNavLink.tsx';

/** One entry of the account menu: a link (`href`) or an action (`onSelect`). */
export interface AccountMenuEntry {
  key: string;
  /** UI text, translated when rendered. */
  label: string;
  icon?: NavigationIcon;
  href?: string;
  /** With `href`: a plain `<a>` (full page load, another application). */
  external?: boolean;
  onSelect?: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  /** A separator before this entry. */
  separatorBefore?: boolean;
}

export interface AccountMenuProps {
  /** The signed-in account's name; absent while the session loads (then `fallback` shows, e.g. a bare sign-out). */
  name?: string | null;
  /** A second line under the name (account type, id); data, shown as given. */
  description?: ReactNode;
  /** Avatar image; without it the initials of `name` on the brand colour. */
  avatarUrl?: string | null;
  /**
   * The avatar drawn in the trigger and the menu's header instead of the default one (e.g.
   * `<AccountAvatar name={name} icon={<UserRound />} className="bg-brand text-brand-foreground" />`); decorative.
   */
  avatar?: ReactNode;
  /** Classes of the default avatar in the trigger and the header (its fill: `bg-brand text-brand-foreground`). */
  avatarClassName?: string;
  entries: readonly AccountMenuEntry[];
  /** More menu content after the entries (`LanguageMenuSub`, a theme switch). */
  children?: ReactNode;
  /** Menu content between the header and the first entry (a scope switch, a status line). */
  beforeEntries?: ReactNode;
  /** Rendered instead of the menu without a `name`, so nobody is left without a way out. */
  fallback?: ReactNode;
  className?: string;
}

const initialsOf = (name: string): string => {
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}` : name.slice(0, 2);
  return initials.toUpperCase();
};

/**
 * A round avatar: the image, else `icon`, else the initials of `name`. Decorative (the name is always next to it or in
 * a label).
 */
export const AccountAvatar = ({
  name,
  avatarUrl,
  icon,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  /** Drawn instead of the initials when there is no image (a 16 px icon). */
  icon?: ReactNode;
  className?: string;
}) => (
  <span
    aria-hidden
    className={cn(
      'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-xs font-semibold text-brand-ink',
      className
    )}
  >
    {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : (icon ?? initialsOf(name))}
  </span>
);

/** Avatar, name and description in a row (the menu's header; a mobile menu footer). */
export const AccountSummary = ({
  name,
  description,
  avatarUrl,
  avatar,
  avatarClassName,
}: {
  name: string;
  description?: ReactNode;
  avatarUrl?: string | null;
  /** Drawn instead of the default avatar. */
  avatar?: ReactNode;
  /** Classes of the default avatar. */
  avatarClassName?: string;
}) => (
  <div className="flex min-w-0 items-center gap-3">
    {avatar ?? <AccountAvatar name={name} avatarUrl={avatarUrl} className={avatarClassName} />}
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">{name}</p>
      {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
    </div>
  </div>
);

/**
 * The account corner of the top bar, fed by the host: a pill with the avatar and the name (the name hides on narrow
 * screens; the button keeps "Account menu of …" as its name), a menu with the account summary, the host's entries
 * (links through the host link, actions, separators, a destructive sign-out) and `children`. Without a name the
 * `fallback` renders instead.
 */
export const AccountMenu = ({
  name,
  description,
  avatarUrl,
  avatar,
  avatarClassName,
  entries,
  children,
  beforeEntries,
  fallback,
  className,
}: AccountMenuProps) => {
  const { t } = useTranslate();
  if (!name) return <>{fallback ?? null}</>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('Account menu of %name%', { replacements: { name } })}
        data-shell-account-menu=""
        className={cn(
          'inline-flex h-10 shrink-0 items-center gap-2 rounded-full p-1 text-sm font-medium text-foreground transition-colors outline-none hover:bg-tint focus-visible:ring-2 focus-visible:ring-ring sm:pe-3',
          className
        )}
      >
        {avatar ?? <AccountAvatar name={name} avatarUrl={avatarUrl} className={avatarClassName} />}
        <span className="hidden max-w-48 truncate sm:inline">{name}</span>
        <ChevronDown aria-hidden className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="py-2 font-normal">
          <AccountSummary name={name} description={description} avatarUrl={avatarUrl} avatar={avatar} avatarClassName={avatarClassName} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {beforeEntries}
        {entries.map(entry => {
          const Icon = entry.icon;
          const content = (
            <>
              {Icon && <Icon aria-hidden />}
              <span className="min-w-0 truncate">{t(entry.label)}</span>
            </>
          );
          return (
            <Fragment key={entry.key}>
              {entry.separatorBefore && <DropdownMenuSeparator />}
              {entry.href !== undefined ? (
                <DropdownMenuItem asChild variant={entry.variant} disabled={entry.disabled} onSelect={entry.onSelect}>
                  <ShellNavLink item={{ key: entry.key, href: entry.href, external: entry.external }} data-nav-key={undefined} data-account-entry={entry.key}>{content}</ShellNavLink>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant={entry.variant} disabled={entry.disabled} onSelect={entry.onSelect} data-account-entry={entry.key}>
                  {content}
                </DropdownMenuItem>
              )}
            </Fragment>
          );
        })}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
