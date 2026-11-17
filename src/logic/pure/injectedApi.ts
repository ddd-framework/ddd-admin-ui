/**
 * The contract between the screen entries (`./workers`, `./translations`) and the host's RTK Query api, without an RTK
 * import: `createWorkersApi({ baseApi, apiPrefix })` injects its operations into the api the host built with
 * `createApi` (`@reduxjs/toolkit/query/react`) and returns the generated hooks under stable names. The package never
 * reaches RTK at run time; the types below describe the part of the api and of its hooks the screens use.
 */

/**
 * The host's RTK Query api (`createApi(...)` with the React hooks module). Its base query carries the origin, the
 * session and the refresh (a fetch-style base query such as `createDddBaseQuery` of `@mgamadeus/ddd-web/api`).
 */
export interface InjectableBaseApi {
  reducerPath: string;
  // the methods are typed loosely on purpose: every RTK version's generic signatures fit, the entry calls them as
  // RTK documents them (`enhanceEndpoints({ addTagTypes })`, then `injectEndpoints({ endpoints, overrideExisting })`)
  enhanceEndpoints: (...options: never[]) => unknown;
  injectEndpoints: (...options: never[]) => unknown;
}

/** A request as the base query receives it: path with its query string, method, JSON body. */
export interface InjectedRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** A cache tag: a tag type, or a tag type with an id. */
export type InjectedTag = string | { type: string; id: string | number };

/** One operation of an entry: a query (cached, provides tags) or a mutation (invalidates tags). */
export interface InjectedEndpointDefinition<TArg = never> {
  kind: 'query' | 'mutation';
  request: (arg: TArg) => InjectedRequest;
  providesTags?: readonly InjectedTag[];
  invalidatesTags?: readonly InjectedTag[];
}

/** What a query hook of the returned api answers (the RTK Query result fields the screens read). */
export interface ApiQueryResult<TData> {
  data?: TData;
  /** The data of the current arguments only (`undefined` while new arguments load). */
  currentData?: TData;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => unknown;
}

/** Options of a query hook (RTK Query's names). */
export interface ApiQueryOptions {
  skip?: boolean;
  /** Refetch every n ms (0: off). */
  pollingInterval?: number;
  refetchOnMountOrArgChange?: boolean | number;
}

export type ApiQueryHook<TArg, TData> = (arg: TArg, options?: ApiQueryOptions) => ApiQueryResult<TData>;

/** A started mutation: `unwrap()` resolves with the response or rejects with the error; `abort()` cancels it. */
export interface ApiMutationCall<TData> {
  unwrap: () => Promise<TData>;
  abort: () => void;
}

export interface ApiMutationState {
  isLoading: boolean;
}

export type ApiMutationHook<TArg, TData> = () => readonly [(arg: TArg) => ApiMutationCall<TData>, ApiMutationState];

/** Without trailing slashes (`/api/admin/workers/` → `/api/admin/workers`). */
export const trimApiPrefix = (apiPrefix: string): string => apiPrefix.replace(/\/+$/, '');

/** A query string of the defined, non-empty parameters in their order (`?from=…&stepSeconds=300`), or `''`. */
export const toQueryString = (parameters: Readonly<Record<string, string | number | boolean | null | undefined>>): string => {
  const parts: string[] = [];
  for (const [name, value] of Object.entries(parameters)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
};

/** The part of RTK Query's endpoint builder an entry calls. */
interface EndpointBuilderLike {
  query: (definition: object) => unknown;
  mutation: (definition: object) => unknown;
}

interface InjectingApi {
  enhanceEndpoints: (options: { addTagTypes: readonly string[] }) => {
    injectEndpoints: (options: { endpoints: (build: EndpointBuilderLike) => object; overrideExisting: boolean }) => unknown;
  };
}

const capitalize = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

/** The name RTK Query gives an endpoint's hook (`workersOverview` → `useWorkersOverviewQuery`). */
export const injectedHookName = (endpointName: string, kind: 'query' | 'mutation'): string =>
  `use${capitalize(endpointName)}${kind === 'query' ? 'Query' : 'Mutation'}`;

/** One result per base api and prefix: a second call with the same api and prefix returns the first result. */
const injectedByBaseApi = new WeakMap<object, Map<string, unknown>>();

/**
 * Injects named operations into the host's api once per base api and memo key, and returns the generated hooks by
 * endpoint name. The definitions' `request` builders run inside RTK Query (`query`), so they stay pure.
 *
 * @throws Error when the api did not generate a hook for an operation (a base api without the React hooks module)
 */
export const injectEndpointsOnce = <THooks>(
  baseApi: InjectableBaseApi,
  memoKey: string,
  tagTypes: readonly string[],
  definitions: Readonly<Record<string, InjectedEndpointDefinition<never>>>,
  toHooks: (hookOf: (endpointName: string) => unknown) => THooks
): THooks => {
  const injectedByKey = injectedByBaseApi.get(baseApi) ?? new Map<string, unknown>();
  injectedByBaseApi.set(baseApi, injectedByKey);
  const existing = injectedByKey.get(memoKey);
  if (existing !== undefined) return existing as THooks;

  const injecting = baseApi as unknown as InjectingApi;
  const api = injecting.enhanceEndpoints({ addTagTypes: tagTypes }).injectEndpoints({
    endpoints: build => {
      const endpoints: Record<string, unknown> = {};
      for (const [name, definition] of Object.entries(definitions)) {
        endpoints[name] =
          definition.kind === 'query'
            ? build.query({ query: definition.request, providesTags: [...(definition.providesTags ?? [])] })
            : build.mutation({ query: definition.request, invalidatesTags: [...(definition.invalidatesTags ?? [])] });
      }
      return endpoints;
    },
    overrideExisting: false,
  }) as Record<string, unknown>;

  const hooks = toHooks(endpointName => {
    const kind = definitions[endpointName]?.kind ?? 'query';
    const hook = api[injectedHookName(endpointName, kind)];
    if (typeof hook !== 'function') {
      throw new Error(`The base api generated no ${injectedHookName(endpointName, kind)}: create it with the React hooks module`);
    }
    return hook;
  });
  injectedByKey.set(memoKey, hooks);
  return hooks;
};

/**
 * A query hook answering fixed data, for showcases, tests and design reviews (no store, no request): `answer(arg)`
 * gives the data of the arguments, `undefined` = still loading.
 */
export const staticQueryHook =
  <TArg, TData>(answer: (arg: TArg) => TData | undefined): ApiQueryHook<TArg, TData> =>
  arg => {
    const data = answer(arg);
    return {
      data,
      currentData: data,
      isLoading: data === undefined,
      isFetching: false,
      isSuccess: data !== undefined,
      isError: false,
      refetch: () => undefined,
    };
  };

/** A mutation hook answering with `answer(arg)` (resolved, or rejected when it throws), for showcases and tests. */
export const staticMutationHook = <TArg, TData>(answer: (arg: TArg) => TData | Promise<TData>): ApiMutationHook<TArg, TData> => {
  const state: ApiMutationState = Object.freeze({ isLoading: false });
  const trigger = (arg: TArg): ApiMutationCall<TData> => ({
    unwrap: () => Promise.resolve().then(() => answer(arg)),
    abort: () => undefined,
  });
  const result = [trigger, state] as const;
  return () => result;
};
