'use client';

// The ./files manager under a host's fixed top bar (height --nav-h), with a long root folder: the folder bar (crumbs,
// quota) must stick right below the top bar while the page scrolls — `?variant=embedded` (the window scrolls the list)
// and the default page frame.
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { createStaticFileManagerAdapter, FileManager } from '@mgamadeus/ddd-admin-ui/files';
import { showcaseFilesData } from '@mgamadeus/ddd-admin-ui/showcase';

const areas = [{ key: 'marketing', name: 'Marketing' }];

export function FilesStickyFixture() {
  const variant = useSearchParams().get('variant') === 'embedded' ? 'embedded' : 'page';
  const adapter = useMemo(
    () =>
      createStaticFileManagerAdapter({
        ...showcaseFilesData,
        files: Array.from({ length: 60 }, (_, index) => ({
          id: 1000 + index,
          areaKey: 'marketing',
          folderId: null,
          name: `Long list file ${String(index + 1).padStart(2, '0')}.pdf`,
          extension: 'pdf',
          family: 'PDF' as const,
          sizeBytes: 10_000 + index,
          scanStatus: 'CLEAN' as const,
          links: [],
        })),
      }),
    []
  );
  return (
    <>
      <header data-host-top-bar="" className="fixed inset-x-0 top-0 z-50 h-(--nav-h) border-b bg-background">
        Host top bar
      </header>
      <main className="pt-(--nav-h)">
        <FileManager adapter={adapter} areas={areas} variant={variant} defaultView="table" />
      </main>
    </>
  );
}
