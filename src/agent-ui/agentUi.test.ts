import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NavigationItem } from '../logic/pure/navigation.ts';
import { decideNavigation } from '../logic/pure/navigationGuard.ts';
import { AGENT_PANEL_ATTRIBUTE, findOccludingRectOfAgentPanel } from './agentPanel.ts';
import {
  buildAgentUIState,
  describeNavigationBlocker,
  describeUnsavedChanges,
  fieldReferenceOf,
} from './agentUIState.ts';
import { agentActionProps, agentPressProps } from '../logic/pure/agentActions.ts';
import {
  buildScreenFiltersHref,
  buildScreenTargetHref,
  buildScreenTargets,
  describeScreenFilters,
  matchOpenScreenTarget,
  matchScreenTarget,
} from './screenTargets.ts';

const NAVIGATION: NavigationItem<string>[] = [
  { key: 'home', label: 'Home', href: '/' },
  {
    key: 'orders',
    label: 'Orders',
    href: '/orders',
    crumbs: [
      { segment: 'create', label: 'New order' },
      {
        segment: ':orderId',
        entity: 'order',
        children: [
          { segment: 'details', label: 'Details' },
          { segment: 'items', label: 'Items', children: [{ segment: ':itemId', label: 'Item' }] },
        ],
      },
    ],
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    children: [
      { key: 'maintenance.workers', label: 'Workers', href: '/maintenance/workers' },
      { key: 'maintenance.secret', label: 'Secret', href: '/maintenance/secret' },
      { key: 'maintenance.docs', label: 'Docs', href: 'https://example.org', external: true },
    ],
  },
];

const translate = (label: string) => `T:${label}`;

describe('buildScreenTargets', () => {
  const targets = buildScreenTargets(NAVIGATION, {
    translate,
    canAccess: item => item.key !== 'maintenance.secret',
    filtersByTargetKey: { orders: ['status', 'customerId'] },
    viewsByTargetKey: { orders: ['table', 'grid'] },
  });
  const byKey = new Map(targets.map(target => [target.key, target]));

  it('lists in-app entries the viewer may open, with groups, filters and views', () => {
    assert.deepEqual(
      targets.map(target => target.key),
      ['home', 'orders', 'order', 'order.item', 'maintenance.workers']
    );
    assert.deepEqual(byKey.get('orders'), {
      key: 'orders',
      label: 'T:Orders',
      group: null,
      routePattern: '/orders',
      parameters: [],
      tabs: ['create'],
      filters: [{ key: 'status' }, { key: 'customerId' }],
      views: ['table', 'grid'],
    });
    assert.equal(byKey.get('maintenance.workers')?.group, 'T:Maintenance');
  });

  it('turns parameter crumbs into record targets with their tabs', () => {
    assert.deepEqual(byKey.get('order'), {
      key: 'order',
      label: 'T:Orders (order)',
      group: 'T:Orders',
      routePattern: '/orders/:orderId',
      parameters: ['orderId'],
      tabs: ['details', 'items'],
      filters: [],
      views: [],
    });
    assert.equal(byKey.get('order.item')?.routePattern, '/orders/:orderId/items/:itemId');
    assert.deepEqual(byKey.get('order.item')?.parameters, ['orderId', 'itemId']);
    assert.equal(byKey.get('order.item')?.label, 'T:Item');
  });

  it('matches a pathname to its target, parameters and tab', () => {
    assert.deepEqual(matchScreenTarget(targets, '/orders/42/items'), {
      target: byKey.get('order'),
      routeParameters: [{ name: 'orderId', value: '42' }],
      tab: 'items',
    });
    assert.equal(matchScreenTarget(targets, '/orders/create')?.target.key, 'orders');
    assert.equal(matchScreenTarget(targets, '/orders/42/items/7')?.target.key, 'order.item');
    assert.equal(matchScreenTarget(targets, '/orders/42/unknown'), null);
    assert.equal(matchScreenTarget(targets, '/')?.target.key, 'home');
  });

  it('builds the href of a target: ids, a known tab, declared filters only', () => {
    const order = byKey.get('order');
    const orders = byKey.get('orders');
    assert.ok(order && orders);
    assert.equal(buildScreenTargetHref(order, { recordIds: [42], tab: 'items', filters: {} }), '/orders/42/items');
    assert.equal(buildScreenTargetHref(order, { recordIds: [], tab: null, filters: {} }), null);
    assert.equal(buildScreenTargetHref(order, { recordIds: [42], tab: 'nope', filters: {} }), '/orders/42');
    assert.equal(
      buildScreenTargetHref(orders, { recordIds: [], tab: null, filters: { status: 'OPEN', other: 'x' } }),
      '/orders?status=OPEN'
    );
  });
});

