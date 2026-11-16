import { z } from 'zod';

/** The form value of a media reference field: the picked item's id and the preview it shows (`null` = none). */
export interface MediaItemValue {
  id: string;
  previewUrl: string | null;
}

/** Schema of a media reference field (`null` = none picked). */
export const mediaItemValueSchema = z.object({ id: z.string(), previewUrl: z.string().nullable() }).nullable();

/** Schema of one field's texts in the form's `translations` value (`{ 'locale::style': text }`). */
export const propertyTranslationsSchema = z.record(z.string(), z.string());
