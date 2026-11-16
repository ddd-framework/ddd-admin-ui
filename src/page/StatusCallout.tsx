import { CircleCheck, CircleX, Info, type LucideIcon, TriangleAlert } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';

import { Button } from '../primitives/index.ts';
import { cn } from '../primitives/cn.ts';

export type StatusCalloutTone = 'info' | 'warning' | 'destructive' | 'success';

const TONE_FILL: Record<StatusCalloutTone, string> = {
  info: 'bg-info/10',
  warning: 'bg-warning/10',
  destructive: 'bg-destructive/10',
  success: 'bg-success/10',
};

const TONE_INK: Record<StatusCalloutTone, string> = {
  info: 'text-info',
  warning: 'text-warning',
  destructive: 'text-destructive',
  success: 'text-success',
};

const TONE_ICON: Record<StatusCalloutTone, LucideIcon> = {
  info: Info,
  warning: TriangleAlert,
  destructive: CircleX,
  success: CircleCheck,
};

export interface StatusCalloutProps {
  /** By meaning: `info` read-only / heads-up, `warning` needs doing first, `destructive` broken or blocked now, `success`. */
  tone?: StatusCalloutTone;
  title: ReactNode;
  /** One line of explanation (or a short block), muted. */
  description?: ReactNode;
  /** Replaces the tone's icon. */
  icon?: LucideIcon;
  /** The one action that resolves it (`StatusCalloutAction`). */
  actions?: ReactNode;
  /** `compact` in drawers, forms and dialogs. */
  size?: 'default' | 'compact';
  className?: string;
}

/**
 * A notice box: no border, `rounded-2xl`, a soft tone fill, the tone only in the
 * fill and the 18 px icon, the title in ink and the body muted — never a coloured paragraph — plus at most one action
 * on the right. `status` for a heads-up (a nudge found on load must not interrupt a screen reader), `alert` for
 * `destructive`. The same look as the `Alert` primitive, which keeps shadcn's composition API.
 */
export const StatusCallout = ({
  tone = 'info',
  title,
  description,
  icon,
  actions,
  size = 'default',
  className,
}: StatusCalloutProps) => {
  const Icon = icon ?? TONE_ICON[tone];
  return (
    <div
      role={tone === 'destructive' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col rounded-2xl sm:flex-row sm:items-center',
        size === 'compact' ? 'gap-2 p-3 sm:gap-3' : 'gap-3 p-4 sm:gap-4',
        TONE_FILL[tone],
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon className={cn('mt-px size-[18px] shrink-0', TONE_INK[tone])} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm leading-5 font-semibold text-foreground">{title}</div>
          {description && <div className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</div>}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start pl-[30px] sm:self-auto sm:pl-0">{actions}</div>
      )}
    </div>
  );
};

/** The callout's one action: a small outline button, so the tone stays in the fill and the icon. */
export const StatusCalloutAction = ({ className, variant = 'outline', size = 'sm', ...props }: ComponentProps<typeof Button>) => (
  <Button variant={variant} size={size} className={cn('shrink-0 gap-1.5', className)} {...props} />
);
