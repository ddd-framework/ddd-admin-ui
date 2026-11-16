import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';

export interface TagProps {
  children: ReactNode;
  /**
   * `primary` = the light accent tint with dark-yellow text (picked / featured); `brand` = the light logo-cyan tint
   * with its legible text shade (identity, e.g. app-reported sources); `default` = the quiet grey tint.
   */
  tone?: 'default' | 'primary' | 'brand';
  /** `sm` = compact for table rows and cards (the height of a `StatusBadge` next to it); `default` = `6px 16px`. */
  size?: 'default' | 'sm';
  /** Optional leading `lucide-react` icon (14 px). */
  icon?: ReactNode;
  className?: string;
}

/**
 * A plain label chip: radius 8 px, `6px 16px` padding. For facts without a state; a state
 * (running, failed, …) is a `StatusBadge` with an icon.
 */
const TONE_CLASS: Record<NonNullable<TagProps['tone']>, string> = {
  default: 'bg-secondary text-secondary-foreground',
  primary: 'bg-accent text-primary-emphasis',
  brand: 'bg-brand-light text-brand-emphasis',
};

export const Tag = ({ children, tone = 'default', size = 'default', icon, className }: TagProps) => (
  <span
    className={cn(
      'inline-flex w-fit items-center gap-1.5 font-medium whitespace-nowrap',
      size === 'sm'
        ? 'rounded-md px-2 py-0.5 text-xs [&_svg]:size-3'
        : 'rounded-lg px-4 py-1.5 text-[13px] [&_svg]:size-3.5',
      TONE_CLASS[tone],
      className
    )}
  >
    {icon}
    {children}
  </span>
);
