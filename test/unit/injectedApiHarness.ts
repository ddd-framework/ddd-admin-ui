// Two harnesses for the injected screen apis: a recording fake of RTK Query's api (definitions, tags, hook names) and,
// where the repository's install has it (a peer of @mgamadeus/ddd-web), the real RTK Query with a fake base query.
import { createRequire } from 'node:module';

import { injectedHookName } from '../../src/logic/pure/injectedApi.ts';

export interface RecordedEndpoint {
  type: 'query' | 'mutation';
  query: (arg: unknown) => { url: string; method?: string; body?: unknown };
  providesTags?: unknown[];
  invalidatesTags?: unknown[];
}

/** A fake base api that records what an entry injects. */
export const recordingBaseApi = () => {
  const endpoints: Record<string, RecordedEndpoint> = {};
  const tagTypes: string[] = [];
  let injections = 0;
  const api = {
    reducerPath: 'api',
    enhanceEndpoints: ({ addTagTypes }: { addTagTypes: string[] }) => {
      tagTypes.push(...addTagTypes);
      return {
        injectEndpoints: ({ endpoints: build }: { endpoints: (builder: object) => Record<string, RecordedEndpoint> }) => {
          injections += 1;
          const definitions = build({
            query: (definition: object) => ({ type: 'query', ...definition }),
            mutation: (definition: object) => ({ type: 'mutation', ...definition }),
          });
          Object.assign(endpoints, definitions);
          const hooks: Record<string, () => string> = {};
          for (const [name, definition] of Object.entries(definitions)) hooks[injectedHookName(name, definition.type)] = () => name;
          return hooks;
        },
      };
    },
    injectEndpoints: () => ({}),
  };
  return { api, endpoints, tagTypes, injections: () => injections };
};

/** Tags as RTK sees them: `'T'` = every tag of type T. */
export const tagMatches = (provided: unknown, invalidated: unknown): boolean => {
  const asTag = (tag: unknown) => (typeof tag === 'string' ? { type: tag, id: undefined } : (tag as { type: string; id?: unknown }));
  const left = asTag(provided);
  const right = asTag(invalidated);
  return left.type === right.type && (right.id === undefined || left.id === right.id);
};

/** The real RTK Query (`@reduxjs/toolkit/query`), when the install has it; `null` otherwise (the test is skipped). */
export const loadRtkQuery = (): null | {
  createApi: (options: object) => any;
  configureStore: (options: object) => any;
} => {
  try {
    const fromDddWeb = createRequire(createRequire(import.meta.url).resolve('@mgamadeus/ddd-web/package.json'));
    const query = fromDddWeb('@reduxjs/toolkit/query');
    const toolkit = fromDddWeb('@reduxjs/toolkit');
    return { createApi: query.createApi, configureStore: toolkit.configureStore };
  } catch {
    return null;
  }
};
