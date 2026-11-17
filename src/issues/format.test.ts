import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  codeContextRows,
  issueFrameViewsOf,
  issueGroupKey,
  parseIssueGroupKey,
  parseIssuesTime,
  resolveIssuesWindow,
  segmentIssueFrames,
  toIssuesWindowPreset,
  trendAxisMax,
  trendBarsOf,
} from './format.ts';

describe('issues helpers', () => {
  it('keys a group by its own environment and hash, and reads the key back', () => {
    const key = issueGroupKey({ environment: 'prod.eu', groupHash: 'abc123' });
    assert.equal(key, 'prod.eu:abc123');
    assert.deepEqual(parseIssueGroupKey(key), { environment: 'prod.eu', groupHash: 'abc123' });
    assert.equal(parseIssueGroupKey('abc'), null);
    assert.equal(parseIssueGroupKey(':abc'), null);
    assert.equal(parseIssueGroupKey(null), null);
  });

  it('resolves a window ending at the minute, within the 31 days of the trend', () => {
    assert.deepEqual(resolveIssuesWindow('1h', Date.UTC(2026, 0, 31, 10, 0, 42)), { from: '2026-01-31T09:00:00Z', to: '2026-01-31T10:00:00Z' });
    assert.equal(resolveIssuesWindow('30d', Date.UTC(2026, 0, 31)).from, '2026-01-01T00:00:00Z');
    assert.equal(toIssuesWindowPreset('7d'), '7d');
    assert.equal(toIssuesWindowPreset('90d'), '24h');
  });

  it('reads registry times as UTC and ISO instants', () => {
    assert.equal(parseIssuesTime('2026-01-31 10:00:00'), Date.UTC(2026, 0, 31, 10));
    assert.equal(parseIssuesTime('2026-01-31T10:00:00Z'), Date.UTC(2026, 0, 31, 10));
    assert.equal(parseIssuesTime(null), null);
  });

  it('keeps a missing reading as a gap and rounds the axis', () => {
    const bars = trendBarsOf({ elements: [{ x: '2026-01-31T10:01:00Z', y: null }, { x: '2026-01-31T10:00:00Z', y: 37 }] });
    assert.deepEqual(bars, [{ ms: Date.UTC(2026, 0, 31, 10, 0), value: 37 }, { ms: Date.UTC(2026, 0, 31, 10, 1), value: null }]);
    assert.equal(trendAxisMax(bars), 40);
    assert.equal(trendAxisMax([]), 4);
  });

  it('draws backend frames with their code context and resolved client frames at the original position', () => {
    const backend = issueFrameViewsOf({
      backendFrames: { elements: [{ file: 'src/A.php', line: 23, function: 'A->run', inApp: true, codeContextStartLine: 22, codeContextLines: ['a', 'b'] }, { file: 'vendor/x.php', line: 9, inApp: false }] },
    });
    assert.equal(backend[0]?.location, 'src/A.php:23');
    assert.deepEqual(codeContextRows(backend[0]?.contextLines ?? [], 22, 23), [{ number: 22, text: 'a', current: false }, { number: 23, text: 'b', current: true }]);
    assert.deepEqual(segmentIssueFrames(backend).map(segment => segment.kind), ['app', 'framework']);
    const client = issueFrameViewsOf({
      frames: { elements: [{ file: 'chunk.js', line: 1, column: 99, resolved: true, resolvedFile: 'src/B.tsx', resolvedLine: 42, resolvedColumn: 3, resolvedFunction: 'B', inApp: true }] },
    });
    assert.equal(client[0]?.location, 'src/B.tsx:42:3');
    assert.equal(client[0]?.minifiedLocation, 'chunk.js:1:99');
    assert.equal(client[0]?.highlightLine, 42);
  });
});
