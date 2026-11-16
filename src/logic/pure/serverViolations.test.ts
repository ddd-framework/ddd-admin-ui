import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  humanizeViolationPath,
  matchViolationField,
  parseValidationErrors,
  violationPath,
} from './serverViolations.ts';

describe('parseValidationErrors', () => {
  it('flattens the per-entity sets and joins jsonPath and property into the path', () => {
    const body = {
      elements: [
        {
          jsonPath: '.',
          elements: [{ propertyName: 'placeOfResidence', errorMessage: 'Too short', receivedValue: 'X' }],
        },
        { jsonPath: '.setting.', elements: [{ propertyName: 'maxSpeed', errorMessage: 'Too high' }] },
        { jsonPath: '.teams[2].', elements: [{ propertyName: 'name', errorMessage: 'Blank' }] },
      ],
    };
    assert.deepEqual(parseValidationErrors(body), [
      { propertyName: 'placeOfResidence', path: 'placeOfResidence', errorMessage: 'Too short' },
      { propertyName: 'maxSpeed', path: 'setting.maxSpeed', errorMessage: 'Too high' },
      { propertyName: 'name', path: 'teams.2.name', errorMessage: 'Blank' },
    ]);
  });

  it('keeps a violation without jsonPath and fills a missing property and message', () => {
    assert.deepEqual(parseValidationErrors({ elements: [{ elements: [{ propertyName: 'email' }, {}] }] }), [
      { propertyName: 'email', path: 'email', errorMessage: 'Unknown error' },
      { propertyName: 'unknown', path: 'unknown', errorMessage: 'Unknown error' },
    ]);
  });

  it('yields nothing for anything that is not a validationErrors body', () => {
    assert.deepEqual(parseValidationErrors(undefined), []);
    assert.deepEqual(parseValidationErrors('broken'), []);
    assert.deepEqual(parseValidationErrors({ elements: 'x' }), []);
  });
});

describe('violationPath', () => {
  it('writes array keys as segments and drops empty ones', () => {
    assert.equal(violationPath('.', 'name'), 'name');
    assert.equal(violationPath('.campaign.', 'rewards[0].title'), 'campaign.rewards.0.title');
    assert.equal(violationPath(undefined, 'translations[de::INFORMAL]'), 'translations.de::INFORMAL');
  });
});

describe('matchViolationField', () => {
  const fields = ['status', 'email', 'placeOfResidence', 'translations.name', 'reward.title', 'bikeTypeId'];

  it('matches the field named like the path', () => {
    assert.equal(matchViolationField('placeOfResidence', fields), 'placeOfResidence');
    assert.equal(matchViolationField('reward.title', fields), 'reward.title');
  });

  it('drops leading segments a form flattens (request wrapper, nested entity)', () => {
    assert.equal(matchViolationField('account.placeOfResidence', fields), 'placeOfResidence');
    assert.equal(matchViolationField('challenge.reward.title', fields), 'reward.title');
  });

  it('finds the one field nested under a form group', () => {
    assert.equal(matchViolationField('name', fields), 'translations.name');
    assert.equal(matchViolationField('title', ['reward.title', 'goal.title']), undefined);
    assert.equal(matchViolationField('name', ['translations.name', 'rewardTranslations.name']), 'translations.name');
  });

  it('follows the aliases first', () => {
    assert.equal(matchViolationField('bikeType', fields, { bikeType: 'bikeTypeId' }), 'bikeTypeId');
    assert.equal(matchViolationField('account.bikeType', fields, { bikeType: 'bikeTypeId' }), 'bikeTypeId');
  });

  it('returns undefined for a property the form does not show', () => {
    assert.equal(matchViolationField('deviceGeneratedId', fields), undefined);
    assert.equal(matchViolationField('setting.maxSpeed', []), undefined);
  });
});

describe('humanizeViolationPath', () => {
  it('turns property paths into words', () => {
    assert.equal(humanizeViolationPath('placeOfResidence'), 'Place of residence');
    assert.equal(humanizeViolationPath('setting.maxSpeed'), 'Setting › Max speed');
    assert.equal(humanizeViolationPath('teams.0.name'), 'Teams › #1 › Name');
    assert.equal(humanizeViolationPath('externalURLPath'), 'External url path');
    assert.equal(humanizeViolationPath('access_code'), 'Access code');
  });
});
