// T1 and T5, after `next build`: the prerendered server page has the translated title and the pure helpers' output;
// the production CSS contains the package's component rules and utilities only the package's files name.
import * as fs from 'node:fs';
import * as path from 'node:path';

const listFiles = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? listFiles(full) : [full];
      })
    : [];

let failed = false;
const report = (label, passed, detail = '') => {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failed = true;
};

// T1
const htmlFile = listFiles(path.join('.next', 'server', 'app')).find((file) => /[\\/]index\.html$/.test(file));
const html = htmlFile ? fs.readFileSync(htmlFile, 'utf-8') : '';
report('T1 prerendered / exists', Boolean(htmlFile), htmlFile ?? 'no .next/server/app/index.html');
report('T1 <title> is m(\'Users\')', /<title>Users<\/title>/.test(html), html.match(/<title>[^<]*<\/title>/)?.[0] ?? 'no title');
report('T1 formatDateTime on the server', /03\/04\/2026, 10:05\s?AM/.test(html));
report('T1 defineStatusMap on the server', html.includes('>Active<'));

// T5
const cssFiles = listFiles(path.join('.next', 'static')).filter((file) => file.endsWith('.css'));
const css = cssFiles.map((file) => fs.readFileSync(file, 'utf-8')).join('\n');
report('T5 built CSS found', cssFiles.length > 0, `${cssFiles.length} file(s)`);
const expectations = [
  ['component rule .surface (components.css)', /\.surface\s*\{/],
  ['@utility text-title-page (components.css)', /\.text-title-page\s*\{/],
  ['form > [data-form-actions] (components.css)', /form\s*>\s*\[data-form-actions\]\s*\{/],
  ['layer defaults (components.css)', /--layer-popover\s*:\s*50/],
  ['utility named only in the package: md:h-[calc(100dvh_-_var(--nav-h))]', /\.md\\:h-\\\[calc\\\(100dvh_-_var\\\(--nav-h\\\)\\\)\\\]/],
  ['layer utility z-(--layer-popover)', /\.z-\\\(--layer-popover\\\)/],
  ['theme colour utility bg-popover (theme.css)', /\.bg-popover\s*\{/],
];
for (const [label, pattern] of expectations) report(`T5 ${label}`, pattern.test(css));

// the fixture's own source must not name the package-only classes, or T5 would prove nothing
const ownSource = listFiles('app').map((file) => fs.readFileSync(file, 'utf-8')).join('\n');
report('T5 fixture source does not name the package-only classes', !/text-title-page|100dvh|layer-popover\)/.test(ownSource));

fs.writeFileSync('built-css-files.txt', cssFiles.join('\n'));
if (failed) process.exit(1);
