'use client';

import { Hint, type HintProps } from '../primitives/hint.tsx';

export type WorkerHintProps = Omit<HintProps, 'slot'>;

/**
 * Details of a truncated or terse value as the package tooltip instead of a native `title`: it opens on hover, on
 * keyboard focus (the value is a tab stop; Enter or Space toggles it, Escape closes it) and on a tap, keeps line
 * breaks, and never runs a row's action. It brings its own tooltip provider, so a part used without `AdminUiProvider`
 * still renders.
 */
export const WorkerHint = (props: WorkerHintProps) => <Hint {...props} slot="worker-hint" />;
