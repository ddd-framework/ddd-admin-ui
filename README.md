# @mgamadeus/ddd-admin-ui

Admin UI building blocks for React 19 / Next 16 / Tailwind 4 apps built on the
[`mgamadeus/ddd`](https://github.com/ddd-framework/ddd) framework: pure helpers and React hooks, shadcn-style
primitives, list / page / form / translation / media / glass blocks, Next adapters, a provider, two stylesheets and two
JSON manifests.

> **Status: scaffold.** The build, the package checks, the consumer tests and the release workflow are in place; the
> source is a small set of samples that exercises every rule. The real blocks follow. Nothing is published yet.

## Entries

| Entry | Content | Runs without |
|---|---|---|
| `./logic` | pure helpers (formats, status maps, `notify`, error messages) and React hooks | Tailwind, Radix, icons, Next |
| `./i18n` | the translation store (one per app), `m()`, `useTranslate`, `<Translate>` | Tailwind, Radix, icons, Next |
| `./primitives` | shadcn-style components on Radix (button, dialog, sheet, select, …), `cn` | Next |
| `./list`, `./page`, `./form`, `./translations`, `./media`, `./glass`, `./data` | blocks | Next |
| `./next` | Next adapters: the one URL write queue and URL-state hooks | — (needs `next`) |
| `./provider` | `AdminUiProvider`, `useAdminUi` and the adapter types | Next |
| `./notify-sonner` | the notification adapter for sonner | — (needs `sonner`) |
| `./theme.css` | binds the colour roles of `tokens.json` as Tailwind theme colours | |
| `./components.css` | structure the blocks rely on: surfaces, title utilities, data-attribute rules, the layer scale | |
| `./tokens.json` | the CSS contract: colour roles, custom properties, layers, data attributes | |
| `./i18n-keys.json` | every text the package translates, with context and hint | |

ESM only. Every file keeps its own `'use client'` directive: files with hooks, contexts or `react-dom` carry it, pure
files do not, so server components can call `m()`, the formats and the status maps directly.

Allowed imports between entries (run time): `logic → i18n`; `primitives → i18n`; `list → logic, i18n, primitives`;
`page → list, logic, i18n, primitives`; `form → page, logic, i18n, primitives`; `translations → form, logic, i18n,
primitives`; `media → list, form, logic, i18n, primitives`; `glass`, `data`, `provider → logic, i18n, primitives`;
`next → logic, provider`; `notify-sonner → logic`.

## Install

```bash
pnpm add @mgamadeus/ddd-admin-ui @mgamadeus/ddd-web react react-dom lucide-react react-hook-form zod
# optional, per entry: next (./next), sonner (./notify-sonner), recharts (chart files of ./data)
```

| Peer | Range |
|---|---|
| `react`, `react-dom` | `^19.0.0` |
| `@mgamadeus/ddd-web` | `>=0.13.0 <1.0.0` |
| `lucide-react` | `>=0.550.0 <2` |
| `react-hook-form` | `^7.65.0` |
| `zod` | `^4.0.0` |
| `next` (optional) | `^16.0.0` |
| `sonner` (optional) | `^2.0.0` |
| `recharts` (optional) | `^3.0.0` |
| `tailwindcss` (optional, host requirement) | `^4.1.0` |

## Stylesheets

```css
@import 'tailwindcss';
@import '@mgamadeus/ddd-admin-ui/theme.css';      /* hosts that declare complete colours under the role names */
@import '@mgamadeus/ddd-admin-ui/components.css'; /* always */

:root {
  --card: #ffffff;
  --nav-h: 4rem;
  /* … every colour and property of tokens.json */
}
.dark {
  --card: #111827;
  /* … every themed entry */
}
```

`components.css` carries `@source "./";`, so the host's Tailwind scans the package's built files for class names.
Colours are complete CSS colours (`#fff`, `oklch(…)`, `hsl(0 0% 100%)`), not bare channels. Layers
(`--layer-overlay`, `--layer-popover`, …) default to Tailwind's `z-50` scale and can be raised by the host.

Check a host's built CSS against the package:

```bash
node node_modules/@mgamadeus/ddd-admin-ui/scripts/check-tokens.mjs .next/static/css/*.css
```

## Provider

```tsx
'use client';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { sonnerNotifications } from '@mgamadeus/ddd-admin-ui/notify-sonner';

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <AdminUiProvider notifications={sonnerNotifications}>{children}</AdminUiProvider>
);
```

## Translations

The package translates its own texts through its store (`setTranslations` from `./i18n`, or a `translations` adapter
on the provider). `i18n-keys.json` lists every such text (`key` = text or `text__context`, `hint`, `files`), so a
host's translation export can merge them with its own keys.

## Agent skill

```bash
npx ddd-admin-ui link-skills   # or: pnpm exec ddd-admin-ui link-skills
```

Symlinks the skills shipped in `.claude/skills/` of the installed package into the project's `.claude/skills/`.
Idempotent; repoints an existing symlink, never touches a real file or directory.

## Versioning

0.x: each minor may break. Depend on it with an explicit range, `">=0.N <1"`, never a caret on 0.x. Pre-releases
(`x.y.z-…`) are published under the `next` dist-tag. Changes per release: [CHANGELOG.md](CHANGELOG.md).

## Development

```bash
pnpm install
pnpm typecheck
pnpm test                       # unit tests and the check-package rules (node --test)
pnpm i18n:manifest              # after changing a translated text or the version
pnpm build                      # tsc → dist, declaration specifiers, stylesheets and manifests
node scripts/check-package.mjs .
pnpm pack --pack-destination "$TMPDIR" && test/consumer/run.sh "$TMPDIR"/mgamadeus-ddd-admin-ui-*.tgz pnpm "$TMPDIR/consumer-pnpm"
```

Source files import each other with explicit `.ts` / `.tsx` extensions and never through a directory.
`scripts/check-package.mjs` lists its rules at the top of the file. `CHECK_PACKAGE_DENY` (comma-separated) adds words
that must not appear in shipped files.

## License

MIT
