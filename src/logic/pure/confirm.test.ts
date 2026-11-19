import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { confirmWithoutProvider, isTextConfirmDescription, routeConfirm } from './confirm.ts';

describe('confirmWithoutProvider', () => {
  it('answers false and warns once outside production', async () => {
    const warn = mock.method(console, 'warn', () => {});
    try {
      assert.equal(await confirmWithoutProvider({ title: 'Delete?' }), false);
      assert.equal(await confirmWithoutProvider({ title: 'Delete again?' }), false);
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0]?.arguments[0]), /no AdminUiProvider/);
    } finally {
      warn.mock.restore();
    }
  });
});

describe('routeConfirm (0.3.9)', () => {
  it('tells text descriptions from nodes', () => {
    assert.equal(isTextConfirmDescription(undefined), true);
    assert.equal(isTextConfirmDescription(null), true);
    assert.equal(isTextConfirmDescription('Delete it?'), true);
    assert.equal(isTextConfirmDescription(3), true);
    assert.equal(isTextConfirmDescription({ type: 'div', props: {} } as never), false);
    assert.equal(isTextConfirmDescription(['a', 'b']), false);
  });

  it('sends phrases first, then node descriptions, else the host', () => {
    const routes = { host: 'host', phrase: 'phrase', richDescription: 'rich' };
    const node = { type: 'div', props: {} } as never;
    assert.equal(routeConfirm({ title: 'x', requirePhrase: 'name', description: node }, routes), 'phrase');
    assert.equal(routeConfirm({ title: 'x', description: node }, routes), 'rich');
    assert.equal(routeConfirm({ title: 'x', description: 'text' }, routes), 'host');
    assert.equal(routeConfirm({ title: 'x', description: node }, { host: 'host' }), 'host');
    assert.equal(routeConfirm({ title: 'x', requirePhrase: 'name' }, { host: 'host', richDescription: 'rich' }), 'host');
  });
});
