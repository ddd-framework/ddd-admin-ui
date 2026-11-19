'use client';

import { type ComponentType, type ReactNode, type Ref, useContext } from 'react';

import type { NavigationLeaf } from '../logic/pure/navigation.ts';
import { type PageLinkProps, useLinkComponent } from '../primitives/link.tsx';
import { ShellNavDisplayContext } from './shellContext.ts';

export interface ShellNavLinkProps {
  item: Pick<NavigationLeaf<string>, 'key' | 'href' | 'external' | 'linkProps'>;
  className?: string;
  children?: ReactNode;
  'aria-current'?: 'page';
  'aria-label'?: string;
  onClick?: () => void;
  ref?: Ref<HTMLAnchorElement>;
}

/** The host link with the props menus and tooltips put on their trigger (role, tabIndex, handlers, data-*). */
type ForwardingLink = ComponentType<PageLinkProps & Record<string, unknown>>;

/**
 * The link of one navigation entry: the host's link component (`AdminUiProvider.linkComponent`, sticky parameters
 * included) for an in-app entry, a plain `<a>` (full page load) for an `external` one. Every other prop (from a menu
 * item or tooltip trigger) is passed on, so the host link must forward unknown props to its anchor. An in-app link also
 * gets the shell's `linkProps` and the item's own (`prefetch`), under the props passed here.
 */
export const ShellNavLink = ({ item, children, ...props }: ShellNavLinkProps & Record<string, unknown>) => {
  const Link = useLinkComponent() as ForwardingLink;
  const { linkProps } = useContext(ShellNavDisplayContext);
  if (item.external) {
    return (
      <a href={item.href} data-nav-key={item.key} {...props}>
        {children}
      </a>
    );
  }
  const shared = typeof linkProps === 'function' ? linkProps({ key: item.key, href: item.href }) : linkProps;
  return (
    <Link {...shared} {...item.linkProps} href={item.href} data-nav-key={item.key} {...props}>
      {children}
    </Link>
  );
};
