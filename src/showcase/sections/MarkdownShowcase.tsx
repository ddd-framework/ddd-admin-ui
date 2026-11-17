'use client';

import { type ComponentType, Suspense, use, useState } from 'react';

import { Label, Skeleton } from '../../primitives/index.ts';

/** What the showcase needs of `./markdown` (structural, so the showcase never reaches the optional peers). */
export interface MarkdownModule {
  MarkdownEditor: ComponentType<{ id?: string; value: string; onChange: (value: string) => void; height?: number }>;
  MarkdownPreview: ComponentType<{ source: string; className?: string }>;
}

/** Imports `./markdown`; passed by a host that has the peers: `() => import('@mgamadeus/ddd-admin-ui/markdown')`. */
export type MarkdownLoader = () => Promise<MarkdownModule>;

type Loaded = { status: 'ready'; module: MarkdownModule } | { status: 'missing'; reason: string };

// one load for the page's lifetime: `use()` needs the same promise on every render
let pending: Promise<Loaded> | null = null;
const loadOnce = (load: MarkdownLoader): Promise<Loaded> => {
  pending ??= load().then(
    module => ({ status: 'ready', module }) as const,
    (error: unknown) => ({ status: 'missing', reason: error instanceof Error ? error.message : String(error) }) as const
  );
  return pending;
};

const SAMPLE = '## Heading\n\nSome **bold** and _italic_ text,\na second line, a [link](https://example.com).\n\n- one\n- two\n\n<img src="x" onerror="alert(1)" alt="sanitised" />';

const MarkdownLoaded = ({ load }: { load: MarkdownLoader }) => {
  const loaded = use(loadOnce(load));
  const [value, setValue] = useState(SAMPLE);
  if (loaded.status === 'missing') {
    return (
      <p data-showcase-skipped="@uiw/react-md-editor" className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Skipped: ./markdown could not be loaded (optional peers <code>@uiw/react-md-editor</code>, <code>rehype-sanitize</code>).
      </p>
    );
  }
  const { MarkdownEditor, MarkdownPreview } = loaded.module;
  return (
    <div data-showcase-loaded="markdown" className="grid gap-4 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="showcase-markdown">MarkdownEditor</Label>
        <MarkdownEditor id="showcase-markdown" value={value} onChange={setValue} height={240} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">MarkdownPreview (sanitised: the image's onerror is removed)</p>
        <MarkdownPreview source={value} className="text-sm" />
      </div>
    </div>
  );
};

/** The `./markdown` section: loaded through the host's loader, skipped without it or when the import fails. */
export const MarkdownShowcase = ({ load }: { load?: MarkdownLoader }) => {
  if (!load) {
    return (
      <p data-showcase-skipped="@uiw/react-md-editor" className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Skipped: no loadMarkdown passed (optional peers <code>@uiw/react-md-editor</code>, <code>rehype-sanitize</code>).
      </p>
    );
  }
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      <MarkdownLoaded load={load} />
    </Suspense>
  );
};
