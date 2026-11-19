import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dirtyFormFieldNames } from './formValues.ts';
import {
  canNavigate,
  decideNavigation,
  describeDirtyForm,
  getDirtyForms,
  getOpenOverlays,
  setDirtyFormEntry,
  setOpenOverlay,
  subscribeUiActivity,
  type UiActivityState,
  uiActivityState,
} from './navigationGuard.ts';

const freshState = (): UiActivityState => ({ forms: new Map(), overlays: new Map(), listeners: new Set() });

describe('decideNavigation', () => {
  it('allows with nothing dirty and nothing open', () => {
    assert.deepEqual(decideNavigation([], []), { allowed: true, dirtyForms: [], openOverlays: [] });
  });

  it('refuses for unsaved changes first, listing forms and overlays', () => {
    const dirtyForms = [{ formId: 'item', label: 'Edit item', dirtyFieldNames: ['name'] }];
    const openOverlays = [{ overlayId: 'a', kind: 'drawer' as const }];
    assert.deepEqual(decideNavigation(dirtyForms, openOverlays), {
      allowed: false,
      reason: 'unsaved-changes',
      dirtyForms,
      openOverlays,
    });
  });

  it('refuses for an open overlay without dirty forms', () => {
    const decision = decideNavigation([], [{ overlayId: 'a', kind: 'dialog' }]);
    assert.equal(decision.allowed, false);
    assert.equal(decision.reason, 'dialog-open');
  });

  it('lets ignored overlay kinds through, never a dirty form', () => {
    const drawer = [{ overlayId: 'a', kind: 'drawer' as const }];
    assert.equal(decideNavigation([], drawer, { ignoreOverlayKinds: ['drawer'] }).allowed, true);
    assert.equal(decideNavigation([], [...drawer, { overlayId: 'b', kind: 'dialog' }], { ignoreOverlayKinds: ['drawer'] }).reason, 'dialog-open');
    assert.equal(
      decideNavigation([{ formId: 'x', dirtyFieldNames: [] }], drawer, { ignoreOverlayKinds: ['drawer'] }).reason,
      'unsaved-changes'
    );
  });
});

describe('the activity store', () => {
  it('lists dirty forms with their field names read when asked', () => {
    const state = freshState();
    let names = ['name'];
    setDirtyFormEntry('r1', { formId: 'item', label: 'Edit item', getDirtyFieldNames: () => names }, state);
    setDirtyFormEntry('r2', { formId: 'other' }, state);
    names = ['name', 'status'];
    assert.deepEqual(getDirtyForms(state), [
      { formId: 'item', label: 'Edit item', dirtyFieldNames: ['name', 'status'] },
      { formId: 'other', dirtyFieldNames: [] },
    ]);
    setDirtyFormEntry('r1', null, state);
    assert.deepEqual(
      getDirtyForms(state).map(form => form.formId),
      ['other']
    );
  });

  it('decides from forms and overlays and notifies only on a change', () => {
    const state = freshState();
    let calls = 0;
    const unsubscribe = subscribeUiActivity(() => {
      calls += 1;
    }, state);
    setOpenOverlay('o1', 'dialog', state);
    assert.deepEqual(getOpenOverlays(state), [{ overlayId: 'o1', kind: 'dialog' }]);
    assert.equal(canNavigate(undefined, state).reason, 'dialog-open');
    setOpenOverlay('o1', null, state);
    setOpenOverlay('o1', null, state);
    assert.equal(calls, 2);
    assert.equal(canNavigate(undefined, state).allowed, true);
    unsubscribe();
    setOpenOverlay('o2', 'sheet', state);
    assert.equal(calls, 2);
  });

  it('a failing field reader lists the form without names', () => {
    assert.deepEqual(
      describeDirtyForm({
        formId: 'f',
        getDirtyFieldNames: () => {
          throw new Error('gone');
        },
      }),
      { formId: 'f', dirtyFieldNames: [] }
    );
  });

  it('one store per page, shared through globalThis', () => {
    assert.equal(uiActivityState(), uiActivityState());
    assert.equal(uiActivityState(), (globalThis as unknown as Record<symbol, unknown>)[Symbol.for('@mgamadeus/ddd-admin-ui/ui-activity')]);
  });
});

describe('dirtyFormFieldNames', () => {
  it('names the changed leaves as dotted paths', () => {
    const baseline = { name: 'A', address: { city: 'Berlin', zip: '10115' }, tags: ['x'], translations: { name: { 'de::FORMAL': 'Alt' } } };
    const values = { name: 'B', address: { city: 'Berlin', zip: '10117' }, tags: ['x', 'y'], translations: { name: { 'de::FORMAL': 'Neu' } } };
    assert.deepEqual(dirtyFormFieldNames(values, baseline), ['name', 'address.zip', 'tags', 'translations.name.de::FORMAL']);
  });

  it('reads blanks as a person does (null, empty string, a late field) and is empty when nothing changed', () => {
    assert.deepEqual(dirtyFormFieldNames({ name: '', note: null, late: undefined, count: '3' }, { name: null, note: '', count: 3 }), []);
  });

  it('follows an object against a missing baseline and leaves ignored paths out', () => {
    assert.deepEqual(dirtyFormFieldNames({ meta: { a: '1', b: '' } }, {}), ['meta.a']);
    assert.deepEqual(dirtyFormFieldNames({ name: 'B', draft: 'x' }, { name: 'A' }, ['draft']), ['name']);
  });
});
