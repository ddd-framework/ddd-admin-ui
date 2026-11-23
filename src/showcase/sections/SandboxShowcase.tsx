'use client';

import { useState } from 'react';

import { createStaticSandboxesApi } from '../../sandbox/api.ts';
import { SandboxDetailScreen, type SandboxDetailTab } from '../../sandbox/SandboxDetailScreen.tsx';
import { SandboxActionsMenu, SandboxesScreen, SandboxMountMode, SandboxUsageBar } from '../../sandbox/SandboxesScreen.tsx';
import { SandboxFilePreview } from '../../sandbox/SandboxFilePreview.tsx';
import type { AgentSandboxWorkspacesResponse } from '../../sandbox/types.ts';
import { useSandboxActions } from '../../sandbox/useSandboxActions.tsx';
import { showcaseSandboxesData } from '../sandboxFixtures.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const api = createStaticSandboxesApi(showcaseSandboxesData);
const workspaces = (showcaseSandboxesData.list as AgentSandboxWorkspacesResponse).workspaces.elements ?? [];
const [running, plain] = workspaces;

/** The `./sandbox` section: the list and one workspace on sample payloads (actions are refused), the parts alone. */
export const SandboxShowcase = () => {
  const actions = useSandboxActions(api);
  const [tab, setTab] = useState<SandboxDetailTab>('commands');
  return (
    <div className="space-y-10">
      <Sample title="SandboxesScreen (createStaticSandboxesApi)">
        <div className="w-full">
          <SandboxesScreen api={api} />
        </div>
      </Sample>
      {running && (
        <Sample title="SandboxDetailScreen (a running turn: actions ask for a reason)">
          <div className="w-full">
            <SandboxDetailScreen api={api} workspaceKey={running.workspaceKey} tab={tab} onTabChange={setTab} buildConversationHref={conversation => `#conversation-${conversation.conversationId}`} />
          </div>
        </Sample>
      )}
      {running && plain && (
        <Sample title="SandboxUsageBar, SandboxMountMode, SandboxActionsMenu, SandboxFilePreview (text as text nodes)">
          <div className="flex w-full flex-wrap items-start gap-6">
            <SandboxUsageBar used={running.memoryBytes} limit={running.memoryLimitBytes} peak={running.memoryPeakBytes} />
            <SandboxMountMode workspace={plain} />
            <SandboxActionsMenu workspace={plain} onAction={kind => void actions.run({ kind, workspace: plain })} />
            <div className="w-full max-w-xl">
              <SandboxFilePreview api={api} workspaceKey={running.workspaceKey} file={{ name: 'notes.md', path: 'notes.md', type: 'FILE', sizeBytes: 2310 }} />
            </div>
          </div>
          {actions.dialog}
        </Sample>
      )}
    </div>
  );
};
