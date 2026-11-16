'use client';

// T7: a package select inside a package dialog inside a package sheet.
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@mgamadeus/ddd-admin-ui/primitives';

export function NestedOverlays() {
  const [value, setValue] = useState('');
  return (
    <Sheet defaultOpen>
      <SheetContent aria-describedby={undefined}>
        <SheetTitle>Sheet</SheetTitle>
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Dialog</DialogTitle>
            <DialogDescription>Pick a value.</DialogDescription>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger id="nested-trigger">
                <SelectValue placeholder="Pick" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">Alpha</SelectItem>
                <SelectItem value="beta">Beta</SelectItem>
              </SelectContent>
            </Select>
            <output id="nested-value">{value}</output>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
