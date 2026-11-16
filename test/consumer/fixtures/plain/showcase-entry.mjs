// Bundled by showcase-build.mjs: a browser entry that mounts the showcase in a host without next and sonner.
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminUiProvider } from '@mgamadeus/ddd-admin-ui/provider';
import { Showcase } from '@mgamadeus/ddd-admin-ui/showcase';

createRoot(document.getElementById('root')).render(h(AdminUiProvider, null, h(Showcase)));
