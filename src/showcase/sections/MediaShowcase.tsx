'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Form } from '../../form/index.ts';
import type { MediaItemValue } from '../../logic/index.ts';
import { FormMediaItemField, MediaItemField, MediaItemPickerDialog, type MediaPickerTile, MediaPreview } from '../../media/index.ts';
import { Button } from '../../primitives/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

/** A neutral placeholder image (inline SVG), so the showcase loads nothing from the network. */
const PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect width="160" height="120" fill="#94a3b8"/><circle cx="52" cy="44" r="14" fill="#e2e8f0"/><path d="M0 120 L56 70 L92 100 L120 78 L160 110 V120 Z" fill="#e2e8f0"/></svg>'
)}`;

const TILES: MediaPickerTile[] = Array.from({ length: 6 }, (_, index) => ({
  id: String(index + 1),
  previewUrl: PLACEHOLDER,
  title: `image-${index + 1}.png`,
  details: ['160 × 120', 'PNG'],
}));

interface MediaValues {
  image: MediaItemValue | null;
}

const BoundMedia = () => {
  const form = useForm<MediaValues>({ defaultValues: { image: { id: '1', previewUrl: PLACEHOLDER } } });
  return (
    <Form form={form} onSubmit={() => {}} className="w-full">
      <FormMediaItemField<MediaValues> name="image" label="Cover image (bound)" alt="" onOpenPicker={() => {}} removable />
    </Form>
  );
};

/** The `./media` section. */
export const MediaShowcase = () => {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>('2');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  return (
    <Samples>
      <Sample title="MediaItemField, FormMediaItemField">
        <div className="w-full space-y-4">
          <MediaItemField
            label="Logo"
            previewUrl={previewUrl}
            alt=""
            onOpenPicker={() => setPreviewUrl(PLACEHOLDER)}
            onRemove={previewUrl ? () => setPreviewUrl(null) : undefined}
          />
          <BoundMedia />
        </div>
      </Sample>
      <Sample title="MediaPreview, MediaItemPickerDialog">
        <MediaPreview src={PLACEHOLDER} alt="" className="size-24" />
        <MediaPreview src={null} alt="" className="size-24" />
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open media picker
        </Button>
        <MediaItemPickerDialog
          open={open}
          onOpenChange={setOpen}
          title="Choose an image"
          items={TILES}
          selectedId={selectedId}
          onSelect={tile => setSelectedId(tile.id)}
          isLoading={false}
          isFetchingMore={false}
          hasMore={false}
          onLoadMore={() => {}}
        />
      </Sample>
    </Samples>
  );
};
