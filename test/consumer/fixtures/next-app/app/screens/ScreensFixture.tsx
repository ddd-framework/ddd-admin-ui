'use client';

import { type ReactNode, useState } from 'react';
import { Provider } from 'react-redux';
import { WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { SHOWCASE_NOW_MS } from '@mgamadeus/ddd-admin-ui/showcase';
import { LocalesScreen, AppTranslationsScreen, ConfigImportCard } from '@mgamadeus/ddd-admin-ui/translations';
import { WorkersOverviewScreen, WorkerTransportScreen } from '@mgamadeus/ddd-admin-ui/workers';

import { makeStore, translationsApi, workersApi } from './fixtureApi';

const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
};

const transportHref = (transport: string, tab?: string) => `/screens/transport?transport=${transport}${tab ? `&tab=${tab}` : ''}`;

export function WorkersFixture({ readOnly = false }: { readOnly?: boolean }) {
  const screen = <WorkersOverviewScreen api={workersApi} transportHref={transportHref} historyAnchorMs={SHOWCASE_NOW_MS} />;
  return (
    <StoreProvider>
      <main className="p-6">{readOnly ? <WriteAccessProvider value={{ allowed: false, reason: 'Read-only workspace' }}>{screen}</WriteAccessProvider> : screen}</main>
    </StoreProvider>
  );
}

export function TransportFixture() {
  return (
    <StoreProvider>
      <main className="p-6">
        <WorkerTransportScreen api={workersApi} transport="import_orders" backHref="/screens/workers" historyAnchorMs={SHOWCASE_NOW_MS} />
      </main>
    </StoreProvider>
  );
}

export function TranslationsFixture() {
  return (
    <StoreProvider>
      <main className="space-y-10 p-6">
        <div id="locales-screen">
          <LocalesScreen api={translationsApi} asSpecimen />
        </div>
        <div id="keys-screen">
          <AppTranslationsScreen api={translationsApi} asSpecimen />
        </div>
        <div id="import-card">
          <ConfigImportCard api={translationsApi} kind="locales" />
        </div>
      </main>
    </StoreProvider>
  );
}
