// The ./files manager (server render) on the sample payloads of ./showcase through the static adapter: folders before
// files, the table's columns follow the capabilities (links only with `links`, the trash node only with `trash`), the
// scan badge of a file being checked, the working-copy badge, the quota pill, and WriteAccessProvider disables the
// upload with its reason.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticFileManagerAdapter, FileManager } from '@mgamadeus/ddd-admin-ui/files';
import { WriteAccessProvider } from '@mgamadeus/ddd-admin-ui/logic';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { showcaseFilesData } from '@mgamadeus/ddd-admin-ui/showcase';

const areas = [{ key: 'marketing', name: 'Marketing' }];
const render = (element, writeAccess) =>
  renderToStaticMarkup(h(AdminUiProvider, null, writeAccess ? h(WriteAccessProvider, { value: writeAccess }, element) : element));
const full = createStaticFileManagerAdapter(showcaseFilesData);
const bare = createStaticFileManagerAdapter({ ...showcaseFilesData, capabilities: {} });
const screen = render(h(FileManager, { adapter: full, areas, variant: 'embedded', defaultView: 'table' }));
const plain = render(h(FileManager, { adapter: bare, areas, variant: 'embedded', defaultView: 'table' }));
const readOnly = render(h(FileManager, { adapter: full, areas, variant: 'embedded' }), { allowed: false, reason: 'Read-only workspace' });
const uploadButton = html => [...html.matchAll(/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*?Upload files(?:(?!<\/button>)[\s\S])*?<\/button>/g)].map(match => match[0])[0] ?? '';

const checks = [
  ['files: folders and files of the root', screen.includes('>Brand<') && screen.includes('>Reports<') && screen.includes('Budget 2026.xlsx')],
  ['files: folders before files', screen.indexOf('>Brand<') < screen.indexOf('Budget 2026.xlsx')],
  ['files: the links column and chips with the links capability', screen.includes('Spring launch')],
  ['files: no links column without it', !plain.includes('Spring launch')],
  ['files: the trash node with the trash capability', screen.includes('>Trash<')],
  ['files: no trash node without it', !plain.includes('>Trash<')],
  ['files: a file being checked shows its scan badge', screen.includes('Being checked')],
  ['files: the working-copy badge only with its capability', !screen.includes('Unsaved changes') && !plain.includes('Unsaved changes')],
  ['files: the quota pill', screen.includes('of') && screen.includes('5 GB')],
  ['files: the upload button', uploadButton(screen) !== '' && !/ disabled=""/.test(uploadButton(screen))],
  ['files: write access disables the upload', / disabled=""/.test(uploadButton(readOnly))],
];
const withWorkingCopy = render(
  h(FileManager, {
    adapter: createStaticFileManagerAdapter({ ...showcaseFilesData, capabilities: { workingCopy: { label: 'Unsaved changes' } } }),
    areas,
    variant: 'embedded',
    defaultView: 'table',
  })
);
checks.push(['files: the working-copy badge with its capability', withWorkingCopy.includes('Unsaved changes')]);
const grid = render(h(FileManager, { adapter: full, areas, variant: 'embedded', defaultView: 'grid' }));
checks.push(['files: file and folder cards carry their row key', (grid.match(/data-row-key="/g) ?? []).length >= 2]);
checks.push(['files: the folder bar sticks below the host top bar', screen.includes('sticky top-[var(--nav-h)]')]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
