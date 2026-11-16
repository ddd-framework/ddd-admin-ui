// Links rendered by blocks go through the host's link component, set once on AdminUiProvider (a block's own
// linkComponent prop still wins); a host link that applies withStickyParams keeps the sticky search parameters.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { withStickyParams } from '@mgamadeus/ddd-admin-ui/logic';
import { AddEntityButton, EntityDetailShell, EntityTabs } from '@mgamadeus/ddd-admin-ui/page';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@mgamadeus/ddd-admin-ui/primitives';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';

const CURRENT_SEARCH = '?workspace=7&debug=1&q=draft';
const STICKY = ['workspace', 'debug'];

// the host's link: its router link (here an anchor marked as such) with the sticky parameters of the current URL
const HostLink = ({ href, children, ...rest }) =>
  h('a', { ...rest, 'data-host-link': '', href: withStickyParams(href, STICKY, CURRENT_SEARCH) }, children);
const OwnLink = ({ href, children, ...rest }) => h('a', { ...rest, 'data-own-link': '', href }, children);

const TABS = [
  { id: 'overview', label: 'Overview', href: '/projects/42' },
  { id: 'members', label: 'Members', href: '/projects/42/members?tab=people' },
];

const html = renderToStaticMarkup(
  h(
    AdminUiProvider,
    { linkComponent: HostLink },
    h(EntityDetailShell, {
      title: 'Sample',
      fallbackTitle: 'Project #42',
      back: { href: '/projects', label: 'Back to projects' },
      tabs: TABS,
      currentPath: '/projects/42',
      tabsLabel: 'Project sections',
      metadata: { id: 42 },
      children: h('p', null, 'content'),
    }),
    h(AddEntityButton, { entity: 'Project', href: '/projects/create' }),
    h(Breadcrumb, null, h(BreadcrumbList, null, h(BreadcrumbItem, null, h(BreadcrumbLink, { href: '/home' }, 'Home')))),
    h(EntityTabs, { 'aria-label': 'Own link', tabs: [{ id: 'x', label: 'X', href: '/x' }], linkComponent: OwnLink }),
  ),
);
const without = renderToStaticMarkup(
  h('div', null, h(EntityTabs, { 'aria-label': 'Plain', tabs: [{ id: 'x', label: 'X', href: '/x' }] }), h(BreadcrumbLink, { href: '/home' }, 'Home')),
);

const hrefs = [...html.matchAll(/<a ([^>]*)>/g)].map((match) => match[1]);
const hostHrefs = hrefs.filter((attributes) => attributes.includes('data-host-link')).map((attributes) => /href="([^"]*)"/.exec(attributes)[1]);
const checks = [
  ['back link through the host link keeps the sticky parameters', hostHrefs.includes('/projects?workspace=7&amp;debug=1')],
  ['tab links keep them, own parameters first', hostHrefs.includes('/projects/42?workspace=7&amp;debug=1') && hostHrefs.includes('/projects/42/members?tab=people&amp;workspace=7&amp;debug=1')],
  ['the Add button link keeps them', hostHrefs.includes('/projects/create?workspace=7&amp;debug=1')],
  ['a breadcrumb link keeps them (and its data-slot)', hrefs.some((attributes) => attributes.includes('data-slot="breadcrumb-link"') && attributes.includes('href="/home?workspace=7&amp;debug=1"'))],
  ['non-sticky parameters are not carried', !hostHrefs.some((href) => href.includes('q=draft'))],
  ["a block's own linkComponent wins over the provider's", hrefs.some((attributes) => attributes.includes('data-own-link') && attributes.includes('href="/x"'))],
  ['without a provider a plain anchor renders as before', /<a [^>]*href="\/x"/.test(without) && without.includes('<a data-slot="breadcrumb-link" class="transition-colors hover:text-foreground" href="/home">') && !without.includes('data-host-link')],
];
let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) {
  console.error(hostHrefs);
  process.exit(1);
}