describe('navigation blockers and unsaved changes', () => {
  const dirtyForms = [{ formId: 'order', label: 'Edit order', dirtyFieldNames: ['endDate', 'translations.name.de::FORMAL'] }];

  it('refuses for unsaved changes first, then an open overlay', () => {
    assert.deepEqual(describeNavigationBlocker(decideNavigation(dirtyForms, [])), {
      outcome: 'UNSAVED_CHANGES',
      reason: 'Unsaved changes: Edit order (endDate, translations.name.de::FORMAL).',
    });
    assert.deepEqual(describeNavigationBlocker(decideNavigation([], [{ overlayId: 'a', kind: 'drawer' }])), {
      outcome: 'DIALOG_OPEN',
      reason: 'A drawer is open.',
    });
    assert.equal(describeNavigationBlocker(decideNavigation([], [{ overlayId: 'a', kind: 'sheet' }], { ignoreOverlayKinds: ['sheet'] })), null);
  });

  it('describes unsaved changes for the screen reader', () => {
    assert.equal(describeUnsavedChanges([]), 'no');
    assert.equal(describeUnsavedChanges(dirtyForms), 'yes (Edit order (endDate, translations.name.de::FORMAL))');
  });

  it('writes field references like the screen reader', () => {
    assert.equal(fieldReferenceOf('order.endDate'), 'f.order.endDate');
    assert.equal(fieldReferenceOf('translations.name.de::FORMAL'), 'f.translations.name.de-FORMAL');
  });
});

describe('buildAgentUIState', () => {
  const targets = buildScreenTargets(NAVIGATION, { translate });

  it('reports route, parameters, tab, view, fields and the open dialog as tokens', () => {
    const state = buildAgentUIState({
      pathname: '/orders/42/details',
      search: '?view=grid&q=hello',
      targets,
      dirtyForms: [{ formId: 'order', dirtyFieldNames: ['endDate', 'endDate', 'name'] }],
      openOverlays: [{ overlayId: ':r1:', kind: 'drawer' }],
      invalidFieldNames: ['endDate'],
      visible: true,
      capturedAt: '2026-11-24T10:00:00.000Z',
    });
    assert.deepEqual(state, {
      routePath: '/orders/42/details',
      routeParameters: [{ name: 'orderId', value: '42' }],
      tab: 'details',
      view: 'grid',
      unsavedFieldReferences: ['f.endDate', 'f.name'],
      invalidFieldReferences: ['f.endDate'],
      openDialogKey: 'drawer',
      visible: true,
      capturedAt: '2026-11-24T10:00:00.000Z',
    });
  });

  it('falls back to the tab parameter and drops what the server would not keep', () => {
    const state = buildAgentUIState({
      pathname: '/unknown page',
      search: 'tab=members',
      targets,
      dirtyForms: [],
      openOverlays: [],
    });
    assert.equal(state.routePath, null);
    assert.equal(state.routeParameters, null);
    assert.equal(state.tab, 'members');
    assert.equal(state.view, null);
    assert.equal(state.openDialogKey, null);
    assert.deepEqual(state.unsavedFieldReferences, []);
  });
});

describe('findOccludingRectOfAgentPanel', () => {
  const viewport = { width: 390, height: 800 };
  const panelAt = (top: number, left: number, bottom: number, right: number) => ({
    getBoundingClientRect: () => ({ top, left, bottom, right }),
  });

  it('reports the box of an open agent window', () => {
    assert.deepEqual(findOccludingRectOfAgentPanel(panelAt(480, 0, 800, 390), viewport), {
      top: 480,
      left: 0,
      bottom: 800,
      right: 390,
    });
  });

  it('reports nothing without a window, for a closed one, or one outside the viewport', () => {
    assert.equal(findOccludingRectOfAgentPanel(null, viewport), null);
    assert.equal(findOccludingRectOfAgentPanel(panelAt(0, 0, 0, 0), viewport), null);
    assert.equal(findOccludingRectOfAgentPanel(panelAt(900, 0, 1200, 390), viewport), null);
    assert.equal(findOccludingRectOfAgentPanel(panelAt(0, 400, 800, 700), viewport), null);
  });

  it('names the attribute the default lookup reads', () => {
    assert.equal(AGENT_PANEL_ATTRIBUTE, 'data-agent-panel');
  });
});

