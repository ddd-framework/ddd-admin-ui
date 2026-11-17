#!/usr/bin/env node
// Checks the contrast of the colour pairs that tokens.json declares (`contrast.pairs`: a text or UI role on a
// background role) in a host's built stylesheet, light (`:root`) and dark (`.dark`), against WCAG 2.x: 4.5:1 for text,
// 3:1 for large text and UI parts (the pair's `minimum`). A pair below its minimum fails unless `contrast.exceptions`
// lists it (for that theme or for both) with a reason.
//
// Values: the role property `--<role>` (or Tailwind's `--color-<role>`) of the scope, `var()` references resolved in the
// same scope (the dark scope falls back to `:root`). Understood: hex, rgb()/rgba(), hsl()/hsla(), hwb(), oklab(),
// oklch(), `transparent`, `white`, `black`, and channel triplets (`0 0% 100%`) when the stylesheet reads the role inside
// a channel function (`hsl(var(--card))`, `rgb(…)`, `oklch(…)`). Anything else (named colours, color-mix(), lab(),
// lch(), color(), light-dark(), calc()) is reported as "cannot evaluate" and counts as a failure, never as a pass;
// `--allow-unevaluated` turns those into warnings.
//
// A background may name an alpha (`"success/15"`): the role at that alpha over `base` (default `card`), as the status
// badges draw it. A translucent foreground is composited over the background; a translucent background over the
// theme's `background` role.
//
// Usage: node check-contrast.mjs <built.css | directory of .css files> [tokens.json] [--allow-unevaluated]
// Exit 0 when every declared pair passes (or is excepted); 1 with one line per failing pair; 2 on bad arguments.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const allowUnevaluated = args.includes('--allow-unevaluated');
const [cssArg, tokensArg] = args.filter(arg => !arg.startsWith('--'));
if (!cssArg) {
  console.error('usage: node check-contrast.mjs <built.css | directory of .css files> [tokens.json] [--allow-unevaluated]');
  process.exit(2);
}
const tokensPath = resolve(tokensArg ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'tokens.json'));
const cssPath = resolve(cssArg);
if (!existsSync(cssPath) || !existsSync(tokensPath)) {
  console.error(`not found: ${existsSync(cssPath) ? tokensPath : cssPath}`);
  process.exit(2);
}
const tokens = JSON.parse(readFileSync(tokensPath, 'utf8'));
const pairs = tokens.contrast?.pairs ?? [];
const exceptions = tokens.contrast?.exceptions ?? [];
if (pairs.length === 0) {
  console.error(`no contrast.pairs in ${tokensPath}`);
  process.exit(2);
}

const cssFiles = statSync(cssPath).isDirectory()
  ? readdirSync(cssPath)
      .filter(name => name.endsWith('.css'))
      .map(name => join(cssPath, name))
  : [cssPath];

/** Style rules as `{ selector, declarations: Map<property, value> }`, at any nesting depth (as in check-tokens). */
const parseRules = source => {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const stack = [];
  let buffer = '';
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      buffer += char;
      if (char === '\\') {
        buffer += text[index + 1] ?? '';
        index += 1;
      } else if (char === quote) quote = null;
      continue;
    }
    if (char === '\\') {
      buffer += char + (text[index + 1] ?? '');
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === '{') {
      const prelude = buffer.trim();
      buffer = '';
      const rule = prelude.startsWith('@') ? null : { selector: prelude, declarations: new Map() };
      if (rule) rules.push(rule);
      stack.push(rule);
      continue;
    }
    if (char === ';' || char === '}') {
      const current = stack[stack.length - 1];
      const chunk = buffer.trim();
      buffer = '';
      if (current && chunk.includes(':')) {
        const colon = chunk.indexOf(':');
        current.declarations.set(chunk.slice(0, colon).trim(), chunk.slice(colon + 1).trim());
      }
      if (char === '}') stack.pop();
      continue;
    }
    buffer += char;
  }
  return rules;
};

const rules = cssFiles.flatMap(file => parseRules(readFileSync(file, 'utf8')));
const selectorParts = rule => rule.selector.split(',').map(part => part.trim());
const isRootSelector = part => /^(:root|html|:host|:where\(:root\))$/.test(part);
const isDarkSelector = part => /^(:root|html)?\.dark$/.test(part);

/** Custom properties per scope; the later declaration wins, as in the cascade of equal specificity. */
const scopeOf = predicate => {
  const scope = new Map();
  for (const rule of rules) {
    if (!selectorParts(rule).some(predicate)) continue;
    for (const [property, value] of rule.declarations) {
      if (property.startsWith('--')) scope.set(property, value.replace(/\s*!important\s*$/, '').trim());
    }
  }
  return scope;
};
const rootScope = scopeOf(isRootSelector);
const darkOwn = scopeOf(isDarkSelector);
const darkScope = new Map([...rootScope, ...darkOwn]);

