'use client';

import { ChevronDown } from 'lucide-react';
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react';

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
  /** Menu content right before this entry (after its separator): a heading, a status line. */
  before?: ReactNode;
  /** Extra classes of this entry (after the menu's `itemClassName`). */
  className?: string;
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
  /** `full` (default): avatar, name (from `sm`) and chevron; `avatar`: the avatar alone (the button keeps its name). */
  triggerVariant?: 'full' | 'avatar';
  /** Classes of the menu's content (its width: default `w-72`). */
  contentClassName?: string;
  /** The menu's header: default the account summary; a node replaces it; `false` drops it with its separator. */
  header?: ReactNode | false;
  /** Extra classes of every entry. */
  itemClassName?: string;
  /** Menu content after the entries, before `children`. */
  afterEntries?: ReactNode;
  /** The trigger's accessible name, already translated, instead of "Account menu of <name>". */
  triggerAriaLabel?: string;
  /** The default avatar's letters instead of the ones taken from `name` (`MG`). */
  initials?: string;
  /** An `avatarUrl` that fails to load shows the initials instead of an empty circle (default `false`). */
  avatarFallbackOnError?: boolean;
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
  initials,
  fallbackOnError = false,
}: {
  name: string;
  avatarUrl?: string | null;
  /** Drawn instead of the initials when there is no image (a 16 px icon). */
  icon?: ReactNode;
  className?: string;
  /** The letters instead of the ones taken from `name`. */
  initials?: string;
  /** An image that fails to load shows `icon` / the initials instead (default `false`). */
  fallbackOnError?: boolean;
}) => {
  // the URL that failed: a new URL is tried again
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl) && !(fallbackOnError && failedUrl === avatarUrl);
  const imageRef = useRef<HTMLImageElement>(null);
  // an image that failed before hydration fired its error before React listened: read its state after mount
  useEffect(() => {
    const image = imageRef.current;
    if (fallbackOnError && image && avatarUrl && image.complete && image.naturalWidth === 0) setFailedUrl(avatarUrl);
  }, [fallbackOnError, avatarUrl]);
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-xs font-semibold text-brand-ink',
        className
      )}
    >
      {showImage ? (
        <img
          ref={imageRef}
          src={avatarUrl as string}
          alt=""
          className="size-full object-cover"
          onError={fallbackOnError ? () => setFailedUrl(avatarUrl ?? null) : undefined}
        />
      ) : (
        (icon ?? initials ?? initialsOf(name))
      )}
    </span>
  );
};

/** Avatar, name and description in a row (the menu's header; a mobile menu footer). */
export const AccountSummary = ({
  name,
  description,
  avatarUrl,
  avatar,
  avatarClassName,
  initials,
  avatarFallbackOnError,
}: {
  name: string;
  description?: ReactNode;
  avatarUrl?: string | null;
  /** Drawn instead of the default avatar. */
  avatar?: ReactNode;
  /** Classes of the default avatar. */
  avatarClassName?: string;
  /** The default avatar's letters instead of the ones taken from `name`. */
  initials?: string;
  /** A failing `avatarUrl` shows the initials. */
  avatarFallbackOnError?: boolean;
}) => (
  <div className="flex min-w-0 items-center gap-3">
    {avatar ?? <AccountAvatar name={name} avatarUrl={avatarUrl} className={avatarClassName} initials={initials} fallbackOnError={avatarFallbackOnError} />}
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
  triggerVariant = 'full',
  contentClassName,
  header,
  itemClassName,
  afterEntries,
  triggerAriaLabel,
  initials,
  avatarFallbackOnError,
}: AccountMenuProps) => {
  const { t } = useTranslate();
  if (!name) return <>{fallback ?? null}</>;
  const full = triggerVariant === 'full';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={triggerAriaLabel ?? t('Account menu of %name%', { replacements: { name } })}
        data-shell-account-menu=""
        className={cn(
          'inline-flex h-10 shrink-0 items-center gap-2 rounded-full p-1 text-sm font-medium text-foreground transition-colors outline-none hover:bg-tint focus-visible:ring-2 focus-visible:ring-ring',
          full && 'sm:pe-3',
          className
        )}
      >
        {avatar ?? <AccountAvatar name={name} avatarUrl={avatarUrl} className={avatarClassName} initials={initials} fallbackOnError={avatarFallbackOnError} />}
        {full && <span className="hidden max-w-48 truncate sm:inline">{name}</span>}
        {full && <ChevronDown aria-hidden className="hidden size-4 text-muted-foreground sm:block" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={contentClassName ? cn('w-72', contentClassName) : 'w-72'}>
        {header !== false && (
          <>
            <DropdownMenuLabel className="py-2 font-normal">
              {header ?? (
                <AccountSummary
                  name={name}
                  description={description}
                  avatarUrl={avatarUrl}
                  avatar={avatar}
                  avatarClassName={avatarClassName}
                  initials={initials}
                  avatarFallbackOnError={avatarFallbackOnError}
                />
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {beforeEntries}
        {entries.map(entry => {
          const Icon = entry.icon;
          const entryClassName = entry.className ? cn(itemClassName, entry.className) : itemClassName;
          const content = (
            <>
              {Icon && <Icon aria-hidden />}
              <span className="min-w-0 truncate">{t(entry.label)}</span>
            </>
          );
          return (
            <Fragment key={entry.key}>
              {entry.separatorBefore && <DropdownMenuSeparator />}
              {entry.before}
              {entry.href !== undefined ? (
                <DropdownMenuItem asChild variant={entry.variant} disabled={entry.disabled} onSelect={entry.onSelect} className={entryClassName}>
                  <ShellNavLink item={{ key: entry.key, href: entry.href, external: entry.external }} data-nav-key={undefined} data-account-entry={entry.key}>{content}</ShellNavLink>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem variant={entry.variant} disabled={entry.disabled} onSelect={entry.onSelect} data-account-entry={entry.key} className={entryClassName}>
                  {content}
                </DropdownMenuItem>
              )}
            </Fragment>
          );
        })}
        {afterEntries}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
