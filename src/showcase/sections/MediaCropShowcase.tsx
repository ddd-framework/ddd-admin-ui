'use client';

import { useState } from 'react';

import type { CropAspectOption } from '../../logic/pure/imageCrop.ts';
import { ImageCropDialog, type ImageCropResult } from '../../media/ImageCropDialog.tsx';
import { Button } from '../../primitives/index.ts';

const ASPECTS: readonly CropAspectOption[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: 'square', label: 'Square', ratio: 1 },
  { id: 'wide', label: '16:9', ratio: 16 / 9, translate: false },
  { id: 'round', label: 'Round', ratio: 1, round: true },
];

/** A neutral sample picture drawn in the browser (PNG with a transparent corner), so nothing loads from the network. */
const drawSample = (): Promise<Blob | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.fillStyle = '#94a3b8';
  context.fillRect(0, 0, 960, 640);
  context.fillStyle = '#e2e8f0';
  context.beginPath();
  context.arc(300, 220, 90, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(0, 640);
  context.lineTo(340, 330);
  context.lineTo(560, 520);
  context.lineTo(720, 400);
  context.lineTo(960, 600);
  context.lineTo(960, 640);
  context.fill();
  context.clearRect(860, 0, 100, 100);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
};

/** The crop surface of `./media`: opens on a generated picture and shows what it answered. */
export const MediaCropShowcase = () => {
  const [file, setFile] = useState<Blob | null>(null);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<string>('—');

  const describe = (result: ImageCropResult) =>
    result.kind === 'skipped'
      ? `skipped (${result.file.type}, ${result.file.size} bytes)`
      : `cropped ${result.aspectId}: ${result.width} × ${result.height} ${result.type}, ${result.blob.size} bytes`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          setFile(await drawSample());
          setOpen(true);
        }}
      >
        Crop an image
      </Button>
      <p className="text-sm text-muted-foreground" data-showcase-crop-answer>
        Answer: {answer}
      </p>
      <ImageCropDialog
        open={open}
        file={file}
        aspectOptions={ASPECTS}
        allowSkip
        output={{ maxWidth: 512, maxHeight: 512 }}
        onResult={result => {
          setAnswer(describe(result));
          setOpen(false);
        }}
        onCancel={() => {
          setAnswer('cancelled');
          setOpen(false);
        }}
      />
    </div>
  );
};
