'use client';

import { type ComponentType, createContext, type ReactNode, useContext } from 'react';

/** The props a link component gets from the blocks (back link, tabs, Add button). */
export interface PageLinkProps {
  href: string;
  className?: string;
  children?: ReactNode;
  'aria-current'?: 'page';
  'aria-label'?: string;
  onClick?: () => void;
}

/**
 * The app's router link (Next `Link`, or a wrapper that keeps sticky search parameters with `withStickyParams`),
 * passed in because the blocks import no router. Without one a plain `<a>` is rendered (full page load).
 */
export type PageLinkComponent = ComponentType<PageLinkProps>;

/** Plain anchor fallback. */
export const AnchorLink: PageLinkComponent = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);

/** The link component of every block below it (set once by `AdminUiProvider.linkComponent`). Default: `AnchorLink`. */
export const LinkComponentContext = createContext<PageLinkComponent>(AnchorLink);

export interface LinkComponentProviderProps {
  linkComponent: PageLinkComponent;
  children: ReactNode;
}

/** Hands one link component to every block below it; a block's own `linkComponent` prop still wins. */
export const LinkComponentProvider = ({ linkComponent, children }: LinkComponentProviderProps) => (
  <LinkComponentContext.Provider value={linkComponent}>{children}</LinkComponentContext.Provider>
);

/** The link component a block renders: its own prop, else the nearest provider's, else `AnchorLink`. */
export const useLinkComponent = (own?: PageLinkComponent): PageLinkComponent => {
  const fromContext = useContext(LinkComponentContext);
  return own ?? fromContext;
};
