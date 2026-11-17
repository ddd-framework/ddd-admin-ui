// The showcase in a consumer: it renders on the server (light and dark, every section, a host section appended), its
// coverage list matches the entries' exports, and the ./notify-sonner section loads lazily through the host's loader —
// skipped where the optional peer sonner is missing (the plain consumer), drawn where it is installed (the repository).
import { createRequire } from 'node:module';
import { createElement as h } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { SHOWCASE_COVERAGE, Showcase } from '@mgamadeus/ddd-admin-ui/showcase';

const require = createRequire(import.meta.url);
const hasSonner = (() => {
  try {
    require.resolve('sonner');
    return true;
  } catch {
    return false;
  }
})();

const element = h(
  AdminUiProvider,
  null,
  h(Showcase, {
    loadNotifySonner: () => import('@mgamadeus/ddd-admin-ui/notify-sonner'),
    sections: [{ id: 'host', title: 'Host blocks', content: h('p', { id: 'host-block' }, 'A host block') }],
  }),
);
const { prelude } = await prerenderToNodeStream(element);
let html = '';
for await (const chunk of prelude) html += chunk;

const SECTIONS = ['primitives', 'list', 'page', 'form', 'translations', 'markdown', 'media', 'workers', 'glass', 'data', 'shell', 'notify-sonner', 'next', 'host'];
const checks = [
  ['renders a light and a dark pane', html.includes('data-showcase-theme="light"') && html.includes('data-showcase-theme="dark"')],
  ['the dark pane carries the .dark class', /data-showcase-theme="dark" class="[^"]*\bdark\b/.test(html)],
  ...SECTIONS.map((id) => [`section ${id} in both themes`, html.includes(`id="showcase-${id}-light"`) && html.includes(`id="showcase-${id}-dark"`)]),
  ['the host section is appended after the package sections', html.indexOf('id="showcase-host-light"') > html.indexOf('id="showcase-next-light"')],
  ['the segmented control renders as a radio group', html.includes('role="radiogroup"') && html.includes('role="radio"')],
  hasSonner
    ? ['./notify-sonner loaded lazily (sonner installed)', html.includes('data-showcase-loaded="notify-sonner"')]
    : ['./notify-sonner skipped lazily (sonner missing)', html.includes('data-showcase-skipped="sonner"') && !html.includes('data-showcase-loaded')],
];

// coverage: every exported component is drawn or has a reason; every listed name exists
const isComponentLike = (name, value) =>
  /^[A-Z][a-z]/.test(name) && (typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value));
const coverageProblems = [];
for (const [entry, coverage] of Object.entries(SHOWCASE_COVERAGE)) {
  let module;
  try {
    module = await import(`@mgamadeus/ddd-admin-ui/${entry}`);
  } catch {
    continue; // an entry with a missing optional peer (./notify-sonner in the plain consumer)
  }
  const exported = Object.entries(module).filter(([name, value]) => isComponentLike(name, value)).map(([name]) => name);
  const listed = new Set([...coverage.shown, ...Object.keys(coverage.notShown)]);
  for (const name of exported) if (!listed.has(name)) coverageProblems.push(`./${entry} ${name}: neither shown nor explained`);
  for (const name of listed) if (!(name in module)) coverageProblems.push(`./${entry} ${name}: listed but not exported`);
}
checks.push(['coverage list matches the exports', coverageProblems.length === 0, coverageProblems.join('; ')]);

let failed = false;
for (const [label, passed, detail] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail && !passed ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
