import type { ReactNode } from 'react';
import { cn } from '../primitives/cn.ts';

export interface PageFrameProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A full-height page below the host's top chrome (`--nav-h`). No hooks: usable from server components. */
export const PageFrame = ({ title, children, className }: PageFrameProps) => (
  <section data-page-frame="" className={cn('flex flex-col gap-4 md:h-[calc(100dvh_-_var(--nav-h))]', className)}>
    <h1 className="text-title-page">{title}</h1>
    {children}
  </section>
);
