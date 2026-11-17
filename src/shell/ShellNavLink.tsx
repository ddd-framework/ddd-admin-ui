'use client';

import type { ComponentType, ReactNode, Ref } from 'react';

import type { NavigationLeaf } from '../logic/pure/navigation.ts';
import { type PageLinkProps, useLinkComponent } from '../primitives/link.tsx';

export interface ShellNavLinkProps {
  item: Pick<NavigationLeaf<string>, 'key' | 'href' | 'external'>;
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
 * item or tooltip trigger) is passed on, so the host link must forward unknown props to its anchor.
 */
export const ShellNavLink = ({ item, children, ...props }: ShellNavLinkProps & Record<string, unknown>) => {
  const Link = useLinkComponent() as ForwardingLink;
  if (item.external) {
    return (
      <a href={item.href} data-nav-key={item.key} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={item.href} data-nav-key={item.key} {...props}>
      {children}
    </Link>
  );
};
