'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { sonnerNotifications } from '@mgamadeus/ddd-admin-ui/notify-sonner';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AdminUiProvider notifications={sonnerNotifications}>
      {children}
      <Toaster />
    </AdminUiProvider>
  );
}
