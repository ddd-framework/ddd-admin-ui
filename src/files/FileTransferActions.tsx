'use client';

import { ChevronDown, FileInput, FileOutput } from 'lucide-react';

import { useTranslate } from '../i18n/useTranslate.ts';
import { Button } from '../primitives/button.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../primitives/dropdown-menu.tsx';
import type { FileExportTarget, FileImportSource } from './fileManagerAdapter.ts';
import { filesForExportTarget } from './fileTransfers.ts';
import type { FileView } from './fileView.ts';

export interface FileImportActionsProps {
  sources: readonly FileImportSource[];
  disabled?: boolean;
  /** Opens the source's dialog. */
  onOpen: (sourceKey: string) => void;
}

/** The page action of capability `imports`: one button for one source, an "Insert" menu for several. */
export const FileImportActions = ({ sources, disabled, onOpen }: FileImportActionsProps) => {
  const { t } = useTranslate();
  if (sources.length === 0) return null;
  if (sources.length === 1) {
    const [source] = sources;
    return (
      <Button type="button" variant="outline" disabled={disabled} onClick={() => onOpen(source.key)}>
        {source.icon ?? <FileInput aria-hidden />}
        {t(source.label)}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <FileInput aria-hidden />
          {t('Insert', { context: 'file-import' })}
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sources.map(source => (
          <DropdownMenuItem key={source.key} onSelect={() => onOpen(source.key)}>
            {source.icon ?? <FileInput aria-hidden />}
            {t(source.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export interface FileExportMenuProps {
  file: FileView;
  targets: readonly FileExportTarget[];
  disabled?: boolean;
  onExport: (file: FileView, targetKey: string) => void;
}

/**
 * The row / card action of capability `exports`: the targets that take this file (released, accepted). One target is
 * an icon button with its label as the tooltip, several a menu; nothing when none takes the file.
 */
export const FileExportMenu = ({ file, targets, disabled, onExport }: FileExportMenuProps) => {
  const { t } = useTranslate();
  const offered = targets.filter(target => filesForExportTarget(target, [file]).length > 0);
  if (offered.length === 0) return null;
  if (offered.length === 1) {
    const [target] = offered;
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-row-action-ignore
        aria-label={t('%action%: %name%', { context: 'file-export', replacements: { action: t(target.label), name: file.name } })}
        title={t(target.label)}
        disabled={disabled}
        onClick={() => onExport(file, target.key)}
      >
        {target.icon ?? <FileOutput />}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-row-action-ignore
          aria-label={t('Copy %name% to …', { replacements: { name: file.name } })}
          title={t('Copy to …')}
          disabled={disabled}
        >
          <FileOutput />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {offered.map(target => (
          <DropdownMenuItem key={target.key} onSelect={() => onExport(file, target.key)}>
            {target.icon ?? <FileOutput aria-hidden />}
            {t(target.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
