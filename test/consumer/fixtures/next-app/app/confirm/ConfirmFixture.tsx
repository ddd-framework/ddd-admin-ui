'use client';

// useConfirm: Escape and the focus back to the trigger, queued calls, a required phrase, inside a drawer, two
// providers (the inner one with the host's own confirm), Strict Mode, and a provider unmounted while asking.
import { StrictMode, useCallback, useState } from 'react';
import { FormDrawer } from '@mgamadeus/ddd-admin-ui/form';
import { type ConfirmOptions, useConfirm } from '@mgamadeus/ddd-admin-ui/logic';
import { Button } from '@mgamadeus/ddd-admin-ui/primitives';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';

const Trigger = ({ id, onAnswer, ask }: { id: string; onAnswer: (answer: string) => void; ask: (confirm: ReturnType<typeof useConfirm>) => Promise<string> }) => {
  const confirm = useConfirm();
  return (
    <Button id={id} variant="outline" onClick={async () => onAnswer(await ask(confirm))}>
      {id}
    </Button>
  );
};

const one = (options: ConfirmOptions) => (confirm: ReturnType<typeof useConfirm>) => confirm(options).then(String);

export function ConfirmFixture() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [settles, setSettles] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [hostCalls, setHostCalls] = useState<string[]>([]);
  const record = (key: string) => (answer: string) => setAnswers(current => ({ ...current, [key]: answer }));
  const hostConfirm = useCallback(async (options: ConfirmOptions) => {
    setHostCalls(current => [...current, options.title]);
    return true;
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <output id="answers">{JSON.stringify(answers)}</output>
      <output id="settles">{settles}</output>
      <output id="host-calls">{hostCalls.join(',')}</output>
      <Trigger id="confirm-basic" onAnswer={record('basic')} ask={one({ title: 'Archive?', description: 'It leaves the list.' })} />
      <Trigger
        id="confirm-queue"
        onAnswer={record('queue')}
        ask={confirm => Promise.all([confirm({ title: 'First?' }), confirm({ title: 'Second?' })]).then(list => list.join(','))}
      />
      <Trigger
        id="confirm-phrase"
        onAnswer={record('phrase')}
        ask={one({ title: 'Delete Main site?', confirmLabel: 'Delete', confirmVariant: 'destructive', requirePhrase: 'Main site' })}
      />
      <Button id="open-drawer" onClick={() => setDrawerOpen(true)}>
        Open drawer
      </Button>
      <FormDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Drawer">
        <Trigger id="drawer-confirm" onAnswer={record('drawer')} ask={one({ title: 'From the drawer?' })} />
      </FormDrawer>
      <AdminUiProvider confirm={hostConfirm}>
        <Trigger id="inner-confirm" onAnswer={record('inner')} ask={one({ title: 'Inner provider?' })} />
      </AdminUiProvider>
      <StrictMode>
        <AdminUiProvider>
          <Trigger
            id="strict-confirm"
            onAnswer={answer => {
              setSettles(count => count + 1);
              record('strict')(answer);
            }}
            ask={one({ title: 'In Strict Mode?' })}
          />
        </AdminUiProvider>
      </StrictMode>
      {mounted && (
        <AdminUiProvider>
          <Trigger
            id="unmount-confirm"
            onAnswer={record('unmount')}
            ask={confirm => {
              setTimeout(() => setMounted(false), 300);
              return confirm({ title: 'Unmounted while asking?' }).then(String);
            }}
          />
        </AdminUiProvider>
      )}
    </main>
  );
}
