import type { ReactNode } from 'react';
import { cn } from '../primitives/cn.ts';

/** A translucent panel (`surface-glass` in components.css). No hooks: usable from server components. */
export const GlassPanel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('surface-glass rounded-xl p-4', className)}>{children}</div>
);
