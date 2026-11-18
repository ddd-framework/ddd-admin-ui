import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { translateText } from '../i18n/store.ts';
import type { TranslateFn } from '../i18n/useTranslate.ts';
import { sequenceLabelText, throughputDescriptionText } from './format.ts';

const t = translateText as unknown as TranslateFn;

describe('window texts from the payload (0.3.4)', () => {
  it('names the sequence window of a sparkline', () => {
    assert.equal(sequenceLabelText('handled', 3600, t), 'Handled messages in the last hour');
    assert.equal(sequenceLabelText('failed', 1800, t), 'Failed messages in the last 30 min');
    assert.equal(sequenceLabelText('processes', 7200, t), 'Worker processes in the last 2 hours');
  });

  it('describes the throughput windows of the payload', () => {
    assert.match(throughputDescriptionText([300, 900, 3600, 86400], t), /last 5 and 15 minutes/);
    assert.match(throughputDescriptionText([], t), /last 5 and 15 minutes/);
    assert.match(throughputDescriptionText([600, 3600, 604800], t), /each window \(10 min, 1 hour, 7 days\)/);
  });
});
