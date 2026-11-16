/** One pending confirmation of a `ConfirmQueue`. */
export interface ConfirmQueueEntry<TOptions> {
  /** Unique per queue; a settle names it, so an entry settles once. */
  id: number;
  options: TOptions;
}

/**
 * The confirmations of one provider, answered one after the other: `request` queues and returns the promise, the
 * renderer shows `current()` and `settle`s it by id. Every request settles exactly once; a settle for an entry that is
 * already settled does nothing. `deactivate` (unmount) settles every pending entry with `false`, and requests while
 * inactive settle with `false` at once.
 */
export interface ConfirmQueue<TOptions> {
  request: (options: TOptions) => Promise<boolean>;
  /** The entry to show (the oldest pending one), the same object until it settles; `null` when none is pending. */
  current: () => ConfirmQueueEntry<TOptions> | null;
  /** Pending entries, the current one included. */
  size: () => number;
  /** `true` when the entry was pending and is now settled. */
  settle: (id: number, confirmed: boolean) => boolean;
  /** Settles every pending entry with `false` and refuses new requests until `activate`. */
  deactivate: () => void;
  activate: () => void;
  subscribe: (listener: () => void) => () => void;
}

export const createConfirmQueue = <TOptions>(): ConfirmQueue<TOptions> => {
  type Pending = ConfirmQueueEntry<TOptions> & { resolve: (confirmed: boolean) => void };
  let pending: Pending[] = [];
  let shown: ConfirmQueueEntry<TOptions> | null = null;
  let nextId = 1;
  let active = true;
  const listeners = new Set<() => void>();

  const emit = () => {
    const head = pending[0];
    shown = head ? (shown?.id === head.id ? shown : { id: head.id, options: head.options }) : null;
    for (const listener of [...listeners]) listener();
  };

  return {
    request: options => {
      if (!active) return Promise.resolve(false);
      return new Promise<boolean>(resolve => {
        pending = [...pending, { id: nextId, options, resolve }];
        nextId += 1;
        emit();
      });
    },
    current: () => shown,
    size: () => pending.length,
    settle: (id, confirmed) => {
      const entry = pending.find(candidate => candidate.id === id);
      if (!entry) return false;
      pending = pending.filter(candidate => candidate !== entry);
      entry.resolve(confirmed);
      emit();
      return true;
    },
    deactivate: () => {
      active = false;
      const settled = pending;
      pending = [];
      for (const entry of settled) entry.resolve(false);
      if (settled.length > 0) emit();
    },
    activate: () => {
      active = true;
    },
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};
