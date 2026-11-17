'use client';

import { RouteError, RouteLoading } from '../../page/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

/** The route states of 0.2.0: an error with retry and report, the loading wireframes. */
export const PageAdditionsShowcase = () => (
  <Samples>
    <Sample title="RouteError (inline)">
      <RouteError
        variant="inline"
        onRetry={() => {}}
        onReport={() => new Promise<void>(resolve => setTimeout(resolve, 600))}
        detail="digest 1234567890"
        className="w-full"
      />
    </Sample>
    <Sample title="RouteLoading list, detail, form">
      <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-6">
        <RouteLoading rows={3} />
        <RouteLoading variant="detail" className="[&_.h-96]:h-24" />
        <RouteLoading variant="form" />
      </div>
    </Sample>
  </Samples>
);
