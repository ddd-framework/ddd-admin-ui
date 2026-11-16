'use client';

import { Palette, Star } from 'lucide-react';
import { useState } from 'react';

import { ActionRow, CollapsibleCard, GlassGroup, GlassPill, QuickFilterPills } from '../../glass/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', count: 12 },
  { value: 'PAUSED', label: 'Paused', count: 3 },
  { value: 'FAILED', label: 'Failed', count: 0 },
];

/** The `./glass` section. */
export const GlassShowcase = () => {
  const [status, setStatus] = useState('');
  const [statuses, setStatuses] = useState<string[]>(['ACTIVE']);
  const [pill, setPill] = useState(true);
  return (
    <Samples>
      <Sample title="GlassPill, QuickFilterPills">
        <GlassPill icon={<Star />} count={4} active={pill} aria-pressed={pill} onClick={() => setPill(value => !value)}>
          Featured
        </GlassPill>
        <GlassPill size="sm" as="span">
          Static pill
        </GlassPill>
        <QuickFilterPills aria-label="Status quick filters" allLabel="All statuses" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        <QuickFilterPills aria-label="Status quick filters (multi)" mode="multi" options={STATUS_OPTIONS} value={statuses} onChange={setStatuses} size="sm" />
      </Sample>
      <Sample title="CollapsibleCard">
        <CollapsibleCard title="Glass card" description="Open by default" icon={<Palette />} defaultOpen className="w-full">
          <p className="text-sm">Content of a glass collapsible card.</p>
        </CollapsibleCard>
        <CollapsibleCard title="Solid card, compact" variant="solid" density="compact" className="w-full">
          <p className="text-sm">Content of a solid collapsible card.</p>
        </CollapsibleCard>
      </Sample>
      <Sample title="GlassGroup, ActionRow">
        <GlassGroup title="Running" count={2} emptyText="Nothing running" className="w-full">
          <ActionRow interactive chevron title="Sample item 1" description="Workspace North" tone="success" toneLabel="Active" />
          <ActionRow interactive chevron title="Sample item 2" description="Workspace South" tone="warning" toneLabel="Paused" />
        </GlassGroup>
        <GlassGroup title="Empty group" count={0} emptyText="Nothing here" className="w-full" />
      </Sample>
    </Samples>
  );
};
