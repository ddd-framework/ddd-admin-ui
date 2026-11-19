#!/usr/bin/env bash
# Installs a packed @mgamadeus/ddd-admin-ui tarball into fresh consumer projects and checks it as a host would.
#
#   tarball   check-package on the extracted tarball (rules 1–13, the strict consumer compile included)
#   plain     a project without the optional peers (next, sonner, tailwindcss):
#         the showcase renders (light, dark, every section, a host section), lists every exported component, skips the
#         lazily loaded ./notify-sonner section, and bundles for the browser (esbuild) without reaching an optional peer
#         links rendered by blocks go through AdminUiProvider.linkComponent and keep sticky parameters (withStickyParams)
#         the shell renders on the server from one navigation (sidebar, breadcrumbs, title) and never reaches ./shell-background
#         the optional props of 0.3.2 render on the server (options-render.mjs)
#         the optional props of 0.3.3 render on the server (options-033-render.mjs)
#         the optional props of 0.3.4 render on the server (options-034-render.mjs)
#         the optional props of 0.3.7 render on the server (options-037-render.mjs)
#         the optional props of 0.3.9 render on the server (options-039-render.mjs)
#         the agent attributes and list state of 0.3.10 render on the server (options-0310-render.mjs)
#         ./logic/pure loads from CommonJS through its require condition without any dependency (pure-require.cjs)
#     T4  Node imports of every entry but ./next and ./notify-sonner (those two fail on the missing peer) and a
#         strict tsc (skipLibCheck false) with moduleResolution bundler and nodenext
#     T3  (server render) bound fields from ./translations and ./media find the form of ./form
#     T6  one translation store across entries (./i18n sets the language, ./logic and ./list use it)
#         list tables, bodies and badges without the optional table props render as in 0.1.0-rc.2 (list-snapshot.html)
#         FormActions, FormSubmitButton, AddEntityButton, EntityListBulkBar and the headers without the props of
#         0.1.0-rc.6 render as in 0.1.0-rc.5 (form-actions-snapshot.html); WriteAccessProvider disables write controls
#         a status map's translation context reaches StatusBadge
#         the ./workers and ./translations screens render on the showcase's sample payloads (static apis); write access
#         disables restart, generation, toggles and imports; the entity translator and the content locales
#         the ./issues, ./database and ./crons screens render on their sample payloads; write access disables their
#         writes; the 403 of disabled schema writes and the 409 of a busy cron are shown
#     the shipped i18n manifest matches the installed package (ddd-admin-ui-i18n-manifest --check)
#   next      a Next 16 app router project with Tailwind 4:
#     T1  `next build`; the server page's metadata title is m('Users'), pure helpers render on the server
#     T5  the production CSS has the package's component rules and utilities; ddd-admin-ui-check-tokens passes on it
#         ddd-admin-ui-check-contrast passes on it without exceptions (the fixture sets the status text roles)
#     T5b ddd-admin-ui-check-tokens passes on a host whose colour properties hold channels (own binding, no theme.css)
#         (browser) the status text roles: StatusBadge text is the host's text role; with the roles unset (a scope with
#         `initial`) badge text, 15 % tint and callout icon compute exactly the values of 0.2.1
#         one Radix copy in the host (ddd-admin-ui-check-radix)
#     T2  (browser) a client page sets German translations: date, text and number are German after hydration,
#         without a hydration warning
#     T3  (browser) server violations on a translatable and a media field are named by the fields' labels (the label
#         registry of ./form is one context across ./form, ./translations and ./media)
#         (browser) Combobox: out-of-order server answers, picked label outside the results, reset on close, keyboard
#         through groups and the create row, clearing; SegmentedControl incl. a 358 px container; the showcase at 390 px (also with the CPU throttled 6x, resized
#         and loaded)
#         (browser) a list table with column tracks, pins, sort and a row index: tracks, the pin guard at three widths,
#         at 390 px the table scrolls inside its card and the page does not, the sort cycle, no hydration warning
#         (browser) FormDialog (Enter, pending, failed submit, a nested dialog, two forms), the ⌘S / Ctrl+S rule of
#         FormActions (focus nowhere, in another form, a disabled primary, a drawer footer, nested dialogs), header slots
#         (closest slot, form attribute, floating pill) and useConfirm (Escape, focus, queue, phrase, drawer, two
#         providers, Strict Mode, unmount)
#         (browser) date presets, bulk menus with a counted confirmation, a content-sized pinned actions column, the
#         segmented control's option height, translatable limits, the colour field, the route error, the side-by-side
#         drawer, ./markdown after hydration (sanitised, absent from pages that do not import it)
#         (browser) the ./workers and ./translations screens on RTK Query (app/screens, @reduxjs/toolkit and react-redux
#         added to the app): window switch, restart and its refetch, chart tooltip, tabs, the isActive toggle and its
#         refetches, the key drawer, the import from configuration, 390 px
#         (browser) the ./issues, ./database and ./crons screens on RTK Query (app/operations): filters, the drawer, a
#         typed-phrase confirmation, the 403 and 409 states, 390 px with a throttled CPU, no hydration warning
#         (browser) the shell: one navigation for sidebar, breadcrumbs and title, active entry, rights predicate,
#         collapse (button, `[`, stored and restored after hydration), rail flyout, mobile menu, folding breadcrumbs, RTL
#     T7  (browser) a select inside a dialog inside a sheet, and inside a host overlay at z-index 10000 with
#         --layer-popover: 10001, is clickable (with a negative control at the default layer)
#   link-skills  `ddd-admin-ui link-skills` links the shipped skill
#
# T8 / T9: DDD_WEB_VERSION (default: the latest 0.x from 0.13.0 on) and LUCIDE_VERSION (default: latest) choose the
# peer versions; CI runs once more with the floors (DDD_WEB_VERSION=0.13.0 LUCIDE_VERSION=0.550.0).
# SKIP_BROWSER=1 skips the browser checks (T2, T3, T7, list table). CHROME_PATH chooses the browser (default: the installed Google Chrome).
#
# Usage: test/consumer/run.sh <tarball> <npm|pnpm> <workDir>
set -euo pipefail

