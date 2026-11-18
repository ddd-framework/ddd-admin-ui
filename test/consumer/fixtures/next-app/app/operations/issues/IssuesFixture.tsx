'use client';

import { Suspense, useState } from 'react';
import { Provider } from 'react-redux';
import { IssuesScreen } from '@mgamadeus/ddd-admin-ui/issues';
import { WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';
import { SHOWCASE_NOW_MS } from '@mgamadeus/ddd-admin-ui/showcase';

import { issuesApi, makeIssuesStore } from './issuesFixtureApi';

const Screen = ({ customTrendRange = false }: { customTrendRange?: boolean }) => (
  <IssuesScreen
    customTrendRange={customTrendRange}
    api={issuesApi}
    urlStateAdapter={useNextUrlStateAdapter({ listId: 'operations.issues' })}
    drawerUrlAdapter={useNextDrawerUrlAdapter()}
    trendAnchorMs={SHOWCASE_NOW_MS}
  />
);

export function IssuesFixture({ readOnly = false, customTrendRange = false }: { readOnly?: boolean; customTrendRange?: boolean }) {
  const [store] = useState(makeIssuesStore);
  return (
    <Provider store={store}>
      <main className="p-4 md:p-6">
        <Suspense>{readOnly ? <WriteAccessProvider value={{ allowed: false, reason: 'Read-only workspace' }}><Screen customTrendRange={customTrendRange} /></WriteAccessProvider> : <Screen customTrendRange={customTrendRange} />}</Suspense>
      </main>
    </Provider>
  );
}
