'use client';

import { Activity, Users } from 'lucide-react';

import { DeltaText, MetricGrid, MetricTile, NoteList, relativeChange } from '../../data/index.ts';
import { formatUiNumber } from '../../i18n/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

/** A static sparkline drawn in plain SVG: the slot takes any chart of the host. */
const SampleSparkline = () => (
  <svg viewBox="0 0 100 24" className="h-6 w-full text-primary" aria-hidden preserveAspectRatio="none">
    <polyline fill="none" stroke="currentColor" strokeWidth="2" points="0,20 15,16 30,18 45,10 60,12 75,6 100,4" />
  </svg>
);

/** The `./data` section. */
export const DataShowcase = () => (
  <Samples>
    <Sample title="MetricGrid, MetricTile, DeltaText">
      <MetricGrid className="w-full">
        <MetricTile
          label="Visitors"
          icon={<Users aria-hidden />}
          value={formatUiNumber(12840)}
          delta={<DeltaText value={relativeChange(12840, 11200)} format="percent" title="Against the previous 30 days" />}
          hint="Previous: 11,200"
          sparkline={<SampleSparkline />}
        />
        <MetricTile
          label="Errors"
          icon={<Activity aria-hidden />}
          value={formatUiNumber(37)}
          delta={<DeltaText value={-12} preference="lower" />}
          hint="Lower is better"
        />
        <MetricTile label="Conversion" value="3.2 %" delta={<DeltaText value={0} />} />
        <MetricTile label="Revenue" value="—" isLoading />
      </MetricGrid>
    </Sample>
    <Sample title="MetricGrid isLoading, compact tiles">
      <MetricGrid className="w-full" columns={3} isLoading size="compact" />
      <MetricGrid className="w-full" columns={3}>
        <MetricTile size="compact" label="Open" value="14" delta={<DeltaText value={null} emptyText="new" />} />
        <MetricTile size="compact" label="Cost" value="€ 412.00" delta={<DeltaText value={18.5} preference="lower" format={{ style: 'currency', currency: 'EUR' }} />} />
        <MetricTile size="compact" label="Share" value="48 %" delta={<DeltaText value={0.02} preference="none" format="percent" />} />
      </MetricGrid>
    </Sample>
    <Sample title="NoteList">
      <NoteList
        notes={[
          { id: 'sampled', text: 'Figures are sampled every 15 minutes.' },
          { id: 'missing', text: 'One source did not report for 2 hours.', tone: 'warning' },
          { id: 'failed', text: 'The import of yesterday failed.', tone: 'destructive' },
        ]}
      />
    </Sample>
  </Samples>
);
