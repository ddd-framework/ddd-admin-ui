// T5b, a host whose colour properties hold HSL channels (`--card: 0 0% 100%`) and that binds the colour roles itself
// instead of importing theme.css (`card: 'hsl(var(--card))'` in a JS config), soft surfaces and text roles included. Its
// stylesheet is derived from app/globals.css (same roles, hex colours turned into channels), built with Tailwind and
// components.css into channel-host/built.css; run.sh then runs ddd-admin-ui-check-tokens on it. A package rule that
// reads a colour role bare (`var(--success-soft)`) instead of through the binding fails that check here; a package
// class that reads a theme colour as a bare custom property (never defined by a JS config) fails below.
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';

const require = createRequire(path.resolve('package.json'));
const tailwindPostcss = require('@tailwindcss/postcss');
const postcss = createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const tokens = JSON.parse(fs.readFileSync(require.resolve('@mgamadeus/ddd-admin-ui/tokens.json'), 'utf8'));

const toChannels = hex => {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  hue = Math.round(((hue * 60) + 360) % 360);
  return `${hue} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
};

const globals = fs.readFileSync(path.join('app', 'globals.css'), 'utf8');
const roles = Object.keys(tokens.colors);
const channelRoles = new Set();
// the custom properties: hex colour roles become channels; the soft roles are declared as channels too
const blocks = [...globals.matchAll(/(:root|\.dark)\s*\{([^}]*)\}/g)].map(([, selector, body]) => {
  const declarations = body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--([a-z-]+):\s*(#[0-9a-f]{6});/g, (all, name, hex) => {
      if (!roles.includes(name)) return all;
      channelRoles.add(name);
      return `--${name}: ${toChannels(hex)};`;
    })
    .replace(/--([a-z-]+)-text:\s*var\(--([a-z-]+)\);/g, '--$1-text: var(--$2);');
  const soft = selector === ':root'
    ? '--success-soft: 101 82% 87%; --warning-soft: 48 96% 89%; --destructive-soft: 0 93% 94%; --info-soft: 204 94% 94%;'
    : '--success-soft: 142 60% 18%; --warning-soft: 38 70% 20%; --destructive-soft: 0 60% 22%; --info-soft: 204 70% 20%;';
  return `${selector} {${declarations}\n  ${soft}\n}`;
});
for (const status of ['success', 'warning', 'destructive', 'info']) channelRoles.add(`${status}-soft`);

// the host's own binding, in a JS config (`@config`, like a host that kept its Tailwind 3 config): channel roles
// through hsl(), the others (rgb with alpha) as they are; a JS config defines no `--color-*` properties
const colors = Object.fromEntries(
  roles.filter(role => !role.endsWith('-text')).map(role => [role, channelRoles.has(role) ? `hsl(var(--${role}))` : `var(--${role})`]),
);
const textColor = Object.fromEntries(
  ['success', 'warning', 'destructive', 'info'].map(status => [status, `hsl(var(--${status}-text, var(--${status})))`]),
);
const config = {
  theme: {
    extend: {
      colors,
      textColor,
      borderRadius: { sm: 'calc(var(--radius) - 4px)', md: 'calc(var(--radius) - 2px)', lg: 'var(--radius)', xl: 'calc(var(--radius) + 4px)' },
      boxShadow: { 'surface-raised': 'var(--surface-shadow-raised)' },
    },
  },
};

const source = `@import 'tailwindcss';
@import '@mgamadeus/ddd-admin-ui/components.css';
@config './tailwind.config.mjs';
@custom-variant dark (&:is(.dark *));
${blocks.join('\n')}
`;

fs.mkdirSync('channel-host', { recursive: true });
fs.writeFileSync(path.join('channel-host', 'tailwind.config.mjs'), `export default ${JSON.stringify(config, null, 2)};\n`);
const from = path.resolve('channel-host', 'host.css');
fs.writeFileSync(from, source);
const result = await postcss([tailwindPostcss()]).process(source, { from, to: path.resolve('channel-host', 'built.css') });
fs.writeFileSync(path.join('channel-host', 'built.css'), result.css);
const badgeRule = result.css.match(/\[data-slot=['"]?badge['"]?\]\[data-tone=['"]?success['"]?\]\s*\{[^}]*\}/)?.[0] ?? '';
console.log(`ok      T5b channel host built (${channelRoles.size} channel roles); success badge: ${badgeRule.replace(/\s+/g, ' ') || 'rule not found'}`);
if (!badgeRule) process.exit(1);
// a package class that reads a theme colour as a bare custom property works only on a host that emits `--color-*`
// properties; this host binds in a JS config, so every `var(--color-x)` must have a `--color-x:` definition
const undefinedThemeReads = [...new Set([...result.css.matchAll(/var\((--color-[a-z0-9-]+)/g)].map(match => match[1]))]
  .filter(name => !new RegExp(`${name}\\s*:`).test(result.css));
console.log(`${undefinedThemeReads.length === 0 ? 'ok     ' : 'FAILED '} T5b no bare read of an undefined theme colour${undefinedThemeReads.length ? ` — ${undefinedThemeReads.join(', ')}` : ''}`);
if (undefinedThemeReads.length > 0) process.exit(1);
