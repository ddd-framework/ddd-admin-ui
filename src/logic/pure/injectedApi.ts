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
  /**
   * How the response body becomes `data` (RTK Query's `fetchBaseQuery` option, passed on by `createDddBaseQuery`):
   * `'text'` for a `text/plain` answer; absent = the base query's default (JSON).
   */
  responseHandler?: 'json' | 'text' | 'content-type';
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
  /**
   * Fetches the current arguments again. RTK Query answers the started request (`unwrap()` resolves with the data or
   * rejects with the error); the static hooks (`staticQueryHook`) answer the fixed data the same way.
   */
  refetch: () => ApiRefetchCall<TData> | void;
}

/** A started refetch (RTK Query's `QueryActionCreatorResult`, the part the screens use). */
export interface ApiRefetchCall<TData> {
  unwrap: () => Promise<TData>;
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

const STATIC_QUERY_FAILURE = Symbol.for('ddd-admin-ui.staticQueryFailure');

/** A failed answer of a `staticQueryHook` (`staticQueryFailure(error)`): the hook reports `isError` with `error`. */
export interface StaticQueryFailure {
  readonly [STATIC_QUERY_FAILURE]: true;
  readonly error: unknown;
}

/**
 * A failed answer for `staticQueryHook`, in the shape RTK Query reports a failed request
 * (`staticQueryFailure({ status: 403, data: { error: 'Schema writes are disabled' } })`).
 */
export const staticQueryFailure = (error: unknown): StaticQueryFailure => ({ [STATIC_QUERY_FAILURE]: true, error });

const isStaticQueryFailure = (value: unknown): value is StaticQueryFailure =>
  typeof value === 'object' && value !== null && STATIC_QUERY_FAILURE in value;

/**
 * A query hook answering fixed data, for showcases, tests and design reviews (no store, no request): `answer(arg)`
 * gives the data of the arguments, `undefined` = still loading, `staticQueryFailure(error)` = a failed request. With
 * `skip` the hook answers nothing, as RTK Query does.
 */
export const staticQueryHook =
  <TArg, TData>(answer: (arg: TArg) => TData | StaticQueryFailure | undefined): ApiQueryHook<TArg, TData> =>
  (arg, options) => {
    if (options?.skip) {
      return { isLoading: false, isFetching: false, isSuccess: false, isError: false, refetch: () => undefined };
    }
    const answered = answer(arg);
    if (isStaticQueryFailure(answered)) {
      const error = answered.error;
      return { isLoading: false, isFetching: false, isSuccess: false, isError: true, error, refetch: () => ({ unwrap: () => Promise.reject(error) }) };
    }
    const data = answered;
    return {
      data,
      currentData: data,
      isLoading: data === undefined,
      isFetching: false,
      isSuccess: data !== undefined,
      isError: false,
      refetch: () => ({ unwrap: () => (data === undefined ? new Promise<TData>(() => undefined) : Promise.resolve(data)) }),
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

/**
 * Host tags per operation (`InjectedHostTags.provides` / `.invalidates` in the keyed form): `byOperation` names the
 * tags of single operations by their operation name (`WorkersApiOperation`, `TranslationsApiOperation`: the hook's
 * name without `use` and `Query` / `Mutation`, `useLanguagesQuery` → `languages`); `others` go to every operation
 * `byOperation` does not name.
 */
export interface InjectedHostTagsByOperation<TOperation extends string = string> {
  byOperation?: Readonly<Partial<Record<TOperation, readonly InjectedTag[]>>>;
  others?: readonly InjectedTag[];
}

/** The tags of one side: a list for every operation, or keyed by operation (`InjectedHostTagsByOperation`). */
export type InjectedHostTagSelection<TOperation extends string = string> = readonly InjectedTag[] | InjectedHostTagsByOperation<TOperation>;

/**
 * The host's cache tags joined with the package's (`createWorkersApi({ tags })`, `createTranslationsApi({ tags })`):
 * `provides` are added to the queries (a host mutation invalidating one refetches the package's lists), `invalidates`
 * to the mutations (a package write refreshes the host's own data). Each side is a list for every operation, or keyed
 * by operation (`{ byOperation: { languages: ['HostLanguages'] }, others: [...] }`). Their tag types must be in the
 * host api's `tagTypes` (the injection adds them too).
 */
export interface InjectedHostTags<TOperation extends string = string> {
  provides?: InjectedHostTagSelection<TOperation>;
  invalidates?: InjectedHostTagSelection<TOperation>;
}

/**
 * The host's tags as a function of the operation: provided by a query, invalidated by a mutation (`undefined` or `[]`:
 * none). Called once per operation when the api is created, never per request.
 */
export type InjectedHostTagsResolver<TOperation extends string = string> = (
  operationName: TOperation,
  kind: 'query' | 'mutation'
) => readonly InjectedTag[] | undefined;

/** The `tags` option of the api factories: the object form (`InjectedHostTags`) or a function of the operation. */
export type InjectedHostTagsOption<TOperation extends string = string> = InjectedHostTags<TOperation> | InjectedHostTagsResolver<TOperation>;

const selectHostTags = (selection: InjectedHostTagSelection | undefined, operationName: string): readonly InjectedTag[] => {
  if (!selection) return [];
  if (Array.isArray(selection)) return selection;
  const keyed = selection as InjectedHostTagsByOperation;
  const named = keyed.byOperation?.[operationName];
  return named ?? keyed.others ?? [];
};

/**
 * The host's tags of one operation: what a query provides or a mutation invalidates in addition to the package's.
 * `operationName` is the public name (`languages`); without an operation name map the endpoint name stands for it.
 */
export const resolveHostTagsOf = (
  tags: InjectedHostTagsOption | undefined,
  operationName: string,
  kind: 'query' | 'mutation'
): readonly InjectedTag[] => {
  if (!tags) return [];
  if (typeof tags === 'function') return tags(operationName, kind) ?? [];
  return selectHostTags(kind === 'query' ? tags.provides : tags.invalidates, operationName);
};

/**
 * The host's tags of every endpoint (endpoint name → tags), for the memo key and the tag types; endpoints without host
 * tags are left out.
 */
export const resolveHostTagsByEndpoint = (
  definitions: Readonly<Record<string, InjectedEndpointDefinition<never>>>,
  tags: InjectedHostTagsOption | undefined,
  operationNames?: Readonly<Record<string, string>>
): Record<string, readonly InjectedTag[]> => {
  const resolved: Record<string, readonly InjectedTag[]> = {};
  if (!tags) return resolved;
  for (const [endpointName, definition] of Object.entries(definitions)) {
    const hostTags = resolveHostTagsOf(tags, operationNames?.[endpointName] ?? endpointName, definition.kind);
    if (hostTags.length > 0) resolved[endpointName] = hostTags;
  }
  return resolved;
};

/**
 * The definitions with the host's tags joined in (`InjectedHostTagsOption`); the same object without any.
 * `operationNames` maps endpoint names to the operation names the keyed and the function form use.
 */
export const withHostTags = <TDefinitions extends Readonly<Record<string, InjectedEndpointDefinition<never>>>>(
  definitions: TDefinitions,
  tags: InjectedHostTagsOption | undefined,
  operationNames?: Readonly<Record<string, string>>
): TDefinitions => {
  const byEndpoint = resolveHostTagsByEndpoint(definitions, tags, operationNames);
  if (Object.keys(byEndpoint).length === 0) return definitions;
  const joined: Record<string, InjectedEndpointDefinition<never>> = {};
  for (const [name, definition] of Object.entries(definitions)) {
    const hostTags = byEndpoint[name] ?? [];
    joined[name] =
      hostTags.length === 0
        ? definition
        : definition.kind === 'query'
          ? { ...definition, providesTags: [...(definition.providesTags ?? []), ...hostTags] }
          : { ...definition, invalidatesTags: [...(definition.invalidatesTags ?? []), ...hostTags] };
  }
  return joined as TDefinitions;
};

const tagTypeOf = (tag: InjectedTag): string => (typeof tag === 'string' ? tag : tag.type);

const selectionTags = (selection: InjectedHostTagSelection | undefined): readonly InjectedTag[] => {
  if (!selection) return [];
  if (Array.isArray(selection)) return selection;
  const keyed = selection as InjectedHostTagsByOperation;
  return [...Object.values(keyed.byOperation ?? {}).flatMap(list => [...((list as readonly InjectedTag[] | undefined) ?? [])]), ...(keyed.others ?? [])];
};

/**
 * The tag types of the host's tags (added to the api's tag types on injection). The function form needs the
 * definitions (and the operation names) to be asked; without them it lists none.
 */
export const hostTagTypes = (
  tags: InjectedHostTagsOption | undefined,
  definitions?: Readonly<Record<string, InjectedEndpointDefinition<never>>>,
  operationNames?: Readonly<Record<string, string>>
): string[] => {
  if (!tags) return [];
  const all =
    typeof tags === 'function'
      ? Object.values(definitions ? resolveHostTagsByEndpoint(definitions, tags, operationNames) : {}).flat()
      : [...selectionTags(tags.provides), ...selectionTags(tags.invalidates)];
  return [...new Set(all.map(tagTypeOf))];
};

/**
 * The memo key part of the host's tags (`''` without any): the resolved tags per endpoint, so the function form and
 * equal objects share one injection.
 */
export const hostTagsMemoKey = (
  definitions: Readonly<Record<string, InjectedEndpointDefinition<never>>>,
  tags: InjectedHostTagsOption | undefined,
  operationNames?: Readonly<Record<string, string>>
): string => (tags ? `:tags:${JSON.stringify(resolveHostTagsByEndpoint(definitions, tags, operationNames))}` : '');
