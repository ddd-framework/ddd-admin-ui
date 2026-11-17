// The showcase builds into a browser bundle in a consumer without the optional peers (next, sonner, tailwindcss):
// nothing it imports reaches them.
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['showcase-entry.mjs'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: 'showcase-bundle/showcase.js',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'error',
  metafile: true,
});
const inputs = Object.keys(result.metafile.inputs);
const reached = ['next/', 'sonner/', 'tailwindcss/', '@uiw/', 'rehype-sanitize/'].filter((peer) => inputs.some((input) => input.includes(`node_modules/${peer}`)));
const showcaseFiles = inputs.filter((input) => input.includes('ddd-admin-ui/dist/showcase/')).length;
console.log(`${reached.length === 0 && showcaseFiles > 0 ? 'ok     ' : 'FAILED '} showcase bundles without optional peers (${inputs.length} inputs, ${showcaseFiles} showcase files${reached.length ? `, reached ${reached.join(', ')}` : ''})`);
if (reached.length > 0 || showcaseFiles === 0) process.exit(1);
