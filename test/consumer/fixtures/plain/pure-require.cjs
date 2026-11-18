// The dependency-free entry from CommonJS: `require('@mgamadeus/ddd-admin-ui/logic/pure')` resolves the CommonJS build
// (the `require` condition), loads without React and @mgamadeus/ddd-web, and resolves crumbs, sorts and tracks.
//
// Runs against the installed package (consumer check) or, from the repository, against its own build:
// node test/consumer/fixtures/plain/pure-require.cjs
const assert = require('node:assert/strict');
const Module = require('node:module');

const resolved = require.resolve('@mgamadeus/ddd-admin-ui/logic/pure');
assert.match(resolved, /[\\/]dist[\\/]cjs[\\/]logic[\\/]pure[\\/]index\.js$/, `the require condition resolves the CommonJS build (${resolved})`);

// nothing of React or ddd-web may load with it
const loaded = [];
const originalLoad = Module._load;
Module._load = function load(request, ...rest) {
  loaded.push(request);
  return originalLoad.call(this, request, ...rest);
};
const pure = require('@mgamadeus/ddd-admin-ui/logic/pure');
Module._load = originalLoad;
const external = loaded.filter(request => !request.startsWith('.') && !request.startsWith('node:') && !request.startsWith('@mgamadeus/ddd-admin-ui'));
assert.deepEqual(external, [], `no bare dependency is loaded (${external.join(', ')})`);

const navigation = [
  { key: 'items', label: 'Items', href: '/items', crumbs: [{ segment: ':itemId', label: segment => `Item ${segment}` }] },
];
const crumbs = pure.resolveCrumbs('/items/42', navigation);
assert.deepEqual(
  crumbs.map(crumb => crumb.label),
  ['Items', 'Item 42']
);
assert.equal(pure.resolveDocumentTitle('/items/42', navigation, { appName: 'Admin' }), 'Item 42 · Items · Admin');
assert.deepEqual(pure.parseListSort('name:desc'), { key: 'name', direction: 'desc' });
assert.equal(pure.normalisePathname('/items/?page=2'), '/items');
assert.equal(typeof pure.computeListTracks, 'function');
console.log(`ok      ./logic/pure from CommonJS (${Object.keys(pure).length} exports, no dependency loaded)`);
