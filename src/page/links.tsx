// The link contract moved to ./primitives (one context for every block, set by `AdminUiProvider.linkComponent`); the
// page entry keeps exporting the names it always had.
export { AnchorLink } from '../primitives/link.tsx';
export type { PageLinkComponent, PageLinkProps } from '../primitives/link.tsx';
