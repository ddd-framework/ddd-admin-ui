'use client';

import { Check, ChevronsUpDown, HardDrive } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { FileAreaKey, FileAreaRefView } from '../files/fileView.ts';
import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { cn } from '../primitives/cn.ts';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../primitives/command.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover.tsx';

export interface CloudDriveSpacePickerProps {
  /** The spaces (`driveAreaRefOf` of the space list): name and group. */
  areas: readonly FileAreaRefView[];
  areaKey: FileAreaKey;
  onSelectArea: (areaKey: FileAreaKey) => void;
  className?: string;
}

interface SpaceGroup {
  label: string;
  areas: FileAreaRefView[];
}

/** Groups the spaces by `groupLabel` (spaces without one first), each group and its spaces in name order. */
export const groupDriveSpaces = (areas: readonly FileAreaRefView[]): SpaceGroup[] => {
  const groups = new Map<string, FileAreaRefView[]>();
  for (const area of areas) {
    const label = area.groupLabel ?? '';
    groups.set(label, [...(groups.get(label) ?? []), area]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => (left === '' ? -1 : right === '' ? 1 : left.localeCompare(right)))
    .map(([label, groupAreas]) => ({ label, areas: groupAreas.sort((left, right) => left.name.localeCompare(right.name)) }));
};

/** The space picker of the drive screen: one button, a searchable list grouped by the space's group. */
export const CloudDriveSpacePicker = ({ areas, areaKey, onSelectArea, className }: CloudDriveSpacePickerProps) => {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => groupDriveSpaces(areas), [areas]);
  const current = areas.find(area => String(area.key) === String(areaKey));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full max-w-sm justify-between gap-2', className)}>
          <span className="flex min-w-0 items-center gap-2">
            <HardDrive className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{current?.name ?? t('Choose a space')}</span>
            {current?.groupLabel && <span className="truncate text-xs text-muted-foreground">· {current.groupLabel}</span>}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('Search spaces…')} />
          <CommandList>
            <CommandEmpty>{t('No space matches.')}</CommandEmpty>
            {groups.map(group => (
              <CommandGroup key={group.label || '__ungrouped__'} heading={group.label || undefined}>
                {group.areas.map(area => (
                  <CommandItem
                    key={String(area.key)}
                    value={`${area.name} ${area.groupLabel ?? ''} ${String(area.key)}`}
                    onSelect={() => {
                      onSelectArea(area.key);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('size-4', String(area.key) === String(areaKey) ? 'opacity-100' : 'opacity-0')} aria-hidden />
                    <span className="truncate">{area.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
