'use client';

import { type CSSProperties, useState } from 'react';

import { SegmentedControl } from '../../primitives/index.ts';
import { Sample } from './PrimitivesShowcase.tsx';

const TIMINGS = {
  '--segmented-control-duration': '300ms',
  '--segmented-control-easing': 'cubic-bezier(.22,.8,.24,1)',
  '--segmented-control-option-duration': '160ms',
} as CSSProperties;

/** The SegmentedControl options of 0.2.0: option height, touch growth, plain badges, server texts, timings. */
export const PrimitivesAdditionsShowcase = () => {
  const [value, setValue] = useState('all');
  return (
    <Sample title="SegmentedControl: option height, coarse growth, unstyled badges, untranslated, held feedback">
      <SegmentedControl
        aria-label="Filter"
        translate={false}
        value={value}
        onValueChange={setValue}
        heightOf="option"
        coarsePointer="grow"
        badgeStyle="unstyled"
        pressFeedback
        style={TIMINGS}
        className="gap-1 p-1"
        options={[
          { value: 'all', label: 'All', badge: <span className="rounded-full bg-foreground/10 px-1.5 text-[11px] tabular-nums">42</span> },
          { value: 'failing', label: 'Failing', badge: <span className="rounded-full bg-destructive/15 px-1.5 text-[11px] text-destructive tabular-nums">3</span> },
          { value: 'paused', label: 'Paused' },
        ]}
      />
    </Sample>
  );
};