/** How the stylesheet reads a role's channels when it holds a triplet: the channel function around `var(--role)`. */
const channelFunctionOf = property => {
  const pattern = new RegExp(`\\b(rgba?|hsla?|hwb|oklab|oklch)\\(\\s*var\\(\\s*${property.replace(/[-]/g, '\\-')}\\s*[,)]`, 'i');
  for (const rule of rules) for (const value of rule.declarations.values()) {
    const match = pattern.exec(value);
    if (match) return match[1].toLowerCase().replace(/a$/, '');
  }
  return null;
};

/** `var(--x)` / `var(--x, fallback)` replaced by the scope's values (depth-limited). */
const substitute = (value, scope, depth = 0) => {
  if (depth > 10 || !value.includes('var(')) return value;
  const replaced = value.replace(/var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^()]*(?:\([^()]*\)[^()]*)*))?\)/g, (whole, name, fallback) => {
    if (scope.has(name)) return scope.get(name);
    return fallback !== undefined ? fallback : whole;
  });
  return replaced === value ? value : substitute(replaced, scope, depth + 1);
};

const number = (text, scale = 1) => {
  const trimmed = text.trim();
  if (trimmed === 'none') return 0;
  if (trimmed.endsWith('%')) return (Number.parseFloat(trimmed) / 100) * scale;
  const value = Number.parseFloat(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
};
const angle = text => {
  const trimmed = text.trim();
  const value = Number.parseFloat(trimmed);
  if (trimmed.endsWith('turn')) return value * 360;
  if (trimmed.endsWith('grad')) return value * 0.9;
  if (trimmed.endsWith('rad')) return (value * 180) / Math.PI;
  return value;
};
/** Arguments of a colour function: channels and an optional alpha (space or comma syntax). */
const splitArgs = inner => {
  const [main, alphaPart] = inner.includes('/') ? inner.split('/') : [inner, undefined];
  const parts = main.trim().split(/\s*,\s*|\s+/).filter(Boolean);
  let alpha = alphaPart !== undefined ? number(alphaPart, 1) : 1;
  if (alphaPart === undefined && parts.length === 4) alpha = number(parts.pop(), 1);
  return { parts, alpha };
};

const hslToRgb = (h, s, l) => {
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)];
};
const oklabToRgb = (L, a, b) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  // linear sRGB → gamma-encoded sRGB, clamped into the gamut
  return linear.map(channel => {
    const clamped = Math.min(1, Math.max(0, channel));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  });
};

/** A colour as `{ rgb: [0..1 ×3], alpha }`, or `null` when it cannot be evaluated. */
const parseColour = (raw, channelFunction) => {
  const value = raw.trim().toLowerCase();
  if (value === 'transparent') return { rgb: [0, 0, 0], alpha: 0 };
  if (value === 'white') return { rgb: [1, 1, 1], alpha: 1 };
  if (value === 'black') return { rgb: [0, 0, 0], alpha: 1 };
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value);
  if (hex) {
    let digits = hex[1];
    if (digits.length <= 4) digits = [...digits].map(digit => digit + digit).join('');
    const channels = digits.match(/../g).map(pair => Number.parseInt(pair, 16) / 255);
    return { rgb: channels.slice(0, 3), alpha: channels[3] ?? 1 };
  }
  let fn;
  let inner;
  const call = /^([a-z]+)\((.*)\)$/.exec(value);
  if (call) {
    fn = call[1].replace(/a$/, '');
    inner = call[2];
  } else if (
    channelFunction &&
    /^(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:%|deg|rad|grad|turn)?|none)(?:\s*[\s,/]\s*(?:[+-]?(?:\d+\.?\d*|\.\d+)(?:%|deg|rad|grad|turn)?|none))*$/.test(value)
  ) {
    fn = channelFunction;
    inner = value;
  } else return null;
  if (inner.includes('(')) return null; // calc(), nested var() left unresolved, …
  const { parts, alpha } = splitArgs(inner);
  if (parts.length !== 3 || Number.isNaN(alpha)) return null;
  let rgb;
  if (fn === 'rgb') rgb = parts.map(part => number(part, 255) / 255);
  else if (fn === 'hsl') rgb = hslToRgb(angle(parts[0]), number(parts[1].endsWith('%') ? parts[1] : `${parts[1]}%`), number(parts[2].endsWith('%') ? parts[2] : `${parts[2]}%`));
  else if (fn === 'hwb') {
    const white = number(parts[1].endsWith('%') ? parts[1] : `${parts[1]}%`);
    const black = number(parts[2].endsWith('%') ? parts[2] : `${parts[2]}%`);
    const base = hslToRgb(angle(parts[0]), 1, 0.5);
    rgb = white + black >= 1 ? [white / (white + black), white / (white + black), white / (white + black)] : base.map(channel => channel * (1 - white - black) + white);
  } else if (fn === 'oklab') rgb = oklabToRgb(number(parts[0]), number(parts[1], 0.4), number(parts[2], 0.4));
  else if (fn === 'oklch') {
    const hue = (angle(parts[2]) * Math.PI) / 180;
    const chroma = number(parts[1], 0.4);
    rgb = oklabToRgb(number(parts[0]), chroma * Math.cos(hue), chroma * Math.sin(hue));
  } else return null;
  if (rgb.some(channel => Number.isNaN(channel))) return null;
  return { rgb: rgb.map(channel => Math.min(1, Math.max(0, channel))), alpha: Math.min(1, Math.max(0, alpha)) };
};

