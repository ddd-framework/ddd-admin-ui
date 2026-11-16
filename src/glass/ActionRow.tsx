import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

import type { StatusTone } from '../logic/pure/status.ts';
import { cn } from '../primitives/cn.ts';

const DOT_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  highlight: 'bg-primary',
  brand: 'bg-brand',
};

export interface ActionRowProps {
  title: ReactNode;
  /** One muted line (relations, a date). */
  description?: ReactNode;
  /** The status dot left of the title (tone of the entity's status family). */
  tone?: StatusTone;
  /** Accessible text of the dot (the status label); the dot alone never carries meaning. */
  toneLabel?: string;
  /** A short action text or control before the chevron (`Open`, a link). */
  action?: ReactNode;
  /** The trailing chevron (default on): the row opens something. */
  chevron?: boolean;
  /** `span` when the row sits inside a button or link (a draggable card); `li` inside a list. */
  as?: 'div' | 'span' | 'li';
  /** Hover lift (shadow only) for a clickable row. */
  interactive?: boolean;
  className?: string;
}

/**
 * One solid task card inside a `GlassGroup`: status dot, title + muted description,
 * action + chevron right. Presentational — the caller makes it clickable (wrap it in a button / link and pass
 * `as="span"`), so it fits drag handles and router links alike.
 */
export const ActionRow = ({
  title,
  description,
  tone,
  toneLabel,
  action,
  chevron = true,
  as: Root = 'div',
  interactive = false,
  className,
}: ActionRowProps) => {
  const Part = Root === 'span' ? 'span' : 'div';
  return (
    <Root
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left shadow-[var(--surface-shadow)]',
        interactive && 'transition-shadow duration-150 hover:shadow-[var(--surface-shadow-raised)] motion-reduce:transition-none',
        className
      )}
    >
      {tone && (
        <Part className={cn('size-2.5 shrink-0 rounded-full', DOT_CLASS[tone])} role="img" aria-label={toneLabel} />
      )}
      <Part className="block min-w-0 flex-1">
        <Part className="block truncate text-sm font-semibold text-foreground">{title}</Part>
        {description && <Part className="mt-0.5 block truncate text-[13px] text-muted-foreground">{description}</Part>}
      </Part>
      {action && <Part className="shrink-0 text-[13px] font-semibold text-brand-ink">{action}</Part>}
      {chevron && <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
    </Root>
  );
};
