// The ./files manager (server render) on the sample payloads of ./showcase through the static adapter: folders before
// files, the table's columns follow the capabilities (links only with `links`, the trash node only with `trash`), the
// scan badge of a file being checked, the working-copy badge, the quota pill, and WriteAccessProvider disables the
// upload with its reason.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticFileManagerAdapter, FileManager, FilePreview, ImagePreview } from '@mgamadeus/ddd-admin-ui/files';
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

// A vector file (SVG): the picture of the server's sanitised copy is an <img> and nothing else; without that copy the
// file has no preview and the release gate is not asked at all.
const pictureUrl = 'https://files.example/content/sanitised-copy-token';
const vectorPicture = render(h(ImagePreview, { url: pictureUrl, alt: 'Preview of logo.svg', layout: 'canvas', scalable: true }));
const vectorFile = {
  id: 7, areaKey: 'marketing', folderId: null, name: 'logo.svg', extension: 'svg', family: 'VECTOR', mimeType: 'image/svg+xml', sizeBytes: 900, scanStatus: 'CLEAN',
};
const gateCalls = [];
const gate = (fileId, options) => {
  gateCalls.push(options);
  return Promise.resolve({ url: pictureUrl, fileName: 'logo.svg' });
};
const vectorWithoutCopy = render(h(FilePreview, { file: vectorFile, getDownload: gate }));
const vectorWithCopy = render(h(FilePreview, { file: { ...vectorFile, hasSanitizedImage: true }, getDownload: gate, layout: 'canvas' }));
checks.push(['files: a vector picture is one <img> of the given URL', (vectorPicture.match(/<img\b/g) ?? []).length === 1 && vectorPicture.includes(`src="${pictureUrl}"`)]);
// the URL is named by the <img> and by React's image preload of it, and by nothing that could open it as a document
const urlCarriers = [...vectorPicture.matchAll(/<([a-zA-Z]+)\b[^>]*https:\/\/files\.example[^>]*>/g)].map(match => match[0]);
checks.push([
  'files: a vector picture is no document element',
  !/<(object|iframe|embed|frame|foreignObject|use)\b/i.test(vectorPicture) &&
    urlCarriers.length >= 1 &&
    urlCarriers.every(tag => tag.startsWith('<img ') || (tag.startsWith('<link ') && tag.includes('as="image"'))),
]);
checks.push(['files: a vector picture has the zoom buttons', vectorPicture.includes('Zoom in') && vectorPicture.includes('Fit to the view')]);
checks.push(['files: a vector file without a sanitised copy has no preview', vectorWithoutCopy.includes('SVG graphic files have no preview here') && !/<img\b/.test(vectorWithoutCopy)]);
checks.push(['files: the server render of a vector file shows nothing of the file', !/<(img|object|iframe|embed)\b/i.test(vectorWithCopy) && !vectorWithCopy.includes(pictureUrl)]);
checks.push(['files: no preview asks the release gate before the browser runs', gateCalls.length === 0]);

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'ok     ' : 'FAILED '} ${label}`);
  if (!passed) failed = true;
}
if (failed) process.exit(1);
