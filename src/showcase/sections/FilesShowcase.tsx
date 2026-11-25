'use client';

import { FileFamilyIcon } from '../../files/FileFamilyIcon.tsx';
import { FileManager } from '../../files/FileManager.tsx';
import { FileViewer } from '../../files/FileViewer.tsx';
import { FILE_FAMILIES } from '../../files/fileView.ts';
import { QuotaPill } from '../../files/QuotaPill.tsx';
import { createStaticFileManagerAdapter } from '../../files/staticFileManagerAdapter.ts';
import { showcaseFilesData } from '../filesFixtures.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const adapter = createStaticFileManagerAdapter({
  ...showcaseFilesData,
  capabilities: undefined,
});
const areas = [{ key: 'marketing', name: 'Marketing' }];

/** The `./files` section: the file manager and the file viewer on sample payloads (writes are refused), the icons and the quota pill. */
export const FilesShowcase = () => (
  <div className="space-y-10">
    <Sample title="FileManager (createStaticFileManagerAdapter, variant embedded)">
      <div className="w-full">
        <FileManager adapter={adapter} areas={areas} variant="embedded" defaultView="table" />
      </div>
    </Sample>
    <Sample title="FileViewer (one file on a wide surface: preview, version choice, download)">
      <div className="flex h-80 w-full flex-col">
        <FileViewer adapter={adapter} fileId={11} />
      </div>
    </Sample>
    <Sample title="FileFamilyIcon">
      <div className="flex flex-wrap gap-2">
        <FileFamilyIcon family="FOLDER" />
        {FILE_FAMILIES.map(family => (
          <FileFamilyIcon key={family} family={family} />
        ))}
      </div>
    </Sample>
    <Sample title="QuotaPill">
      <div className="flex flex-wrap gap-2">
        <QuotaPill usedBytes={1_200_000_000} quotaBytes={5_000_000_000} />
        <QuotaPill usedBytes={4_800_000_000} quotaBytes={5_000_000_000} />
        <QuotaPill usedBytes={320_000_000} quotaBytes={null} />
      </div>
    </Sample>
  </div>
);
