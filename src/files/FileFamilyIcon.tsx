import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Folder,
  type LucideIcon,
  Presentation,
} from 'lucide-react';

import { cn } from '../primitives/cn.ts';
import type { FileFamily } from './fileView.ts';

interface FamilyLook {
  icon: LucideIcon;
  /** Icon colour (role utility). */
  tone: string;
  /** Soft tile behind the icon. */
  tile: string;
}

/** PDF red, spreadsheets green, documents blue, presentations amber, the rest quiet — role utilities only. */
const FAMILY_LOOK: Readonly<Record<FileFamily, FamilyLook>> = {
  PDF: { icon: FileText, tone: 'text-destructive', tile: 'bg-destructive/10' },
  SPREADSHEET: { icon: FileSpreadsheet, tone: 'text-success', tile: 'bg-success/10' },
  DOCUMENT: { icon: FileType, tone: 'text-info', tile: 'bg-info/10' },
  PRESENTATION: { icon: Presentation, tone: 'text-warning', tile: 'bg-warning/10' },
  TEXT: { icon: FileText, tone: 'text-muted-foreground', tile: 'bg-muted' },
  IMAGE: { icon: FileImage, tone: 'text-brand-emphasis', tile: 'bg-brand/10' },
  VECTOR: { icon: FileCode, tone: 'text-primary-emphasis', tile: 'bg-primary/15' },
  VIDEO: { icon: FileVideo, tone: 'text-foreground', tile: 'bg-secondary' },
  AUDIO: { icon: FileAudio, tone: 'text-foreground', tile: 'bg-secondary' },
  ARCHIVE: { icon: FileArchive, tone: 'text-muted-foreground', tile: 'bg-tint' },
  OTHER: { icon: File, tone: 'text-muted-foreground', tile: 'bg-tint' },
};

const SIZE_CLASS = {
  sm: { tile: 'size-8 rounded-lg', icon: 'size-4' },
  md: { tile: 'size-10 rounded-xl', icon: 'size-5' },
  lg: { tile: 'size-16 rounded-2xl', icon: 'size-8' },
} as const;

export interface FileFamilyIconProps {
  family: FileFamily | 'FOLDER';
  size?: keyof typeof SIZE_CLASS;
  /** Icon only, no tile. */
  bare?: boolean;
  className?: string;
}

/** The icon of a file family (or a folder) on its soft tile; decorative (the name next to it says what it is). */
export const FileFamilyIcon = ({ family, size = 'md', bare = false, className }: FileFamilyIconProps) => {
  const look: FamilyLook = family === 'FOLDER' ? { icon: Folder, tone: 'text-primary-emphasis', tile: 'bg-primary/15' } : FAMILY_LOOK[family];
  const Icon = look.icon;
  const sizes = SIZE_CLASS[size];
  if (bare) return <Icon aria-hidden className={cn(sizes.icon, look.tone, className)} />;
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center', sizes.tile, look.tile, className)}>
      <Icon className={cn(sizes.icon, look.tone)} />
    </span>
  );
};
