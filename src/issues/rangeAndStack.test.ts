import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  issueEnvironmentLabel,
  issueFileLineOf,
  issueFrameViewsOf,
  issueStackText,
  issueTopFrame,
  resolveIssuesCustomRange,
  resolveIssuesTrendRange,
  resolveIssuesWindow,
  toIssuesWindowValue,
} from './format.ts';

describe('issues range, stack and labels (0.3.3)', () => {
  it('reads a custom range, refusing an inverted or too long one', () => {
    assert.deepEqual(resolveIssuesCustomRange('2026-01-01T00:00:00Z', '2026-01-02T12:30:00.000Z'), {
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-02T12:30:00Z',
    });
    assert.equal(resolveIssuesCustomRange('2026-01-02T00:00:00Z', '2026-01-01T00:00:00Z'), null);
    assert.equal(resolveIssuesCustomRange('2026-01-01T00:00:00Z', '2026-03-01T00:00:00Z'), null);
    assert.equal(resolveIssuesCustomRange('', '2026-01-01T00:00:00Z'), null);
  });

  it('resolves the trend window of a preset or a custom range (the default preset when unusable)', () => {
    const anchor = Date.UTC(2026, 0, 31, 10, 0, 30);
    assert.equal(toIssuesWindowValue('custom'), 'custom');
    assert.equal(toIssuesWindowValue('7d'), '7d');
    assert.equal(toIssuesWindowValue('bogus'), '24h');
    assert.deepEqual(resolveIssuesTrendRange('7d', anchor), resolveIssuesWindow('7d', anchor));
    assert.deepEqual(resolveIssuesTrendRange('custom', anchor, { from: '2026-01-10T00:00:00Z', to: '2026-01-11T00:00:00Z' }), {
      from: '2026-01-10T00:00:00Z',
      to: '2026-01-11T00:00:00Z',
    });
    assert.deepEqual(resolveIssuesTrendRange('custom', anchor, { from: 'x' }), resolveIssuesWindow('24h', anchor));
  });

  it('copies the stack and the file and line of the innermost application frame', () => {
    const event = {
      backendFrames: {
        elements: [
          { function: 'vendorCall', file: 'vendor/lib.php', line: 3, inApp: false },
          { function: 'App\\Service::run', file: 'src/Service.php', line: 42, column: 7, inApp: true },
        ],
      },
    };
    const frames = issueFrameViewsOf(event);
    assert.equal(issueTopFrame(frames)?.location, 'src/Service.php:42:7');
    assert.equal(issueFileLineOf('src/Service.php:42:7'), 'src/Service.php:42');
    assert.equal(issueFileLineOf('src/Service.php:42'), 'src/Service.php:42');
    assert.equal(issueStackText(event), 'vendorCall (vendor/lib.php:3)\nApp\\Service::run (src/Service.php:42:7)');
    assert.equal(issueStackText({ stackTrace: '#0 raw', backendFrames: event.backendFrames }), '#0 raw');
    assert.equal(issueStackText({}), '');
    assert.equal(issueTopFrame([]), null);
  });

  it('labels an environment by the host map, else by its code', () => {
    assert.equal(issueEnvironmentLabel('prod', { prod: 'Production' }), 'Production');
    assert.equal(issueEnvironmentLabel('stage', { prod: 'Production' }), 'stage');
    assert.equal(issueEnvironmentLabel('stage'), 'stage');
  });
});
