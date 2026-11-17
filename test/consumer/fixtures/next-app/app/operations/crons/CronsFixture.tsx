'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { CronsScreen } from '@mgamadeus/ddd-admin-ui/crons';
import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';

import { cronsApi, makeCronsStore } from './cronsFixtureApi';

export function CronsFixture() {
  const [store] = useState(makeCronsStore);
  const urlStateAdapter = useNextUrlStateAdapter({ listId: 'operations.crons' });
  const drawerUrlAdapter = useNextDrawerUrlAdapter();
  return (
    <Provider store={store}>
      <main className="p-4 md:p-6">
        <CronsScreen api={cronsApi} urlStateAdapter={urlStateAdapter} drawerUrlAdapter={drawerUrlAdapter} />
      </main>
    </Provider>
  );
}
