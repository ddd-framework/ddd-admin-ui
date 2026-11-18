// The shell options of 0.3.3 on the server: the row display (badge, list and child-list classes, loading rows,
// controlled open groups, a provider for parts used alone), the mobile menu header slot, the top bar row and data
// attributes, the account and language menu options, scope, query and crumb-only crumbs, rights on segment crumbs,
// silent and redirect entries, entity nodes and states, custom fold widths; the background takes its new look props.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { resolveCrumbs, resolveDocumentTitle } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import {
  AccountMenu,
  AppShell,
  LanguageMenu,
  ShellBreadcrumbs,
  ShellNavDisplayProvider,
  ShellNavList,
  ShellTopBar,
} from '@mgamadeus/ddd-admin-ui/shell';
import { ShaderBackground } from '@mgamadeus/ddd-admin-ui/shell-background';

const Icon = (props) => h('svg', { ...props, 'data-icon': '' });
const NAVIGATION = [
  { key: 'home', label: 'Home', href: '/', exact: true, icon: Icon, crumbHidden: true },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: Icon,
    children: [
      {
        key: 'items',
        label: 'Items',
        href: '/items',
        icon: Icon,
        badge: 3,
        crumbs: [
          {
            segment: ':itemId',
            entity: 'item',
            queryCrumbs: [{ param: 'tab', label: { members: 'Members', history: 'History' } }],
          },
        ],
      },
      { key: 'item-history', label: 'Item history', href: '/items/history', crumbOnly: true },
      { key: 'moved', label: 'Moved page', href: '/moved', crumbLink: false, crumbs: [{ segment: 'inner', label: 'Inner' }] },
    ],
  },
  { key: 'settings', label: 'Settings', icon: Icon, children: [{ key: 'flags', label: 'Flags', href: '/settings/flags' }] },
];
const useEntityLabel = ({ id }) =>
  id === '42' ? { text: 'Blue widget', node: h('span', { 'data-entity-node': '' }, 'Blue widget ', h('span', { className: 'text-muted-foreground' }, '#42')) } : { text: null, link: false, state: 'forbidden' };

const renderAt = (pathname, props = {}) =>
  renderToString(
    h(
      AdminUiProvider,
      { usePathname: () => pathname },
      h(
        AppShell,
        {
          navigation: NAVIGATION,
          useEntityLabel,
          brand: h('span', null, 'Brand'),
          ...props,
        },
        h('p', { id: 'page' }, 'Page'),
      ),
    ),
  );

const sidebarOf = (html) => html.slice(html.indexOf('data-shell-sidebar'), html.indexOf('data-shell-content'));
const crumbsOf = (html) => html.slice(html.indexOf('data-shell-breadcrumbs'), html.indexOf('data-shell-sidebar'));

const styled = renderAt('/items/42?tab=members', {
  navBadgeClassName: 'host-badge',
  navChildListClassName: 'host-children',
  navListClassName: 'host-list',
  sidebarNavClassName: 'host-sidebar-nav',
  topBarClassName: 'host-topbar',
  topBarRowClassName: 'host-topbar-row',
  leadingCrumbs: [{ key: 'workspace', label: 'Workspace 7', href: '/workspaces/7', translate: false }],
  breadcrumbFoldWidths: { full: '30rem', currentOnly: '10rem' },
  canAccessCrumb: (crumb) => crumb.kind !== 'leaf',
});
const styledSidebar = sidebarOf(styled);
const styledCrumbs = crumbsOf(styled);
const plain = renderAt('/items/42');

