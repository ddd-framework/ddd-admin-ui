'use client';

import type { ReactNode } from 'react';
import { useNextDrawerUrlAdapter, useNextUrlStateAdapter } from '@mgamadeus/ddd-admin-ui/next';
import { sonnerNotifications, Toaster } from '@mgamadeus/ddd-admin-ui/notify-sonner';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AdminUiProvider
      notifications={sonnerNotifications}
      useUrlStateAdapter={useNextUrlStateAdapter}
      useDrawerUrlAdapter={useNextDrawerUrlAdapter}
    >
      {children}
      <Toaster />
    </AdminUiProvider>
  );
}
