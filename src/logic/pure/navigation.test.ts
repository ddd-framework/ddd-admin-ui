import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  documentTitleParts,
  filterNavigation,
  findActiveNavigation,
  isNavigationGroupActive,
  isNavigationLeafActive,
  menuNavigation,
  menuNavigationOf,
  type NavigationItem,
  resolveCrumbs,
  resolveDocumentTitle,
} from './navigation.ts';

type Entity = 'item' | 'member';

const NAVIGATION: NavigationItem<Entity>[] = [
  { key: 'home', label: 'Home', href: '/', exact: true },
  {
    key: 'catalog',
    label: 'Catalog',
    children: [
      {
        key: 'items',
        label: 'Items',
        href: '/items',
        badge: 3,
        crumbs: [
          { segment: 'create', label: 'Create item' },
          { segment: 'import', link: false, children: [{ segment: ':batchId', label: (id, t) => t('Batch %id%', { replacements: { id } }) }] },
          {
            segment: ':itemId',
            entity: 'item',
            children: [
              { segment: 'details', label: 'Details' },
              { segment: 'members', label: 'Members', children: [{ segment: ':memberId', entity: 'member' }] },
            ],
          },
        ],
      },
      { key: 'item-types', label: 'Item types', href: '/items/types' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/settings',
    children: [
      { key: 'settings-overview', label: 'Overview', href: '/settings', exact: true },
      { key: 'users', label: 'Users', href: '/settings/users' },
      {
        key: 'advanced',
        label: 'Advanced',
        children: [{ key: 'flags', label: 'Flags', href: '/settings/advanced/flags' }],
      },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    href: '/reports',
    children: [{ key: 'reports-leaf', label: 'Reports', href: '/reports' }],
  },
  { key: 'old', label: 'Old screen', href: '/legacy', external: true },
];

const summary = (pathname: string, options = {}) =>
  resolveCrumbs(pathname, NAVIGATION, options).map(crumb =>
    crumb.kind === 'entity' ? `${crumb.kind}:${crumb.entity}=${crumb.id}@${crumb.href}${crumb.link ? '' : '!'}` : `${crumb.kind}:${crumb.label}@${crumb.href}${crumb.link ? '' : '!'}`
  );

describe('isNavigationLeafActive', () => {
  it('matches the own path and below it, never a sibling prefix', () => {
    assert.equal(isNavigationLeafActive({ href: '/items' }, '/items'), true);
    assert.equal(isNavigationLeafActive({ href: '/items' }, '/items/42'), true);
    assert.equal(isNavigationLeafActive({ href: '/items' }, '/items-archive'), false);
    assert.equal(isNavigationLeafActive({ href: '/items/' }, '/items/?q=1'), true);
  });
  it('honours exact, external and a missing pathname', () => {
    assert.equal(isNavigationLeafActive({ href: '/', exact: true }, '/'), true);
    assert.equal(isNavigationLeafActive({ href: '/', exact: true }, '/items'), false);
    assert.equal(isNavigationLeafActive({ href: '/legacy', external: true }, '/legacy'), false);
    assert.equal(isNavigationLeafActive({ href: '/items' }, null), false);
  });
});

describe('findActiveNavigation', () => {
  it('takes the longest matching leaf, with its groups', () => {
    const active = findActiveNavigation(NAVIGATION, '/items/types');
    assert.equal(active?.item.key, 'item-types');
    assert.deepEqual(active?.groups.map(group => group.key), ['catalog']);
    assert.equal(findActiveNavigation(NAVIGATION, '/items/42/details')?.item.key, 'items');
    assert.deepEqual(findActiveNavigation(NAVIGATION, '/settings/advanced/flags')?.groups.map(group => group.key), ['settings', 'advanced']);
  });
  it('falls back to a group with its own page, and to null outside the tree', () => {
    assert.equal(findActiveNavigation(NAVIGATION, '/settings/other')?.item.key, 'settings');
    assert.equal(findActiveNavigation(NAVIGATION, '/nowhere'), null);
    assert.equal(findActiveNavigation(NAVIGATION, null), null);
  });
  it('marks the groups holding the entry as active', () => {
    const active = findActiveNavigation(NAVIGATION, '/settings/advanced/flags');
    assert.equal(isNavigationGroupActive({ key: 'advanced' }, active), true);
    assert.equal(isNavigationGroupActive({ key: 'settings' }, active), true);
    assert.equal(isNavigationGroupActive({ key: 'catalog' }, active), false);
  });
});

describe('filterNavigation (rights predicate)', () => {
  it('drops refused items and groups left empty; keeps a group with its own page', () => {
    const filtered = filterNavigation(NAVIGATION, item => !['items', 'item-types', 'users', 'settings-overview', 'flags'].includes(item.key));
    assert.deepEqual(filtered.map(item => item.key), ['home', 'settings', 'reports', 'old']);
    const settings = filtered.find(item => item.key === 'settings');
    assert.ok(settings && 'children' in settings);
    assert.deepEqual(settings.children.map(item => item.key), []);
  });
  it('returns the tree unchanged without a predicate', () => {
    assert.equal(filterNavigation(NAVIGATION).length, NAVIGATION.length);
  });
});

describe('resolveCrumbs', () => {
  it('gives the group as text and the entry as a link', () => {
    assert.deepEqual(summary('/items'), ['group:Catalog@!', 'leaf:Items@/items']);
  });
  it('matches literals before parameters', () => {
    assert.deepEqual(summary('/items/create'), ['group:Catalog@!', 'leaf:Items@/items', 'text:Create item@/items/create']);
  });
  it('resolves parameters to entity crumbs with their params', () => {
    assert.deepEqual(summary('/items/42/members/7'), [
      'group:Catalog@!',
      'leaf:Items@/items',
      'entity:item=42@/items/42',
      'text:Members@/items/42/members',
      'entity:member=7@/items/42/members/7',
    ]);
    const last = resolveCrumbs('/items/42/members/7', NAVIGATION).at(-1);
    assert.ok(last?.kind === 'entity');
    assert.deepEqual(last.params, { itemId: '42', memberId: '7' });
  });
  it('decodes segments and builds labels from the segment', () => {
    assert.deepEqual(summary('/items/import/a%20b'), ['group:Catalog@!', 'leaf:Items@/items', 'text:Batch a b@/items/import/a%20b']);
  });
  it('a route without label adds no crumb; an unmatched segment ends the trail', () => {
    assert.deepEqual(summary('/items/42/unknown/deeper'), ['group:Catalog@!', 'leaf:Items@/items', 'entity:item=42@/items/42']);
  });
  it('translates fixed labels with the given t', () => {
    const t = (text: string) => `«${text}»`;
    assert.deepEqual(summary('/items/42/details', { t }), [
      'group:«Catalog»@!',
      'leaf:«Items»@/items',
      'entity:item=42@/items/42',
      'text:«Details»@/items/42/details',
    ]);
  });
  it('nested groups: an own page links, a group without one is text; a group equal to its entry folds', () => {
    assert.deepEqual(summary('/settings/advanced/flags'), [
      'group:Settings@/settings',
      'group:Advanced@!',
      'leaf:Flags@/settings/advanced/flags',
    ]);
    assert.deepEqual(summary('/reports'), ['leaf:Reports@/reports']);
  });
  it('the rights predicate turns a refused crumb into text, never drops it', () => {
    assert.deepEqual(summary('/settings/users', { canAccess: (item: { key: string }) => item.key !== 'settings' }), [
      'group:Settings@/settings!',
      'leaf:Users@/settings/users',
    ]);
  });
  it('gives nothing outside the tree', () => {
    assert.deepEqual(summary('/nowhere'), []);
  });
});

describe('document title', () => {
  it('names the page by the last crumbs and the app', () => {
    assert.equal(resolveDocumentTitle('/items/42/details', NAVIGATION, { appName: 'Admin' }), 'Details · 42 · Admin');
    assert.equal(resolveDocumentTitle('/items', NAVIGATION, { appName: 'Admin' }), 'Items · Admin');
    assert.equal(resolveDocumentTitle('/nowhere', NAVIGATION, { appName: 'Admin' }), 'Admin');
    assert.equal(resolveDocumentTitle('/nowhere', NAVIGATION), null);
  });
  it('takes entity names and the depth', () => {
    const crumbs = resolveCrumbs('/items/42/details', NAVIGATION);
    assert.deepEqual(documentTitleParts(crumbs, { depth: 3, entityText: crumb => `Item ${crumb.id}` }), ['Details', 'Item 42', 'Items']);
  });
});

const TABBED: NavigationItem<Entity>[] = [
  { key: 'home', label: 'Home', href: '/', exact: true, crumbHidden: true },
  {
    key: 'catalog',
    label: 'Catalog',
    crumbHidden: true,
    children: [
      {
        key: 'items',
        label: 'Items',
        href: '/items',
        crumbLink: false,
        queryCrumbs: [{ param: 'view', label: { grid: 'Grid', table: 'Table' } }],
        crumbs: [
          {
            segment: ':itemId',
            entity: 'item',
            queryCrumbs: [
              { param: 'tab', label: (value, t) => t('Tab %tab%', { replacements: { tab: value } }) },
              { param: 'panel', label: 'Panel', link: false },
            ],
          },
        ],
      },
      { key: 'item-history', label: 'Item history', href: '/items/history', crumbOnly: true },
    ],
  },
  { key: 'only-hidden', label: 'Only hidden', children: [{ key: 'ghost', label: 'Ghost', href: '/ghost', crumbOnly: true }] },
];

describe('resolveCrumbs: scope, query, rights and silent crumbs', () => {
  it('puts leading scope crumbs first and leaves them out of the document title', () => {
    const leadingCrumbs = [
      { key: 'workspace', label: 'Workspace 7', href: '/workspaces/7', translate: false },
      { key: 'area', label: 'Area' },
    ];
    const crumbs = resolveCrumbs('/items', NAVIGATION, { leadingCrumbs });
    assert.deepEqual(
      crumbs.slice(0, 2).map(crumb => [crumb.kind, crumb.kind === 'text' && crumb.scope, crumb.href, crumb.link]),
      [
        ['text', true, '/workspaces/7', true],
        ['text', true, '', false],
      ]
    );
    assert.equal(resolveDocumentTitle('/items', NAVIGATION, { leadingCrumbs, depth: 5, appName: 'Admin' }), 'Items · Admin');
  });
  it('hides silent items, keeps a redirect entry as text', () => {
    assert.deepEqual(
      resolveCrumbs('/items', TABBED).map(crumb => [crumb.key, crumb.link]),
      [['nav:items', false]]
    );
    assert.deepEqual(resolveCrumbs('/', TABBED), []);
  });
  it('adds query crumbs of the deepest matched node, with the earlier parameters kept', () => {
    const crumbs = resolveCrumbs('/items/42', TABBED, { search: '?tab=members&panel=x&view=grid' });
    assert.deepEqual(
      crumbs.map(crumb => (crumb.kind === 'text' ? [crumb.label, crumb.href, crumb.link, crumb.query] : [crumb.kind, crumb.href])),
      [
        ['leaf', '/items'],
        ['entity', '/items/42'],
        ['Tab members', '/items/42?tab=members', true, 'tab'],
        ['Panel', '/items/42?tab=members&panel=x', false, 'panel'],
      ]
    );
    // a value missing from the map adds no crumb; the pathname's own query string is read too
    assert.deepEqual(resolveCrumbs('/items?view=list', TABBED).map(crumb => crumb.key), ['nav:items']);
    assert.deepEqual(resolveCrumbs('/items?view=grid', TABBED).at(-1), {
      kind: 'text',
      key: 'query:/items?view=grid',
      label: 'Grid',
      href: '/items?view=grid',
      link: true,
      query: 'view',
    });
  });
  it('turns crumbs refused by canAccessCrumb into text', () => {
    const crumbs = resolveCrumbs('/items/42/members/7', NAVIGATION, {
      canAccessCrumb: crumb => crumb.kind !== 'entity' || crumb.id !== '42',
    });
    assert.deepEqual(crumbs.map(crumb => crumb.link), [false, true, false, true, true]);
  });
  it('resolves a crumb-only leaf for crumbs and title; the menus leave it out', () => {
    assert.deepEqual(resolveCrumbs('/items/history', TABBED).map(crumb => crumb.key), ['nav:item-history']);
    assert.equal(resolveDocumentTitle('/items/history', TABBED), 'Item history');
    const menu = menuNavigation(TABBED);
    assert.deepEqual(menu.map(item => item.key), ['home', 'catalog']);
    const catalog = menu[1];
    assert.ok(catalog && 'children' in catalog);
    assert.deepEqual(catalog.children.map(item => item.key), ['items']);
    assert.equal(menuNavigationOf(NAVIGATION), NAVIGATION);
  });
});