const checks = [
  ['badge, list, child-list and sidebar nav classes', styledSidebar.includes('host-badge') && styledSidebar.includes('host-list') && styledSidebar.includes('host-children') && styledSidebar.includes('host-sidebar-nav')],
  ['without them the default classes stay', !plain.includes('host-') && plain.includes('class="space-y-1 ms-5 pt-1"')],
  ['the top bar classes reach the header and its row', /<header[^>]*class="[^"]*host-topbar[ "]/.test(styled) && styled.includes('host-topbar-row')],
  ['a crumb-only entry is not drawn in the sidebar', !styledSidebar.includes('Item history') && !plain.includes('/items/history')],
  ['scope crumb first, a link, with its data attribute', /data-crumb="text"[^>]*data-crumb-scope=""/.test(styledCrumbs) && styledCrumbs.indexOf('Workspace 7') < styledCrumbs.indexOf('Items')],
  ['a silent entry adds no crumb', !styledCrumbs.includes('>Home<')],
  ['canAccessCrumb turns the entry crumb into text', !/href="\/items"[^>]*>Items</.test(styledCrumbs) && styledCrumbs.includes('Items')],
  ['the query crumb is the current page', /data-crumb-query="tab"/.test(styledCrumbs) && /aria-current="page"[^>]*>Members</.test(styledCrumbs)],
  ['the entity crumb renders the host node', styledCrumbs.includes('data-entity-node')],
  ['custom fold widths: a scoped stylesheet with both widths, data attributes instead of the fold classes', /<style>[^<]*width &gt;= 30rem|<style>[^<]*width >= 30rem/.test(styledCrumbs) && styledCrumbs.includes('10rem') && styledCrumbs.includes('data-crumb-fold="parent"') && !styledCrumbs.includes('@min-[40rem]/crumbs')],
  ['default fold classes without foldWidths', crumbsOf(plain).includes('@max-[14rem]/crumbs:hidden') && !crumbsOf(plain).includes('<style>')],
];

// an entity the hook refuses: text, never a link, with its state
const refused = crumbsOf(renderAt('/items/7?tab=history'));
checks.push(['a refused entity crumb is text with data-crumb-state', /<span class="block truncate" data-crumb-state="forbidden">7<\/span>/.test(refused)]);

// a redirect entry: text, never a link; the crumb-only leaf names the page and the title
const moved = crumbsOf(renderAt('/moved/inner'));
checks.push(
  ['a redirect entry (crumbLink false) is text', !/href="\/moved"/.test(moved) && moved.includes('Moved page')],
  ['a crumb-only entry resolves its crumbs and title', crumbsOf(renderAt('/items/history')).includes('Item history') && resolveDocumentTitle('/items/history', NAVIGATION, { appName: 'Admin' }) === 'Item history · Admin'],
  ['scope crumbs never name the page', resolveDocumentTitle('/items/42', NAVIGATION, { leadingCrumbs: [{ key: 'w', label: 'W' }], depth: 9 }) === '42 · Items'],
  ['query crumbs from the pathname', resolveCrumbs('/items/42?tab=members', NAVIGATION).at(-1)?.label === 'Members'],
);

// loading rows in the sidebar, controlled open groups, the mobile menu header slot
const loading = sidebarOf(renderAt('/items', { navigationLoading: 3 }));
checks.push(['navigationLoading: skeleton rows and a screen-reader text, no entries', loading.includes('data-nav-loading') && loading.includes('Loading navigation') && (loading.match(/data-slot="skeleton"/g) ?? []).length === 6 && !loading.includes('data-nav-key')]);
const controlled = sidebarOf(renderAt('/items', { navOpenGroupKeys: ['settings'], onNavOpenGroupKeysChange: () => {} }));
checks.push([
  'controlled open groups: the named group is open, the active one is not (until the host follows onChange)',
  /data-nav-group="settings"><button[^>]*aria-expanded="true"/.test(controlled) && /data-nav-group="catalog"><button[^>]*aria-expanded="false"/.test(controlled),
]);

// parts used alone take the display through the provider
const standaloneList = renderToString(
  h(
    AdminUiProvider,
    null,
    h(ShellNavDisplayProvider, { rowClassName: 'host-row', listClassName: 'host-alone' }, h(ShellNavList, { items: NAVIGATION, active: null, pathname: '/' })),
  ),
);
checks.push(['ShellNavDisplayProvider reaches a ShellNavList used alone', standaloneList.includes('host-row') && standaloneList.includes('host-alone')]);

// the top bar alone: data attributes
const topBar = renderToString(h(ShellTopBar, { 'data-area': 'admin', rowClassName: 'host-row-only', brand: 'B' }));
checks.push(['ShellTopBar passes data-* and rowClassName', topBar.includes('data-area="admin"') && topBar.includes('host-row-only')]);

// account and language menu options
const menus = renderToString(
  h(
    AdminUiProvider,
    null,
    h(AccountMenu, { name: 'Alex Example', triggerVariant: 'avatar', entries: [] }),
    h(AccountMenu, { name: 'Sam Example', entries: [] }),
    h(LanguageMenu, { languages: [{ code: 'en', nativeName: 'English' }, { code: 'de', nativeName: 'Deutsch' }], current: 'de', onChange: () => {}, icon: h('svg', { 'data-host-icon': '' }), iconVisibility: 'always' }),
    h(LanguageMenu, { languages: [{ code: 'en', nativeName: 'English' }, { code: 'de', nativeName: 'Deutsch' }], current: 'en', onChange: () => {}, icon: false }),
  ),
);
const [avatarOnly, fullTrigger] = menus.split('Account menu of Sam Example');
checks.push(
  ['AccountMenu triggerVariant="avatar": no name, no chevron, still named', avatarOnly.includes('aria-label="Account menu of Alex Example"') && !avatarOnly.includes('>Alex Example</span>') && !avatarOnly.includes('sm:pe-3')],
  ['AccountMenu default trigger keeps name and padding', fullTrigger.includes('>Sam Example</span>') && menus.includes('sm:pe-3')],
  ['LanguageMenu icon: a host icon shown at every width, or none', /<span aria-hidden="true" class="shrink-0 text-muted-foreground"><svg data-host-icon="">/.test(menus) && (menus.match(/data-shell-language-menu/g) ?? []).length === 2],
);

// the background takes its new look props and still renders an empty layer on the server
const background = renderToString(h(ShaderBackground, { displacementScale: [0.5, 1.5], displacementZeroMean: true, displacementImage: '/field.png', paused: true }));
checks.push(['ShaderBackground with the new look props renders the empty layer', /<div aria-hidden="true" data-shell-background="" class="[^"]*"><\/div>/.test(background)]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) {
  if (process.env.SHOW_HTML) console.log(styled);
  process.exit(1);
}
