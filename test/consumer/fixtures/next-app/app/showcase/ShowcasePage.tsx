'use client';

// The showcase in a Next app that has sonner: ./notify-sonner loads through the host's loader; a host section follows
// the package's.
import { Showcase } from '@mgamadeus/ddd-admin-ui/showcase';
import '../germanUi';

const loadNotifySonner = () => import('@mgamadeus/ddd-admin-ui/notify-sonner');

export function ShowcasePage() {
  return (
    <main className="p-4">
      <Showcase
        loadNotifySonner={loadNotifySonner}
        sections={[{ id: 'host', title: 'Host blocks', content: <p id="host-block">A host block</p> }]}
      />
    </main>
  );
}
