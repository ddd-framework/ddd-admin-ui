'use client';

import { useState } from 'react';

import {
  createStaticWorkersApi,
  WorkerMessageRunsTab,
  WorkerProcessesTab,
  type WorkerProcessFilter,
  type WorkerRunOutcomeFilter,
  WorkersOverviewScreen,
  WorkerTransportScreen,
} from '../../workers/index.ts';
import { SHOWCASE_NOW_MS, showcaseWorkersData } from '../fixtures.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const api = createStaticWorkersApi(showcaseWorkersData);
const transportHref = (transport: string, tab?: string) => `#workers-${transport}${tab ? `-${tab}` : ''}`;

/** The `./workers` section: both screens on sample payloads (no request), the history pinned to a fixed hour. */
export const WorkersShowcase = () => {
  const [outcome, setOutcome] = useState<WorkerRunOutcomeFilter>('');
  const [processFilter, setProcessFilter] = useState<WorkerProcessFilter>('');
  return (
    <div className="space-y-10">
      <Sample title="WorkersOverviewScreen (createStaticWorkersApi)">
        <div className="w-full">
          <WorkersOverviewScreen api={api} transportHref={transportHref} pollingIntervalMs={0} historyAnchorMs={SHOWCASE_NOW_MS} />
        </div>
      </Sample>
      <Sample title="WorkerTransportScreen">
        <div className="w-full">
          <WorkerTransportScreen api={api} transport="import_orders" backHref="#workers" pollingIntervalMs={0} historyAnchorMs={SHOWCASE_NOW_MS} />
        </div>
      </Sample>
      <Sample title="WorkerMessageRunsTab, WorkerProcessesTab">
        <div className="w-full space-y-6">
          <WorkerMessageRunsTab api={api} transport="import_orders" outcome={outcome} onOutcomeChange={setOutcome} messageLog="all" />
          <WorkerProcessesTab api={api} transport="import_orders" filter={processFilter} onFilterChange={setProcessFilter} />
        </div>
      </Sample>
    </div>
  );
};
