import type { ComponentType, ReactNode } from 'react';

/** The props a link component gets from the page blocks (back link, tabs, Add button). */
export interface PageLinkProps {
  href: string;
  className?: string;
  children?: ReactNode;
  'aria-current'?: 'page';
  'aria-label'?: string;
  onClick?: () => void;
}

/**
 * The app's router link (Next `Link`), passed in because these blocks import no router. Without it a plain `<a>` is
 * rendered (full page load) — always pass the app's link inside the app.
 */
export type PageLinkComponent = ComponentType<PageLinkProps>;

/** Plain anchor fallback. */
export const AnchorLink: PageLinkComponent = ({ href, children, ...rest }) => (
  <a href={href} {...rest}>
    {children}
  </a>
);
