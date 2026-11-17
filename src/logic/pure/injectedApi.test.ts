import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { injectedHookName, staticMutationHook, staticQueryHook, toQueryString, trimApiPrefix } from './injectedApi.ts';

describe('injected api helpers', () => {
  it('writes the defined parameters in order, encoded', () => {
    assert.equal(toQueryString({ filters: "state eq 'A B'", top: 50, skip: 0, expand: undefined, select: null, orderBy: '' }), "?filters=state%20eq%20'A%20B'&top=50&skip=0");
    assert.equal(toQueryString({}), '');
    assert.equal(trimApiPrefix('/api/admin//'), '/api/admin');
  });

  it("names hooks as RTK Query's React module does", () => {
    assert.equal(injectedHookName('adminUiWorkersOverview', 'query'), 'useAdminUiWorkersOverviewQuery');
    assert.equal(injectedHookName('adminUiWorkersRestart', 'mutation'), 'useAdminUiWorkersRestartMutation');
  });

  it('answers fixed data: a missing answer is loading, a mutation resolves or rejects', async () => {
    const useItems = staticQueryHook((arg: { id: number }) => (arg.id === 1 ? { name: 'one' } : undefined));
    assert.deepEqual(useItems({ id: 1 }).data, { name: 'one' });
    assert.equal(useItems({ id: 2 }).isLoading, true);
    const useSave = staticMutationHook((arg: { fail: boolean }) => {
      if (arg.fail) throw new Error('refused');
      return { saved: true };
    });
    const [save, state] = useSave();
    assert.equal(state.isLoading, false);
    assert.deepEqual(await save({ fail: false }).unwrap(), { saved: true });
    await assert.rejects(save({ fail: true }).unwrap(), /refused/);
  });
});
