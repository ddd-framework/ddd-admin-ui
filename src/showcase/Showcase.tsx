'use client';

import { type ReactNode, useState } from 'react';

import { PortalContainerProvider } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';
import { FormShowcase } from './sections/FormShowcase.tsx';
import { GlassShowcase } from './sections/GlassShowcase.tsx';
import { ListShowcase } from './sections/ListShowcase.tsx';
import { MediaShowcase } from './sections/MediaShowcase.tsx';
import { NextShowcase, NotifySonnerShowcase, type NotifySonnerLoader } from './sections/OptionalShowcase.tsx';
import { PageShowcase } from './sections/PageShowcase.tsx';
import { PrimitivesShowcase } from './sections/PrimitivesShowcase.tsx';
import { ShellShowcase } from './sections/ShellShowcase.tsx';
import { DataShowcase } from './sections/DataShowcase.tsx';
import { type MarkdownLoader, MarkdownShowcase } from './sections/MarkdownShowcase.tsx';
import { TranslationAdminShowcase, TranslationsShowcase } from './sections/TranslationsShowcase.tsx';
import { WorkersShowcase } from './sections/WorkersShowcase.tsx';
import { IssuesShowcase } from './sections/IssuesShowcase.tsx';
import { DatabaseShowcase } from './sections/DatabaseShowcase.tsx';
import { FilesShowcase } from './sections/FilesShowcase.tsx';
import { CronsShowcase } from './sections/CronsShowcase.tsx';
import { SandboxShowcase } from './sections/SandboxShowcase.tsx';

/** One section of the showcase: a heading and what it draws. Hosts append their own (`Showcase.sections`). */
export interface ShowcaseSection {
  /** Stable id: the section's anchor (`#showcase-<id>`) and React key. */
  id: string;
  title: string;
  description?: ReactNode;
  content: ReactNode;
}

export type ShowcaseTheme = 'light' | 'dark';

export interface ShowcaseProps {
  /** The host's own sections, drawn after the package's. */
  sections?: readonly ShowcaseSection[];
  /** Which themes to draw, side by side on wide screens (default both). Dark is a `.dark` ancestor, as in the host. */
  themes?: readonly ShowcaseTheme[];
  /**
   * Loads `./notify-sonner` for its section; only a host with `sonner` passes it:
   * `loadNotifySonner={() => import('@mgamadeus/ddd-admin-ui/notify-sonner')}`. Without it, or when the import fails
   * (the peer is missing), the section says it is skipped.
   */
  loadNotifySonner?: NotifySonnerLoader;
  /**
   * Loads `./markdown` for its section; only a host with the optional peers `@uiw/react-md-editor` and
   * `rehype-sanitize` passes it: `loadMarkdown={() => import('@mgamadeus/ddd-admin-ui/markdown')}`. Without it the
   * section says it is skipped.
   */
  loadMarkdown?: MarkdownLoader;
  /**
   * Leave out package sections by id (`primitives`, `list`, `page`, `form`, `translations`, `markdown`, `media`,
   * `workers`, `issues`, `database`, `files`, `crons`, `sandbox`, `glass`, `data`, `shell`, `notify-sonner`, `next`).
   */
  omit?: readonly string[];
  className?: string;
}

