'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import type { ConfirmQueue } from '../logic/pure/confirmQueue.ts';
import type { ConfirmOptions } from '../logic/pure/confirm.ts';
import { ConfirmDialogView } from '../primitives/confirmDialogView.tsx';

const NO_ENTRY = () => null;

/**
 * The provider's confirmation dialog: shows the queue's oldest pending call. While mounted the queue takes calls; on
 * unmount every pending call settles with `false` (Strict Mode's second mount takes calls again).
 */
export const ConfirmHost = ({ queue }: { queue: ConfirmQueue<ConfirmOptions> }) => {
  useEffect(() => {
    queue.activate();
    return () => queue.deactivate();
  }, [queue]);
  const entry = useSyncExternalStore(queue.subscribe, queue.current, NO_ENTRY);
  const settle = useCallback((id: number, confirmed: boolean) => void queue.settle(id, confirmed), [queue]);
  return <ConfirmDialogView entry={entry} onSettle={settle} />;
};
