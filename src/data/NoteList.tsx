import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../primitives/cn.ts';

export type NoteTone = 'info' | 'warning' | 'destructive';

export interface NoteItem {
  id: string;
  /** Already translated. */
  text: ReactNode;
  /** `info` (default): a limit of what the numbers say; `warning`: a part is missing; `destructive`: a part failed. */
  tone?: NoteTone;
}

export interface NoteListProps {
  notes: readonly NoteItem[];
  className?: string;
}

const ICON = { info: Info, warning: TriangleAlert, destructive: CircleAlert } as const;
const ICON_CLASS: Record<NoteTone, string> = {
  info: 'text-muted-foreground',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

/**
 * Footnotes next to the figures they qualify: one muted line each with a 14 px icon, no box (a `StatusCallout` is for
 * a state of the page). Renders nothing without notes.
 */
export const NoteList = ({ notes, className }: NoteListProps) => {
  if (notes.length === 0) return null;
  return (
    <ul data-slot="note-list" className={cn('space-y-1', className)}>
      {notes.map(note => {
        const tone = note.tone ?? 'info';
        const Icon = ICON[tone];
        return (
          <li key={note.id} data-tone={tone} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Icon className={cn('mt-px size-3.5 shrink-0', ICON_CLASS[tone])} aria-hidden />
            <span className="min-w-0">{note.text}</span>
          </li>
        );
      })}
    </ul>
  );
};
