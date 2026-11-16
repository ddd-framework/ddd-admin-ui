import assert from 'node:assert/strict';
import { register } from 'node:module';
import { afterEach, describe, it } from 'node:test';

import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime.js';
import { PathnameContext, SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime.js';
import { createElement, type ReactNode } from 'react';
import { renderToString } from 'react-dom/server';

// `next` has no `exports` map, so plain Node cannot resolve the extensionless `next/navigation` the hook imports
// (bundlers can). Map it to the file for this test only, then load the hook.
register(
  `data:text/javascript,${encodeURIComponent(
    "export async function resolve(specifier, context, next) { return next(specifier === 'next/navigation' ? 'next/navigation.js' : specifier, context); }"
  )}`,
  import.meta.url
);
const { useListViewParam } = await import('./useListViewParam.ts');

const router: AppRouterInstance = {
  bfcacheId: 'test',
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
};

/** The Next app router contexts the hook reads, with an empty query. */
const withRouter = (child: ReactNode) =>
  createElement(
    AppRouterContext.Provider,
    { value: router },
    createElement(
      PathnameContext.Provider,
      { value: '/items' },
      createElement(SearchParamsContext.Provider, { value: new URLSearchParams() }, child)
    )
  );

const ViewProbe = () => {
  const [mode] = useListViewParam('admin.items', 'table');
  return createElement('span', null, mode);
};

const globals = globalThis as { window?: unknown };
afterEach(() => {
  delete globals.window;
});

describe('useListViewParam', () => {
  it('renders the default view on the server even when a view is stored (hydration matches)', () => {
    let reads = 0;
    const storage = {
      getItem: () => {
        reads += 1;
        return 'grid';
      },
      setItem: () => {},
      removeItem: () => {},
    };
    globals.window = { localStorage: storage, sessionStorage: storage };
    assert.equal(renderToString(withRouter(createElement(ViewProbe))), '<span>table</span>');
    assert.equal(reads, 0);
  });
});
