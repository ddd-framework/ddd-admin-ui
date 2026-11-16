'use client';

import { LayoutGrid, List } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../primitives/index.ts';
import { m, useTranslate } from '../i18n/index.ts';
import { cn } from '../primitives/cn.ts';
import type { ListDisplayMode, ListExtraView } from './types.ts';

export interface EntityListViewToggleProps<TExtra extends string = never> {
  displayMode: ListDisplayMode | TExtra;
  onDisplayModeChange: (mode: ListDisplayMode | TExtra) => void;
  /** False on a list without a grid card: a single view needs no switch, so nothing renders (unless `extraViews`). */
  showGridToggle?: boolean;
  /** The list's own views after Grid / Table (`ListExtraView`); with them the switch shows on a phone too. */
  extraViews?: readonly ListExtraView<TExtra>[];
  className?: string;
}

interface ToggleOption<TMode extends string> {
  value: TMode;
  label: string;
  icon: ReactNode;
  /** Extra classes of the button (phone visibility). */
  className?: string;
  /** Extra classes while another mode is selected (the phone shows that mode as this one). */
  selectedClassName?: string;
}

const GRID_OPTION = { value: 'grid', label: m('Grid view'), icon: <LayoutGrid /> } as const;
const TABLE_OPTION = { value: 'table', label: m('Table view'), icon: <List /> } as const;

/** The active pill of the clouds look (EntityTabs): active pill + the card shadow. */
const SELECTED_CLASS = 'bg-segment-active text-foreground shadow-[var(--surface-shadow)]';
/** The same pill, phone only: Grid stands for Table there, because a list with a card shows cards below `md`. */
const SELECTED_ON_PHONE_CLASS = 'max-md:bg-segment-active max-md:text-foreground max-md:shadow-[var(--surface-shadow)]';

/**
 * The Grid / Table switch at the end of the toolbar row (a segmented control, icon-only, 32 px). Desktop only: below `md` the list always shows cards, so the switch would change nothing. With
 * `extraViews` (a list's own views) it also shows on a phone, without the Table button when the list has a card (Grid
 * is marked then, the phone draws Table as cards).
 */
export const EntityListViewToggle = <TExtra extends string = never>({
  displayMode,
  onDisplayModeChange,
  showGridToggle = true,
  extraViews = [],
  className,
}: EntityListViewToggleProps<TExtra>) => {
  const { t } = useTranslate();
  const hasExtraViews = extraViews.length > 0;
  if (!showGridToggle && !hasExtraViews) return null;

  const options: ToggleOption<ListDisplayMode | TExtra>[] = [
    ...(showGridToggle
      ? [
          { ...GRID_OPTION, selectedClassName: hasExtraViews ? SELECTED_ON_PHONE_CLASS : undefined },
          { ...TABLE_OPTION, className: hasExtraViews ? 'max-md:hidden' : undefined },
        ]
      : [TABLE_OPTION]),
    ...extraViews,
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <fieldset
        className={cn(
          'h-8 shrink-0 items-center gap-0.5 rounded-full bg-tint p-0.5',
          hasExtraViews ? 'inline-flex' : 'hidden md:inline-flex',
          className
        )}
      >
        <legend className="sr-only">{t('View')}</legend>
        {options.map(option => {
          const selected = option.value === displayMode;
          const selectedOnPhone = !selected && option.value === 'grid' && displayMode === 'table';
          return (
            <Tooltip key={option.value}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t(option.label)}
                  aria-pressed={selected}
                  onClick={() => onDisplayModeChange(option.value)}
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 [&_svg]:size-4',
                    'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    option.className,
                    selected && SELECTED_CLASS,
                    selectedOnPhone && option.selectedClassName
                  )}
                >
                  {option.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t(option.label)}</TooltipContent>
            </Tooltip>
          );
        })}
      </fieldset>
    </TooltipProvider>
  );
};
