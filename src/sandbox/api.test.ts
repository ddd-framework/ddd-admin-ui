import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSandboxesRequests, createStaticSandboxesApi } from './api.ts';
import {
  formatSandboxDuration,
  isSandboxTurnRunningRefusal,
  sandboxNameOf,
  sandboxParentPathOf,
  sandboxPathCrumbs,
  sandboxPreviewKindOf,
  sandboxResetPhraseOf,
  usagePercentOf,
} from './format.ts';

describe('sandbox requests (ddd-agents 0.1.32)', () => {
  const requests = buildSandboxesRequests('/api/admin/maintenance/sandboxes/');

  it('reads the list, one workspace and its parts, keys encoded', () => {
    assert.deepEqual(requests.list(), { url: '/api/admin/maintenance/sandboxes/list' });
    assert.deepEqual(requests.workspace({ workspaceKey: 'space 7/x' }), { url: '/api/admin/maintenance/sandboxes/space%207%2Fx' });
    assert.deepEqual(requests.files({ workspaceKey: 'w', path: '' }), { url: '/api/admin/maintenance/sandboxes/w/files' });
    assert.deepEqual(requests.files({ workspaceKey: 'w', path: 'a/b c' }), { url: '/api/admin/maintenance/sandboxes/w/files?path=a%2Fb%20c' });
    assert.deepEqual(requests.commands({ workspaceKey: 'w', limit: 50 }), { url: '/api/admin/maintenance/sandboxes/w/commands?limit=50' });
    assert.equal(requests.driveStatus({ workspaceKey: 'w' }).url, '/api/admin/maintenance/sandboxes/w/driveStatus');
    assert.equal(requests.events({ workspaceKey: 'w', limit: 10 }).url, '/api/admin/maintenance/sandboxes/w/events?limit=10');
  });

  it('asks the file bytes as a blob, inline or as attachment', async () => {
    const content = requests.content({ workspaceKey: 'w', path: 'out/report.pdf', disposition: 'inline' });
    assert.equal(content.url, '/api/admin/maintenance/sandboxes/w/files/content?path=out%2Freport.pdf&disposition=inline');
    assert.equal(typeof content.responseHandler, 'function');
  });

  it('posts an action with force, reason and confirmation only when given', () => {
    assert.deepEqual(requests.action({ workspaceKey: 'w', action: 'offload' }), {
      url: '/api/admin/maintenance/sandboxes/w/offload',
      method: 'POST',
      body: {},
    });
    assert.deepEqual(requests.action({ workspaceKey: 'w', action: 'reset', force: true, reason: 'stuck', confirmation: 'Team A' }), {
      url: '/api/admin/maintenance/sandboxes/w/reset',
      method: 'POST',
      body: { force: true, reason: 'stuck', confirmation: 'Team A' },
    });
    assert.deepEqual(requests.kill({ workspaceKey: 'w', jobId: 'job/1' }), {
      url: '/api/admin/maintenance/sandboxes/w/jobs/job%2F1/kill',
      method: 'POST',
      body: {},
    });
  });

  it('answers a static file as text and refuses actions', async () => {
    const api = createStaticSandboxesApi({ fileText: arg => (arg.path === 'a.txt' ? 'hello' : undefined) });
    const [requestContent] = api.useSandboxFileContentMutation();
    const blob = await requestContent({ workspaceKey: 'w', path: 'a.txt', disposition: 'inline' }).unwrap();
    assert.equal(await blob.text(), 'hello');
    assert.equal(blob.type, 'text/plain');
    await assert.rejects(requestContent({ workspaceKey: 'w', path: 'b.txt', disposition: 'inline' }).unwrap());
    const [runAction] = api.useSandboxActionMutation();
    await assert.rejects(runAction({ workspaceKey: 'w', action: 'start' }).unwrap());
  });
});

describe('sandbox formats', () => {
  it('names a workspace and its reset phrase by display name, else by key', () => {
    assert.equal(sandboxNameOf({ displayName: 'Team A', workspaceKey: 'space-3' }), 'Team A');
    assert.equal(sandboxNameOf({ displayName: '  ', workspaceKey: 'space-3' }), 'space-3');
    assert.equal(sandboxResetPhraseOf({ displayName: null, workspaceKey: 'space-3' }), 'space-3');
  });

  it('previews only raster images, PDF and plain text', () => {
    assert.equal(sandboxPreviewKindOf('image/png'), 'image');
    assert.equal(sandboxPreviewKindOf('application/pdf'), 'pdf');
    assert.equal(sandboxPreviewKindOf('text/plain; charset=utf-8'), 'text');
    assert.equal(sandboxPreviewKindOf('image/svg+xml'), 'none');
    assert.equal(sandboxPreviewKindOf('text/html'), 'none');
    assert.equal(sandboxPreviewKindOf('application/octet-stream'), 'none');
  });

  it('walks workspace paths and limits', () => {
    assert.equal(sandboxParentPathOf('a/b/c'), 'a/b');
    assert.equal(sandboxParentPathOf('a'), '');
    assert.deepEqual(sandboxPathCrumbs('a/b'), [{ name: 'a', path: 'a' }, { name: 'b', path: 'a/b' }]);
    assert.equal(usagePercentOf(50, 200), 25);
    assert.equal(usagePercentOf(500, 200), 100);
    assert.equal(usagePercentOf(50, null), null);
    assert.equal(formatSandboxDuration(null), '—');
    assert.equal(isSandboxTurnRunningRefusal({ status: 409 }), true);
    assert.equal(isSandboxTurnRunningRefusal({ status: 400 }), false);
  });
});
