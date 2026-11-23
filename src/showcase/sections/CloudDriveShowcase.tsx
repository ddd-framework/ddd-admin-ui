'use client';

import { createStaticCloudDriveApi } from '../../clouddrive/api.ts';
import { CloudDriveScreen } from '../../clouddrive/CloudDriveScreen.tsx';
import { showcaseCloudDriveData } from '../cloudDriveFixtures.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const api = createStaticCloudDriveApi(showcaseCloudDriveData);

/** The `./clouddrive` section: the drive screen on sample payloads (writes are refused). */
export const CloudDriveShowcase = () => (
  <div className="space-y-10">
    <Sample title="CloudDriveScreen (createStaticCloudDriveApi)">
      <div className="w-full">
        <CloudDriveScreen api={api} />
      </div>
    </Sample>
  </div>
);
