'use client';

import { Suspense, use } from 'react';

import type { NotificationAdapter } from '../../logic/index.ts';
import { Button, Skeleton } from '../../primitives/index.ts';

/** What the showcase needs of `./notify-sonner` (structural, so the showcase never names the `sonner` types). */
export interface NotifySonnerModule {
  sonnerNotifications: NotificationAdapter;
}

/** Imports `./notify-sonner`; passed by a host that has the `sonner` peer. */
export type NotifySonnerLoader = () => Promise<NotifySonnerModule>;

type Loaded<TModule> = { status: 'ready'; module: TModule } | { status: 'missing'; reason: string };

// One load per optional section for the page's lifetime: `use()` needs the same promise on every render, and a loader
// passed inline is a new function on every render.
const loads = new Map<string, Promise<Loaded<unknown>>>();

const loadOnce = <TModule,>(id: string, load: () => Promise<TModule>): Promise<Loaded<TModule>> => {
  let pending = loads.get(id) as Promise<Loaded<TModule>> | undefined;
  if (!pending) {
    pending = load().then(
      module => ({ status: 'ready', module }) as const,
      (error: unknown) => ({ status: 'missing', reason: error instanceof Error ? error.message : String(error) }) as const
    );
    loads.set(id, pending as Promise<Loaded<unknown>>);
  }
  return pending;
};

const Skipped = ({ peer, why }: { peer: string; why: string }) => (
  <p data-showcase-skipped={peer} className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
    Skipped: {why} (optional peer <code>{peer}</code>).
  </p>
);

const NotifySonnerLoaded = ({ load }: { load: NotifySonnerLoader }) => {
  const loaded = use(loadOnce('notify-sonner', load));
  if (loaded.status === 'missing') return <Skipped peer="sonner" why="./notify-sonner could not be loaded" />;
  const { sonnerNotifications } = loaded.module;
  return (
    <div data-showcase-loaded="notify-sonner" className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => sonnerNotifications.success('Saved', {})}>
        Success toast
      </Button>
      <Button variant="outline" size="sm" onClick={() => sonnerNotifications.error('Could not save', {})}>
        Error toast
      </Button>
      <p className="w-full text-xs text-muted-foreground">Toasts appear in the host's Toaster (mounted once by the host).</p>
    </div>
  );
};

/** The `./notify-sonner` section: loaded through the host's loader, skipped without it or when the import fails. */
export const NotifySonnerShowcase = ({ load }: { load?: NotifySonnerLoader }) => {
  if (!load) return <Skipped peer="sonner" why="no loadNotifySonner passed" />;
  return (
    <Suspense fallback={<Skeleton className="h-8 w-64" />}>
      <NotifySonnerLoaded load={load} />
    </Suspense>
  );
};

/** The `./next` section: adapters (hooks) only; described, never imported, so the showcase runs without Next.js. */
export const NextShowcase = () => (
  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
    <li>
      <code>useNextUrlStateAdapter</code>, <code>useNextDrawerUrlAdapter</code>: URL state for lists and drawers.
    </li>
    <li>
      <code>useListViewParam</code>: the grid / table view per list, remembered.
    </li>
    <li>
      <code>queueSearchParamsWrite</code>: the one URL writer.
    </li>
  </ul>
);
