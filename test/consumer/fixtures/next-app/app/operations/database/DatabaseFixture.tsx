'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { SchemaDiffScreen } from '@mgamadeus/ddd-admin-ui/database';

import { databaseFixture, forbiddenDatabaseFixture } from './fixtureApi';

export function DatabaseFixture({ forbidden = false }: { forbidden?: boolean }) {
  const fixture = forbidden ? forbiddenDatabaseFixture : databaseFixture;
  const [store] = useState(fixture.makeStore);
  return (
    <Provider store={store}>
      <main className="p-6">
        <SchemaDiffScreen api={fixture.databaseApi} />
      </main>
    </Provider>
  );
}
