// T5b, a host whose colour properties hold HSL channels (`--card: 0 0% 100%`) and that binds the colour roles itself
// instead of importing theme.css (`--color-card: hsl(var(--card))`), soft surfaces and text roles included. Its
// stylesheet is derived from app/globals.css (same roles, hex colours turned into channels), built with Tailwind and
// components.css into channel-host/built.css; run.sh then runs ddd-admin-ui-check-tokens on it. A package rule that
// reads a colour role bare (`var(--success-soft)`) instead of through the binding fails that check here.
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

// the host's own binding: channel roles through hsl(), the others (rgb with alpha) as they are
const binding = roles
  .filter(role => !role.endsWith('-text'))
  .map(role => `  --color-${role}: ${channelRoles.has(role) ? `hsl(var(--${role}))` : `var(--${role})`};`);
for (const status of ['success', 'warning', 'destructive', 'info']) binding.push(`  --text-color-${status}: hsl(var(--${status}-text, var(--${status})));`);

const source = `@import 'tailwindcss';
@import '@mgamadeus/ddd-admin-ui/components.css';
@custom-variant dark (&:is(.dark *));
@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
${binding.join('\n')}
  --shadow-surface-raised: var(--surface-shadow-raised);
}
${blocks.join('\n')}
`;

fs.mkdirSync('channel-host', { recursive: true });
const from = path.resolve('channel-host', 'host.css');
fs.writeFileSync(from, source);
const result = await postcss([tailwindPostcss()]).process(source, { from, to: path.resolve('channel-host', 'built.css') });
fs.writeFileSync(path.join('channel-host', 'built.css'), result.css);
const badgeRule = result.css.match(/\[data-slot=['"]?badge['"]?\]\[data-tone=['"]?success['"]?\]\s*\{[^}]*\}/)?.[0] ?? '';
console.log(`ok      T5b channel host built (${channelRoles.size} channel roles); success badge: ${badgeRule.replace(/\s+/g, ' ') || 'rule not found'}`);
if (!badgeRule) process.exit(1);
