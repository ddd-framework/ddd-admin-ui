'use client';

import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, Label } from '../primitives/index.ts';
import { useTranslate } from '../i18n/index.ts';
import { MediaPreview } from './MediaPreview.tsx';
import { isInlineDescription } from '../primitives/descriptionContent.ts';

export interface MediaItemFieldProps {
  label: ReactNode;
  /** Preview of the current value; `null` = none picked. */
  previewUrl: string | null;
  alt: string;
  emptyLabel?: string;
  /** Opens the picker (the app renders `MediaItemPickerDialog` with its own data). */
  onOpenPicker: () => void;
  /** Offer "Remove" (clears the reference); leave out when the reference cannot be cleared. */
  onRemove?: () => void;
  disabled?: boolean;
  description?: ReactNode;
}

/**
 * A form field holding one media item reference: preview, then
 * "Select" / "Change" and an optional "Remove". Picking only changes the form value; nothing is saved until submit.
 */
export const MediaItemField = ({
  label,
  previewUrl,
  alt,
  emptyLabel,
  onOpenPicker,
  onRemove,
  disabled = false,
  description,
}: MediaItemFieldProps) => {
  const { t } = useTranslate();
  return (
  <div className="grid gap-2">
    <Label>{label}</Label>
    <MediaPreview src={previewUrl} alt={alt} emptyLabel={emptyLabel} />
    {description &&
          (isInlineDescription(description) ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : (
            <div className="text-xs text-muted-foreground">{description}</div>
          ))}
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onOpenPicker} disabled={disabled}>
        {previewUrl ? <RefreshCw aria-hidden /> : <ImagePlus aria-hidden />}
        {previewUrl ? t('Change', { context: 'media-field-action' }) : t('Select', { context: 'media-field-action' })}
      </Button>
      {onRemove && previewUrl && (
        <Button type="button" variant="outline" size="sm" onClick={onRemove} disabled={disabled}>
          <Trash2 aria-hidden />
          {t('Remove', { context: 'media-field-action' })}
        </Button>
      )}
    </div>
  </div>
  );
};