TARBALL=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
PM=$2
WORK=$3
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
DDD_WEB_SPEC="@mgamadeus/ddd-web@${DDD_WEB_VERSION:->=0.13.0 <1}"
LUCIDE_SPEC="lucide-react@${LUCIDE_VERSION:-latest}"

rm -rf "$WORK" && mkdir -p "$WORK/extracted"
WORK=$(cd "$WORK" && pwd)
case "$WORK/" in
  "$ROOT"/*) echo "workDir must be outside the repository: Node would resolve this repository's node_modules" >&2; exit 2 ;;
esac
tar -xzf "$TARBALL" -C "$WORK/extracted"
echo "── tarball: check-package"
node "$ROOT/scripts/check-package.mjs" --dir "$WORK/extracted/package" --modules "$ROOT/node_modules"

# A fresh project in $1 with the tarball and the given packages.
install_into() {
  local dir=$1
  shift
  mkdir -p "$dir"
  echo '{"name":"consumer","private":true,"type":"module"}' > "$dir/package.json"
  if [ "$PM" = pnpm ]; then
    # Freshly released packages of this framework may be younger than pnpm's minimum release age.
    # esbuild (the showcase bundle check) runs its install script; pnpm refuses unlisted build scripts.
    printf "minimumReleaseAgeExclude:\n  - '@mgamadeus/*'\nallowBuilds:\n  esbuild: true\n" > "$dir/pnpm-workspace.yaml"
    (cd "$dir" && pnpm add "$TARBALL" "$@")
  else
    (cd "$dir" && npm install --no-audit --no-fund "$TARBALL" "$@")
  fi
}

PEERS=("$DDD_WEB_SPEC" "$LUCIDE_SPEC" radix-ui react react-dom react-hook-form zod)
TYPES=("typescript@^6" @types/react @types/react-dom @types/node)

echo "── plain project ($PM, $DDD_WEB_SPEC, $LUCIDE_SPEC)"
PLAIN="$WORK/plain"
install_into "$PLAIN" "${PEERS[@]}" "${TYPES[@]}" esbuild
cp "$HERE/fixtures/plain/"* "$PLAIN/"
cd "$PLAIN"
node -e "for (const name of ['next','sonner','tailwindcss','recharts','@uiw/react-md-editor','rehype-sanitize']) { try { require.resolve(name); console.error(name + ' is installed'); process.exit(1); } catch {} }"
node -p "'installed: ddd-web ' + require('@mgamadeus/ddd-web/package.json').version + ', lucide-react ' + require('lucide-react/package.json').version"
echo "── T4 Node imports"
node smoke.mjs
echo "── ./logic/pure from CommonJS (require condition, no dependency loaded)"
node pure-require.cjs
for MODE in bundler nodenext; do
  if [ "$MODE" = bundler ]; then MODULE=esnext; else MODULE=nodenext; fi
  cat > "tsconfig.$MODE.json" <<JSON
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"], "module": "$MODULE", "moduleResolution": "$MODE",
    "jsx": "react-jsx", "strict": true, "noUncheckedIndexedAccess": true, "skipLibCheck": false, "noEmit": true,
    "types": ["node"]
  },
  "include": ["consumer.ts"]
}
JSON
  echo "── T4 strict tsc ($MODE)"
  ./node_modules/.bin/tsc -p "tsconfig.$MODE.json"
done
echo "── T3 bound fields across entries (server render)"
node form-fields.mjs
echo "── T6 one translation store"
node one-store.mjs
echo "── list tables without the optional props: same DOM as 0.1.0-rc.2"
node list-snapshot.mjs
echo "── form actions and write controls without the new props: same DOM as 0.1.0-rc.5"
node form-actions-snapshot.mjs
echo "── write access as a presentation aid"
node write-access.mjs
echo "── status map translation context"
node status-context.mjs
echo "── showcase without the optional peers: server render, coverage, lazy ./notify-sonner skipped, browser bundle"
node showcase-render.mjs
node showcase-build.mjs
echo "── links through the provider's link component keep sticky parameters"
node sticky-links.mjs
echo "── ./workers and ./translations screens on the static apis (server render, write access)"
node screens-render.mjs
echo "── ./issues, ./database and ./crons screens on the static apis (server render, write access, error states)"
node issues-render.mjs
node database-render.mjs
node crons-render.mjs
echo "── the screen options of 0.3.3 on the server: issues range and summary, schema diff guards, cron filters and times"
node screens-options-render.mjs
echo "── the shell on the server: one navigation for sidebar, breadcrumbs and title; rights predicate; no background reach"
node shell-render.mjs
echo "── the shell options of 0.3.3 on the server: display context, menus, top bar, breadcrumbs, background props"
node shell-options-render.mjs
echo "── the optional props of 0.3.2 on the server: language tabs, table, bulk bar, filter buttons, shell, segmented control"
node options-render.mjs
echo "── the optional props of 0.3.3 on the server: table surface, leading columns, edges, bulk labels, translatable counter"
node options-033-render.mjs
echo "── the optional props of 0.3.4 on the server: workers section state and runs cap, translations filters and slots, host tags"
node options-034-render.mjs
echo "── the optional props of 0.3.7 on the server: several languages, card sort, generation estimate, tags per operation, crons order, environment labels"
node options-037-render.mjs
echo "── the optional props of 0.3.9 on the server: table padding and looks, empty state, page flow, shell attributes and link props, breadcrumbs, account, background, language filter options, confirm routing, crons order"
node options-039-render.mjs
echo "── the additions of 0.3.10 on the server: row keys on rows and cards, agent secret and skip attributes, list state, navigation guard"
node options-0310-render.mjs
echo "── shipped i18n manifest"
if [ "$PM" = npm ]; then npx --no-install ddd-admin-ui-i18n-manifest --check; else pnpm exec ddd-admin-ui-i18n-manifest --check; fi

echo "── Next project ($PM)"
APP="$WORK/next-app"
install_into "$APP" "${PEERS[@]}" "${TYPES[@]}" "next@^16" sonner "tailwindcss@^4" "@tailwindcss/postcss@^4" tw-animate-css playwright-core \
  "@uiw/react-md-editor@^4.1.0" "rehype-sanitize@^6.0.0"
cp -R "$HERE/fixtures/next-app/." "$APP/"
cd "$APP"
echo "── screens: RTK Query for the ./workers and ./translations fixtures (app/screens)"
if [ "$PM" = pnpm ]; then pnpm add @reduxjs/toolkit react-redux; else npm install --no-audit --no-fund @reduxjs/toolkit react-redux; fi
echo "── T1 next build"
NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build
echo "── T1 / T5 build output"
node check-build.mjs
echo "── T5 check-tokens on the built CSS"
# every built stylesheet in one folder: the check reads them as one stylesheet
mkdir -p built-css && xargs -I{} cp {} built-css/ < built-css-files.txt
if [ "$PM" = npm ]; then npx --no-install ddd-admin-ui-check-tokens built-css; else pnpm exec ddd-admin-ui-check-tokens built-css; fi
echo "── T5b check-tokens on a host whose colour properties hold channels (own binding, no theme.css)"
node check-channel-host.mjs
if [ "$PM" = npm ]; then npx --no-install ddd-admin-ui-check-tokens channel-host/built.css; else pnpm exec ddd-admin-ui-check-tokens channel-host/built.css; fi
echo "── contrast of the declared pairs on the built CSS (fails on any miss not on an exception list)"
if [ "$PM" = npm ]; then npx --no-install ddd-admin-ui-check-contrast built-css; else pnpm exec ddd-admin-ui-check-contrast built-css; fi
echo "── one Radix copy"
if [ "$PM" = npm ]; then npx --no-install ddd-admin-ui-check-radix; else pnpm exec ddd-admin-ui-check-radix; fi

if [ "${SKIP_BROWSER:-}" = 1 ]; then
  echo "── T2 / T3 / T7 / list table skipped (SKIP_BROWSER=1)"
else
  PORT=$(node -e "const server = require('node:net').createServer().listen(0, () => { console.log(server.address().port); server.close(); })")
  NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next start -p "$PORT" > next-start.log 2>&1 &
  SERVER_PID=$!
  trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:$PORT/" > /dev/null; then break; fi
    sleep 0.5
  done
  echo "── T2 / T3 / T7 / list table headless browser"
  node browser.mjs "http://127.0.0.1:$PORT"
  echo "── form dialog, save shortcut, header slot, confirmations (headless browser)"
  node browser-dialogs.mjs "http://127.0.0.1:$PORT"
  echo "── date presets, bulk menus, sized actions, segmented options, limits, colour, route error, side-by-side drawer, ./markdown (headless browser)"
  node browser-blocks.mjs "http://127.0.0.1:$PORT"
  echo "── ./workers and ./translations screens on RTK Query (headless browser)"
  node browser-screens.mjs "http://127.0.0.1:$PORT"
  echo "── ./issues, ./database and ./crons screens on RTK Query (headless browser)"
  node browser-operations.mjs "http://127.0.0.1:$PORT"
  echo "── shell: sidebar, rail, shortcut, mobile menu, breadcrumbs, title, RTL (headless browser)"
  node browser-shell.mjs "http://127.0.0.1:$PORT"
  echo "── the options of 0.3.2: range selection, page-sticky header, dialog isolation and result (headless browser)"
  node browser-options.mjs "http://127.0.0.1:$PORT"
  echo "── the options of 0.3.3: overlay edge, Shift in the select cell, hover without an action, dialog presses and Enter, language texts (headless browser)"
  node browser-options-033.mjs "http://127.0.0.1:$PORT"
  echo "── the options of 0.3.7: several languages, card sort, generation estimate (headless browser)"
  node browser-options-037.mjs "http://127.0.0.1:$PORT"
  echo "── the options of 0.3.9: select-all cell, track selection cell, group row hover, mobile menu description, avatar fallback, reselect, rich confirmation, estimate probe (headless browser)"
  node browser-options-039.mjs "http://127.0.0.1:$PORT"
  kill $SERVER_PID 2>/dev/null || true
fi

echo "── link-skills"
if [ "$PM" = npm ]; then npx --no-install ddd-admin-ui link-skills; else pnpm exec ddd-admin-ui link-skills; fi
test -f .claude/skills/ddd-admin-ui-specialist/SKILL.md
echo "consumer check ($PM) passed"
