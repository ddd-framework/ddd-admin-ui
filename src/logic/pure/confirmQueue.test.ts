import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createConfirmQueue } from './confirmQueue.ts';

describe('createConfirmQueue', () => {
  it('queues calls and shows them one after the other', async () => {
    const queue = createConfirmQueue<string>();
    const first = queue.request('first');
    const second = queue.request('second');
    assert.equal(queue.current()?.options, 'first');
    assert.equal(queue.size(), 2);
    queue.settle(queue.current()!.id, true);
    assert.equal(queue.current()?.options, 'second');
    queue.settle(queue.current()!.id, false);
    assert.equal(queue.current(), null);
    assert.deepEqual(await Promise.all([first, second]), [true, false]);
  });

  it('settles an entry exactly once', async () => {
    const queue = createConfirmQueue<string>();
    const answer = queue.request('once');
    const { id } = queue.current()!;
    assert.equal(queue.settle(id, true), true);
    assert.equal(queue.settle(id, false), false);
    assert.equal(await answer, true);
  });

  it('keeps the shown entry object until it settles (stable snapshot)', () => {
    const queue = createConfirmQueue<string>();
    void queue.request('a');
    const shown = queue.current();
    void queue.request('b');
    assert.equal(queue.current(), shown);
  });

  it('deactivate settles every pending entry with false and refuses new requests until activate', async () => {
    const queue = createConfirmQueue<string>();
    const answers = [queue.request('a'), queue.request('b')];
    queue.deactivate();
    assert.deepEqual(await Promise.all(answers), [false, false]);
    assert.equal(queue.current(), null);
    assert.equal(await queue.request('late'), false);
    assert.equal(queue.size(), 0);
    queue.activate();
    const again = queue.request('again');
    assert.equal(queue.current()?.options, 'again');
    queue.settle(queue.current()!.id, true);
    assert.equal(await again, true);
  });

  it('notifies subscribers on every change', () => {
    const queue = createConfirmQueue<string>();
    let calls = 0;
    const unsubscribe = queue.subscribe(() => {
      calls += 1;
    });
    void queue.request('a');
    queue.settle(queue.current()!.id, true);
    unsubscribe();
    void queue.request('b');
    assert.equal(calls, 2);
  });
});
