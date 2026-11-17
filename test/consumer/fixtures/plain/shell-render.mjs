// The shell on the server: one navigation feeds the sidebar, the breadcrumbs and the document title; the rights
// predicate hides an entry; the pathname comes from the provider's hook, links from its link component (sticky
// parameters kept); the stored collapse state is never read on the server; ./shell never reaches ./shell-background.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { resolveDocumentTitle, withStickyParams } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { AccountMenu, AppShell, LanguageMenu, ShellBreadcrumbs } from '@mgamadeus/ddd-admin-ui/shell';
import { ShaderBackground } from '@mgamadeus/ddd-admin-ui/shell-background';

const Icon = (props) => h('svg', { ...props, 'data-icon': '' });
const NAVIGATION = [
  { key: 'home', label: 'Home', href: '/', exact: true, icon: Icon },
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
        crumbs: [{ segment: ':itemId', entity: 'item', children: [{ segment: 'details', label: 'Details' }] }],
      },
      { key: 'reports', label: 'Reports', href: '/reports', lockedReason: 'Not in your plan' },
    ],
  },
  { key: 'secret', label: 'Secret area', href: '/secret', icon: Icon },
  { key: 'old', label: 'Old screen', href: 'https://old.example/screen', external: true },
];
const canAccess = (item) => item.key !== 'secret';
const useEntityLabel = ({ id }) => ({ text: id === '42' ? 'Blue widget' : null });
const HostLink = ({ href, children, ...rest }) => h('a', { ...rest, 'data-host-link': '', href: withStickyParams(href, ['workspace'], '?workspace=7') }, children);
const atItem = () => '/items/42/details';

const render = (usePathname, extra = {}) =>
  renderToString(
    h(
      AdminUiProvider,
      { linkComponent: HostLink, ...(usePathname ? { usePathname } : {}) },
      h(
        AppShell,
        {
          navigation: NAVIGATION,
          canAccess,
          useEntityLabel,
          brand: h('span', null, 'Brand'),
          topBarEnd: h(AccountMenu, { name: 'Alex Example', entries: [{ key: 'out', label: 'Sign out', onSelect: () => {} }] }),
          background: h(ShaderBackground),
          documentTitle: { appName: 'Admin' },
          ...extra,
        },
        h('p', { id: 'page' }, 'Page content'),
      ),
    ),
  );

const html = render(atItem);
const sidebar = html.slice(html.indexOf('data-shell-sidebar'), html.indexOf('data-shell-content'));
const crumbs = html.slice(html.indexOf('data-shell-breadcrumbs'), html.indexOf('data-shell-sidebar'));
const noPath = render(null);

const checks = [
  ['the frame: skip link, header, sidebar <nav>, content <main>', html.includes('Skip to content') && /<header[^>]*data-shell-topbar/.test(html) && /<nav aria-label="Main"/.test(sidebar) && /<main id="[^"]+-main"/.test(html) && html.includes('id="page"')],
  ['the server renders the full column (the stored collapse state is read after hydration)', !html.includes('data-shell-collapsed') && !sidebar.includes('data-collapsed')],
  ['the active entry carries aria-current="page" and links through the host link with sticky parameters', /<a aria-current="page" class="[^"]*" data-host-link="" href="\/items\?workspace=7" data-nav-key="items"|<a[^>]*data-nav-key="items"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/items\?workspace=7"/.test(sidebar)],
  ['only one entry is current', (sidebar.match(/aria-current="page"/g) ?? []).length === 1],
  ['the group of the active entry is open (aria-expanded="true")', /aria-expanded="true"[^>]*>(?:<svg[^>]*>(?:<\/svg>)?)?<span[^>]*>Catalog</.test(sidebar) || /data-nav-group="catalog"><button[^>]*aria-expanded="true"/.test(sidebar)],
  ['the rights predicate hides an entry from the sidebar', !sidebar.includes('Secret area') && !sidebar.includes('/secret')],
  ['badge, lock reason and external mark', sidebar.includes('>3</span>') && sidebar.includes('Not in your plan') && sidebar.includes('Opens outside this app') && sidebar.includes('href="https://old.example/screen"')],
  ['breadcrumbs from the same navigation: group text, entry link, entity name, current page', crumbs.includes('Catalog') && /href="\/items\?workspace=7"[^>]*>Items</.test(crumbs) && crumbs.includes('Blue widget') && /aria-current="page"[^>]*>Details</.test(crumbs)],
  ['the breadcrumb ellipsis is a menu button naming the full path', /aria-label="Show full path"[^>]*aria-haspopup="menu"|aria-haspopup="menu"[^>]*aria-label="Show full path"/.test(crumbs)],
  ['the mobile menu button is closed and the menu not mounted', /aria-label="Open navigation" aria-haspopup="dialog" aria-expanded="false"/.test(html) && !html.includes('data-shell-mobile-menu')],
  ['the account menu button is named by the account', html.includes('aria-label="Account menu of Alex Example"')],
  ['the background renders an empty, hidden layer on the server', /<div aria-hidden="true" data-shell-background="" class="[^"]*"><\/div>/.test(html)],
  ['without a pathname hook the server marks nothing current and resolves no crumbs', !noPath.includes('aria-current="page"') && !noPath.includes('data-shell-breadcrumbs')],
  ['document title from the same navigation (server helper)', resolveDocumentTitle('/items/42/details', NAVIGATION, { appName: 'Admin' }) === 'Details · 42 · Admin'],
];

// a standalone breadcrumb trail and the language menu outside the shell
const standalone = renderToString(
  h(
    AdminUiProvider,
    { usePathname: () => '/reports' },
    h(ShellBreadcrumbs, { navigation: NAVIGATION, canAccess: (item) => item.key !== 'reports' }),
    h(LanguageMenu, { languages: [{ code: 'en', nativeName: 'English' }, { code: 'de', nativeName: 'Deutsch' }], current: 'de', onChange: () => {} }),
    h(LanguageMenu, { languages: [{ code: 'en', nativeName: 'English' }], current: 'en', onChange: () => {} }),
  ),
);
checks.push(
  ['standalone breadcrumbs read the provider pathname', standalone.includes('data-shell-breadcrumbs') && /aria-current="page"[^>]*>Reports</.test(standalone)],
  ['the language menu names the current language; a single language renders nothing', standalone.includes('aria-label="Language: Deutsch"') && (standalone.match(/data-shell-language-menu/g) ?? []).length === 1],
);

// ./shell never reaches ./shell-background (the background stays opt-in)
const shellDir = join(dirname(fileURLToPath(import.meta.resolve('@mgamadeus/ddd-admin-ui/shell'))));
const reachesBackground = readdirSync(shellDir).filter((name) => name.endsWith('.js')).some((name) => readFileSync(join(shellDir, name), 'utf8').includes('shell-background'));
checks.push(['./shell does not import ./shell-background', !reachesBackground]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed || process.env.SHOW_HTML) {
  console.log(html);
  process.exit(1);
}
