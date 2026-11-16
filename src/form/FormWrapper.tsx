'use client';

import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';
import { useIsInDrawer } from './drawerSlots.ts';

export interface FormWrapperProps {
  children: ReactNode;
  /** `narrow` (`max-w-2xl`, one column, centred) or `wide` (full width, multi-card forms). Ignored in a drawer. */
  width?: 'narrow' | 'wide';
  className?: string;
}

/**
 * Layout-only wrapper of a form: centred column with the form rhythm on a page; inside a
 * `FormDrawer` it fills the drawer body, so fields start on the same edge as the drawer's title and footer.
 */
export const FormWrapper = ({ children, width = 'narrow', className }: FormWrapperProps) => {
  const isInDrawer = useIsInDrawer();
  return (
    <div
      className={cn(
        !isInDrawer && 'mx-auto w-full',
        // `wide` = the full content width (`--content-max`, 100 % unless the host narrows it).
        !isInDrawer && (width === 'wide' ? 'max-w-[var(--content-max)]' : 'max-w-2xl'),
        className
      )}
    >
      {children}
    </div>
  );
};