/** The package's sections, one per entry, in import-matrix order. */
const packageSections = (
  loadNotifySonner: NotifySonnerLoader | undefined,
  loadMarkdown: MarkdownLoader | undefined
): ShowcaseSection[] => [
  { id: 'primitives', title: './primitives', description: 'Buttons, fields, overlays, tables, the segmented control.', content: <PrimitivesShowcase /> },
  { id: 'list', title: './list', description: 'List card, toolbar, filters, table and grid, cells, pickers.', content: <ListShowcase /> },
  { id: 'page', title: './page', description: 'Page frame and header, detail shell, cards and toolbars.', content: <PageShowcase /> },
  { id: 'form', title: './form', description: 'Form shell, fields, sections, actions, errors, drawer.', content: <FormShowcase /> },
  {
    id: 'translations',
    title: './translations',
    description: 'Inputs per content locale, the translation controls, and the admin screens (app translations, languages, locales).',
    content: (
      <div className="space-y-12">
        <TranslationsShowcase />
        <TranslationAdminShowcase />
      </div>
    ),
  },
  {
    id: 'markdown',
    title: './markdown',
    description: 'Markdown editor and sanitised preview (optional peers, loaded lazily).',
    content: <MarkdownShowcase load={loadMarkdown} />,
  },
  { id: 'media', title: './media', description: 'Media field, preview and picker.', content: <MediaShowcase /> },
  { id: 'workers', title: './workers', description: 'The worker monitoring screens: overview, transport, runs, processes (SVG charts).', content: <WorkersShowcase /> },
  { id: 'issues', title: './issues', description: 'The issues screen: error groups, trend, details drawer, resolve / ignore / reopen.', content: <IssuesShowcase /> },
  { id: 'database', title: './database', description: 'The schema diff screen: per-table and bulk apply, generated SQL and model code.', content: <DatabaseShowcase /> },
  {
    id: 'files',
    title: './files',
    description: 'The file manager: folder tree, grid and table, filters, drawer with versions and activity, trash, links.',
    content: <FilesShowcase />,
  },
  { id: 'crons', title: './crons', description: 'The crons screen: list, runs, timeline, create and edit, run now.', content: <CronsShowcase /> },
  {
    id: 'sandbox',
    title: './sandbox',
    description: 'The agents’ workspaces: list, one workspace with files, changes, processes, commands, log and audit.',
    content: <SandboxShowcase />,
  },
  { id: 'glass', title: './glass', description: 'Glass pills, quick filters, collapsible cards, groups and rows.', content: <GlassShowcase /> },
  { id: 'data', title: './data', description: 'Key figures: metric tiles with a change and a sparkline slot, their grid, notes.', content: <DataShowcase /> },
  { id: 'shell', title: './shell', description: 'Application frame, breadcrumbs, account and language menus; the animated background of ./shell-background.', content: <ShellShowcase /> },
  {
    id: 'notify-sonner',
    title: './notify-sonner',
    description: 'Toasts through sonner (optional peer, loaded lazily).',
    content: <NotifySonnerShowcase load={loadNotifySonner} />,
  },
  { id: 'next', title: './next', description: 'Next.js adapters (optional peer): hooks, no markup.', content: <NextShowcase /> },
];

const ThemePane = ({ theme, sections }: { theme: ShowcaseTheme; sections: readonly ShowcaseSection[] }) => {
  // dialogs, menus and tooltips of a pane open inside it, so the dark pane's overlays are dark too
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);
  return (
    <div
      data-showcase-theme={theme}
      className={cn('min-w-0 flex-1 rounded-3xl bg-background p-4 text-foreground md:p-6', theme === 'dark' && 'dark')}
    >
      <PortalContainerProvider container={portal}>
        <p className="mb-6 text-[11.5px] font-bold tracking-[0.08em] text-muted-foreground uppercase">{theme}</p>
        <div className="space-y-12">
          {sections.map(section => (
            <section key={section.id} id={`showcase-${section.id}-${theme}`} aria-labelledby={`showcase-${section.id}-${theme}-title`}>
              <header className="mb-4 border-b pb-2">
                <h2 id={`showcase-${section.id}-${theme}-title`} className="text-title-section font-bold">
                  {section.title}
                </h2>
                {section.description && <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>}
              </header>
              {/* the section's own guard: a host section or a specimen outside a sample scrolls here, never the page */}
              <div data-showcase-section-content={section.id} className="-m-1 min-w-0 overflow-x-auto p-1">
                {section.content}
              </div>
            </section>
          ))}
        </div>
      </PortalContainerProvider>
      <div ref={setPortal} className={theme === 'dark' ? 'dark' : undefined} />
    </div>
  );
};

/**
 * Every block of the package in the host's theme, light and dark, one section per entry; the host appends its own
 * sections. A development page: mount it on a route of the host (below `AdminUiProvider`, which brings the tooltip
 * provider) to judge the theme, the tokens and the blocks in one place. Optional peers stay optional: the
 * `./notify-sonner` section loads only through `loadNotifySonner` and is skipped without it; `./next` is described,
 * never imported. Texts are developer-facing English and not part of the text manifest.
 */
export const Showcase = ({
  sections = [],
  themes = ['light', 'dark'],
  loadNotifySonner,
  loadMarkdown,
  omit = [],
  className,
}: ShowcaseProps) => {
  const all = [...packageSections(loadNotifySonner, loadMarkdown).filter(section => !omit.includes(section.id)), ...sections];
  return (
    <div data-showcase className={cn('flex flex-col gap-6 xl:flex-row', className)}>
      {themes.map(theme => (
        <ThemePane key={theme} theme={theme} sections={all} />
      ))}
    </div>
  );
};