describe('the filters of the open screen (actOnScreen setFilters)', () => {
  const targets = buildScreenTargets(NAVIGATION, { translate, filtersByTargetKey: { orders: ['status', 'customerId'] } });
  const orders = targets.find(target => target.key === 'orders');
  const order = targets.find(target => target.key === 'order');

  it('sets and removes only declared filters and keeps the rest of the URL', () => {
    assert.ok(orders);
    assert.equal(
      buildScreenFiltersHref(orders, '/orders', '?view=grid&status=OPEN&customerId=3', { status: 'DONE', customerId: '', secret: 'x' }),
      '/orders?view=grid&status=DONE'
    );
    assert.equal(buildScreenFiltersHref(orders, '/orders', '?status=OPEN', { status: '' }), '/orders');
    assert.equal(buildScreenFiltersHref(orders, '/orders', '', { status: 'x'.repeat(300) }).length, '/orders?status='.length + 100);
  });

  it('describes the declared filters with the values that are set', () => {
    assert.ok(orders && order);
    assert.equal(describeScreenFilters(orders, '?status=OPEN&view=grid'), 'status=OPEN · customerId');
    assert.equal(describeScreenFilters(order, '?status=OPEN'), null);
    assert.equal(describeScreenFilters(null, ''), null);
  });

  it('keeps a filter of a tab to that tab: in the href, and in the open screen the agent acts on', () => {
    const targets = buildScreenTargets(NAVIGATION, {
      translate: label => label,
      filtersByTargetKey: { order: [{ key: 'status', values: ['OPEN'], tabs: ['items'] }, { key: 'sort', tabs: ['items'] }, { key: 'sort', tabs: ['details'] }] },
    });
    const record = targets.find(target => target.key === 'order');
    assert.ok(record);
    assert.equal(buildScreenTargetHref(record, { recordIds: [7], tab: 'items', filters: { status: 'OPEN', sort: 'id:desc' } }), '/orders/7/items?status=OPEN&sort=id%3Adesc');
    assert.equal(buildScreenTargetHref(record, { recordIds: [7], tab: 'details', filters: { status: 'OPEN', sort: 'id:desc' } }), '/orders/7/details?sort=id%3Adesc');
    assert.equal(buildScreenTargetHref(record, { recordIds: [7], tab: null, filters: { status: 'OPEN' } }), '/orders/7');
    assert.deepEqual(matchOpenScreenTarget(targets, '/orders/7/items')?.filters.map(filter => filter.key), ['status', 'sort']);
    assert.deepEqual(matchOpenScreenTarget(targets, '/orders/7/details')?.filters.map(filter => filter.key), ['sort']);
    assert.deepEqual(matchOpenScreenTarget(targets, '/orders/7')?.filters, []);
    assert.equal(describeScreenFilters(matchOpenScreenTarget(targets, '/orders/7/items'), '?status=OPEN'), 'status=OPEN (one of OPEN) · sort');
  });

  it('takes a filter with its values and names them in the catalogue entry and the screen read', () => {
    const valued = buildScreenTargets(NAVIGATION, {
      translate: label => label,
      filtersByTargetKey: {
        orders: [
          'customerId',
          { key: 'status', values: ['OPEN', 'SOLVED'], multiple: true },
          { key: 'from', hint: 'date YYYY-MM-DD' },
          { key: 'sort', values: ['id:asc', 'id:desc'] },
        ],
      },
    }).find(target => target.key === 'orders');
    assert.ok(valued);
    assert.deepEqual(valued.filters, [
      { key: 'customerId' },
      { key: 'status', values: ['OPEN', 'SOLVED'], multiple: true },
      { key: 'from', hint: 'date YYYY-MM-DD' },
      { key: 'sort', values: ['id:asc', 'id:desc'] },
    ]);
    assert.equal(
      describeScreenFilters(valued, '?status=OPEN'),
      'customerId · status=OPEN (one or more of OPEN|SOLVED, comma-separated) · from (date YYYY-MM-DD) · sort (one of id, each with :asc or :desc)'
    );
  });
});

describe('what an element declares for the agent', () => {
  it('declares sort controls and tabs with their key, a row that opens without one', () => {
    assert.deepEqual(agentActionProps('sort', 'createdTime'), { 'data-agent-action': 'sort', 'data-agent-action-key': 'createdTime' });
    assert.deepEqual(agentActionProps('tab', 'items'), { 'data-agent-action': 'tab', 'data-agent-action-key': 'items' });
    assert.deepEqual(agentActionProps('open'), { 'data-agent-action': 'open' });
    assert.deepEqual(agentActionProps('sort', 'created time'), { 'data-agent-action': 'sort' });
  });

  it('declares a button as a write unless the host says it only changes the view', () => {
    assert.deepEqual(agentPressProps('archive'), {
      'data-agent-action': 'press',
      'data-agent-action-key': 'archive',
      'data-agent-action-effect': 'write',
    });
    assert.equal(agentPressProps('load-more', 'view')['data-agent-action-effect'], 'view');
    assert.deepEqual(agentPressProps('not a key'), {});
  });
});
