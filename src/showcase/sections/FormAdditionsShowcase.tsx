'use client';

import { useState } from 'react';

import { ColorValueField, FormDrawer } from '../../form/index.ts';
import { Button } from '../../primitives/index.ts';
import { Sample, Samples } from './PrimitivesShowcase.tsx';

const SWATCHES = ['#0f766e', '#2563eb', '#9333ea', '#e11d48', '#f59e0b', '#64748b'];

/** The form blocks of 0.2.0: the colour value field, the side-by-side drawer. */
export const FormAdditionsShowcase = () => {
  const [color, setColor] = useState<string | null>('#2563eb');
  const [tint, setTint] = useState<string | null>('#0f766e80');
  const [open, setOpen] = useState(false);
  return (
    <Samples>
      <Sample title="ColorValueField (hex, hex with alpha)">
        <div className="grid w-full grid-cols-[minmax(0,1fr)] gap-3">
          <ColorValueField label="Accent colour" format="hex" value={color} onChange={setColor} swatches={SWATCHES} clearable emptyLabel="Auto" />
          <ColorValueField label="Overlay tint" format="hex-alpha" letterCase="upper" value={tint} onChange={setTint} size="sm" />
          <p className="text-xs text-muted-foreground">
            Stored: <code>{String(color)}</code> · <code>{String(tint)}</code>
          </p>
        </div>
      </Sample>
      <Sample title="FormDrawer beside the page (modal false)">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Open beside the page
        </Button>
        <FormDrawer open={open} onClose={() => setOpen(false)} title="Side by side" description="The page stays usable." modal={false}>
          <p className="text-sm text-muted-foreground">No overlay from md up; a click outside keeps it open; Esc and ✕ close it.</p>
        </FormDrawer>
      </Sample>
    </Samples>
  );
};
