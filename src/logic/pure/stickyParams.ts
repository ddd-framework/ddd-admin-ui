/**
 * Carries a host's sticky search parameters (a scope, a debug flag, a locale) from the current URL onto a link: each of
 * `names` present in `currentSearch` and not set by `href` itself is appended. The path, the link's own parameters and
 * the hash stay as they are; relative and absolute links both work. Use it in the host's link component (the one passed
 * to `AdminUiProvider.linkComponent`), so every link a block renders keeps them.
 *
 * `currentSearch`: `location.search`, `useSearchParams().toString()` or a `URLSearchParams`.
 */
export const withStickyParams = (
  href: string,
  names: readonly string[],
  currentSearch: string | URLSearchParams
): string => {
  const current = typeof currentSearch === 'string' ? new URLSearchParams(currentSearch.replace(/^\?/, '')) : currentSearch;
  const hashIndex = href.indexOf('#');
  const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
  const beforeHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const path = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  const own = new URLSearchParams(queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1));
  let changed = false;
  for (const name of names) {
    if (own.has(name)) continue;
    for (const value of current.getAll(name)) {
      own.append(name, value);
      changed = true;
    }
  }
  if (!changed) return href;
  const query = own.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
};
