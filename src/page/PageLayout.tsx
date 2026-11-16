import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';

/**
 * The vertical rhythm of an ordinary or detail page: 40 px between sections. Header → first cards (24 px)
 * comes from `PageHeader` / `SectionHeader`.
 */
export const PageSections = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('flex flex-col gap-10', className)}>{children}</div>
);

/** Cards side by side: two columns with a 16 px gap from `md`, one column below (settings grid). */
export const CardGrid = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', className)}>{children}</div>
);