const over = (top, bottom) => ({
  rgb: top.rgb.map((channel, index) => channel * top.alpha + bottom.rgb[index] * (1 - top.alpha)),
  alpha: 1,
});
const luminance = ({ rgb }) => {
  const [r, g, b] = rgb.map(channel => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratioOf = (a, b) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** A role's colour in a scope: `{ colour }` or `{ problem }`. */
const roleColour = (role, scope) => {
  const property = scope.has(`--${role}`) ? `--${role}` : scope.has(`--color-${role}`) ? `--color-${role}` : null;
  if (!property) return { problem: `--${role} not declared` };
  const resolved = substitute(scope.get(property), scope);
  const colour = parseColour(resolved, channelFunctionOf(`--${role}`) ?? channelFunctionOf(`--color-${role}`));
  return colour ? { colour } : { problem: `${property}: cannot evaluate "${resolved}"` };
};

/** `"success/15"` → the role at 15 % alpha. */
const parseRef = ref => {
  const [role, alpha] = ref.split('/');
  return { role, alpha: alpha === undefined ? 1 : Number(alpha) / 100 };
};

const themes = [{ name: 'light', scope: rootScope }];
if (darkOwn.size > 0) themes.push({ name: 'dark', scope: darkScope });

const exceptionFor = (pair, theme) =>
  exceptions.find(
    item => item.foreground === pair.foreground && item.background === pair.background && (!item.theme || item.theme === theme)
  );

let failed = 0;
let unevaluated = 0;
for (const theme of themes) {
  console.log(`${theme.name}:`);
  const page = roleColour('background', theme.scope).colour ?? { rgb: [1, 1, 1], alpha: 1 };
  for (const pair of pairs) {
    const label = `${pair.foreground} on ${pair.background}${pair.base ? ` over ${pair.base}` : ''}`;
    const minimum = pair.minimum ?? 4.5;
    const fgRef = parseRef(pair.foreground);
    const bgRef = parseRef(pair.background);
    const fg = roleColour(fgRef.role, theme.scope);
    const bg = roleColour(bgRef.role, theme.scope);
    const base = bgRef.alpha < 1 ? roleColour(pair.base ?? 'card', theme.scope) : { colour: page };
    const problem = fg.problem ?? bg.problem ?? base.problem;
    if (problem) {
      unevaluated += 1;
      console.log(`  ${allowUnevaluated ? 'warn  ' : 'FAILED'} ${label}: ${problem}`);
      continue;
    }
    const baseColour = base.colour.alpha < 1 ? over(base.colour, page) : base.colour;
    const background = over({ rgb: bg.colour.rgb, alpha: bg.colour.alpha * bgRef.alpha }, baseColour);
    const foreground = over({ rgb: fg.colour.rgb, alpha: fg.colour.alpha * fgRef.alpha }, background);
    const ratio = ratioOf(foreground, background);
    const passes = ratio + 1e-9 >= minimum;
    const exception = passes ? undefined : exceptionFor(pair, theme.name);
    const status = passes ? 'ok    ' : exception ? 'except' : 'FAILED';
    if (!passes && !exception) failed += 1;
    console.log(
      `  ${status} ${label}: ${ratio.toFixed(2)}:1 (needs ${minimum}:1${pair.use ? `, ${pair.use}` : ''})${exception ? ` — ${exception.reason}` : ''}`
    );
  }
}
if (darkOwn.size === 0) console.log('dark: no .dark declarations; only the light theme was checked');

const blocking = failed + (allowUnevaluated ? 0 : unevaluated);
if (blocking > 0) {
  console.log(`check-contrast: ${failed} pair(s) below their minimum, ${unevaluated} not evaluated (${pairs.length} pairs, ${themes.length} theme(s))`);
  process.exit(1);
}
console.log(`check-contrast: ok (${pairs.length} pairs, ${themes.length} theme(s)${unevaluated ? `, ${unevaluated} not evaluated` : ''})`);
