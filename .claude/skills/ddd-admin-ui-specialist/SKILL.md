---
name: ddd-admin-ui-specialist
description: "Build admin screens with @mgamadeus/ddd-admin-ui (React 19, Next 16, Tailwind 4, mgamadeus/ddd backends): which entry to import from (./logic, ./i18n, ./primitives, ./list, ./page, ./form, ./translations, ./media, ./glass, ./data, ./next, ./provider, ./notify-sonner), server-safe helpers versus 'use client' files, the stylesheets theme.css and components.css, the CSS contract in tokens.json (colour roles, custom properties, layer scale), AdminUiProvider and its adapters, translations with m() and i18n-keys.json, and check-tokens for a host's built CSS. Use when adding or changing an admin screen, wiring the package into a host, choosing an import path, fixing missing styles, overlays below a host dialog, untranslated block texts, or a server component that imports a client file."
---

# ddd-admin-ui-specialist

Skeleton: the package is a scaffold with sample source. The sections below are filled when the blocks arrive.

## Entries and import rules

- Import from the entry, never from a file inside `dist`.
- `./logic` and `./i18n` run without Tailwind, Radix, icons and Next; server components may call `m()`, the formats
  and the status maps.
- `./next` is the only entry that needs `next`; `./notify-sonner` the only one that needs `sonner`.

## Host setup

1. `@import 'tailwindcss';`, then `theme.css` (when the host declares complete colours under the role names), then
   `components.css`.
2. Declare every colour and property of `tokens.json` on `:root`, and the themed ones under `.dark`.
3. Wrap the app in `AdminUiProvider` (a client component) with the host's adapters.
4. Run `node node_modules/@mgamadeus/ddd-admin-ui/scripts/check-tokens.mjs <built css…>` after a production build.

## Translations

- Texts of the package go through its store; the host feeds it (`setTranslations` or the provider's `translations`
  adapter).
- `i18n-keys.json` lists them for the host's translation export.
