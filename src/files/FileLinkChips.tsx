'use client';

import { Link2 } from 'lucide-react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { EmptyValue } from '../list/EmptyValue.tsx';
import { cn } from '../primitives/cn.ts';
import type { FileLinkKind } from './fileManagerAdapter.ts';
import type { FileLinkView } from './fileView.ts';

export interface FileLinkChipsProps {
  links: readonly FileLinkView[] | undefined;
  /** The adapter's kinds (the chip's tooltip names the kind). */
  kinds?: readonly FileLinkKind[];
  /** Chips before `+n` (cards and rows stay one line). */
  max?: number;
  /** `—` when there is no link (table cell, drawer); cards pass `false`. */
  showEmpty?: boolean;
  className?: string;
}

/** The link chips of a file (quiet tags: links are facts, not states). */
export const FileLinkChips = ({ links = [], kinds = [], max = 2, showEmpty = true, className }: FileLinkChipsProps) => {
  const { t } = useTranslate();
  if (links.length === 0) return showEmpty ? <EmptyValue /> : null;
  const shown = links.slice(0, max);
  const rest = links.length - shown.length;
  const kindLabel = (kind: string) => {
    const label = kinds.find(candidate => candidate.kind === kind)?.label;
    return label ? t(label) : kind;
  };
  return (
    <span className={cn('flex min-w-0 flex-wrap items-center gap-1', className)}>
      {shown.map(link => (
        <span
          key={`${link.kind}:${String(link.id)}`}
          title={t('%kind%: %name%', { replacements: { kind: kindLabel(link.kind), name: link.name } })}
          className="inline-flex max-w-40 items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11.5px] font-medium text-secondary-foreground"
        >
          <Link2 aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{link.name}</span>
        </span>
      ))}
      {rest > 0 && (
        <span
          className="rounded-md bg-tint px-1.5 py-0.5 text-[11.5px] font-semibold text-muted-foreground"
          title={links
            .slice(max)
            .map(link => link.name)
            .join(', ')}
        >
          +{rest}
        </span>
      )}
    </span>
  );
};
