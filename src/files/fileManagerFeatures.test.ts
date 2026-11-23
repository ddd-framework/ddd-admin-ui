import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FileManagerActions, FileManagerCapabilities } from './fileManagerAdapter.ts';
import { resolveFileManagerFeatures } from './fileManagerFeatures.ts';

const noop = async () => undefined;
const listState = { items: [], isLoading: false, isFetchingMore: false, hasMore: false, loadMore: () => undefined, isError: false };
const queryState = { data: undefined, isLoading: false, isError: false };

describe('file manager capabilities', () => {
  it('offers nothing optional without capabilities, even when the actions exist', () => {
    const actions: Partial<FileManagerActions> = { restoreFiles: noop, purgeFiles: noop, uploadVersion: async () => ({}) as never, setLinks: noop };
    const features = resolveFileManagerFeatures(undefined, actions);
    assert.equal(features.trash, false);
    assert.equal(features.restore, false);
    assert.equal(features.versions, false);
    assert.equal(features.replaceVersion, false);
    assert.equal(features.links, false);
    assert.equal(features.editLinks, false);
    assert.equal(features.moveAcrossAreas, false);
    assert.equal(features.familyFilter, false);
    assert.deepEqual(features.orders, ['name']);
    assert.equal(features.malwareScan, true);
  });

  it('offers a capability only together with the actions it needs', () => {
    const capabilities: FileManagerCapabilities = {
      trash: { useTrash: () => listState },
      versions: {},
      links: { kinds: [{ kind: 'project', label: 'Project' }], useLinkTargets: () => queryState },
      moveAcrossAreas: { useMoveTargetAreas: () => queryState },
    };
    const partial = resolveFileManagerFeatures(capabilities, { restoreFiles: noop, restoreVersion: noop, setLinks: noop, moveItems: async () => ({ movedFiles: 0, movedFolders: 0 }) });
    assert.equal(partial.trash, true);
    assert.equal(partial.restore, true);
    assert.equal(partial.purge, false, 'no purgeFiles: no final delete');
    assert.equal(partial.emptyTrash, false);
    assert.equal(partial.versions, true);
    assert.equal(partial.restoreVersion, true);
    assert.equal(partial.replaceVersion, false);
    assert.equal(partial.links, true);
    assert.equal(partial.editLinks, true);
    assert.equal(partial.bulkLinks, false);
    assert.equal(partial.moveAcrossAreas, false, 'previewMove is missing');
  });

  it('reads filters, orders, working copies and the malware check', () => {
    const features = resolveFileManagerFeatures(
      { filters: { family: true, created: true, uploadedByMe: true, orders: ['created', 'name'] }, workingCopy: {}, malwareScan: { enabled: false } },
      {}
    );
    assert.equal(features.familyFilter, true);
    assert.equal(features.createdFilter, true);
    assert.equal(features.uploadedByMeFilter, true);
    assert.deepEqual(features.orders, ['created', 'name']);
    assert.equal(features.workingCopy, true);
    assert.equal(features.malwareScan, false);
  });

  it('needs at least one link kind for links', () => {
    assert.equal(resolveFileManagerFeatures({ links: { kinds: [], useLinkTargets: () => queryState } }, { setLinks: noop }).links, false);
  });
});
