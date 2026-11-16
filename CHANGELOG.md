# Changelog

All notable changes to `@mgamadeus/ddd-admin-ui`. 0.x: each minor may break; depend on it with `">=0.N <1"`.

## 0.1.0-rc.2

- The real blocks replace the sample source. Entries: `./logic` (pure helpers, React hooks, browser helpers),
  `./i18n`, `./primitives`, `./list`, `./page`, `./form`, `./translations`, `./media`, `./glass`, `./provider`,
  `./next`, `./notify-sonner`, plus `./theme.css`, `./components.css`, `./tokens.json` (31 colour roles, properties,
  layers, data attributes, utilities per role) and `./i18n-keys.json` (128 texts). `STANDARDS.md` describes how list,
  detail, form and drawer screens are composed.
- Removed: the `./data` entry (no blocks yet).
- `radix-ui` is a peer (`^1.8.1`), no longer a dependency: the host installs one Radix copy.
- Exports use the `default` condition (was `import`).
- New bins: `ddd-admin-ui-check-tokens`, `ddd-admin-ui-check-radix`, `ddd-admin-ui-i18n-manifest` (scripts shipped in
  `dist/scripts`); `scripts/check-tokens.mjs` at the package root is gone. `ddd-admin-ui link-skills` is unchanged.
- `check-package` follows the rules as built: client boundaries without a hook are listed, not failed; runtime and
  type-only edges are checked apart, with file limits for `page → list`, `form → page` and `translations → form`;
  the declarations compile in a strict consumer (bundler and nodenext); the text manifest is compared against the
  built JS; the `utilities` lists of `tokens.json` must equal a fresh extraction.

## 0.1.0-rc.1

- First published version of the scaffold (the content of 0.1.0-rc.0).
- Release step: the version is part of `i18n-keys.json`, so a version bump is followed by `pnpm i18n:manifest`
  before the commit; the release checks refuse a stale manifest.

## 0.1.0-rc.0 (tagged, not published: its manifest named the former version)

- Repository scaffold: unbundled `tsc` build with per-file `'use client'` directives, `check-package` (13 rules, a
  failing fixture per rule), `check-tokens` for hosts, the i18n key manifest, consumer tests (Next 16 build,
  hydration, overlays, CSS, optional peers, strict type checks), CI and the tag release workflow, and the
  `ddd-admin-ui link-skills` command. Sample source only.
