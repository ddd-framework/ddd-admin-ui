// The one URL write queue (module state). Every writer of search parameters in a host goes through it, so two
// writers in the same tick do not drop each other's parameters. Exists once; scripts/check-package.mjs verifies it.

export type SearchParamsUpdate = Readonly<Record<string, string | null>>;
export type NavigateFn = (href: string) => void;

let pending: Record<string, string | null> = {};
let isScheduled = false;
let navigate: NavigateFn | null = null;

/** Registers how the queue navigates (the Next adapter registers `router.replace`). */
export const setSearchParamsNavigator = (next: NavigateFn | null): void => {
  navigate = next;
};

const flush = (): void => {
  isScheduled = false;
  const update = pending;
  pending = {};
  if (!navigate || typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  for (const [name, value] of Object.entries(update)) {
    if (value === null) params.delete(name);
    else params.set(name, value);
  }
  const query = params.toString();
  navigate(`${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
};

/** Queues parameter changes; all changes of one tick become one navigation. `null` removes a parameter. */
export const writeSearchParams = (update: SearchParamsUpdate): void => {
  pending = { ...pending, ...update };
  if (isScheduled) return;
  isScheduled = true;
  queueMicrotask(flush);
};
