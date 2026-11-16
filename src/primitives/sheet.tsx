'use client';

import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from './cn.ts';
import { usePortalContainer } from './portalContainer.tsx';

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

export const SheetTitle = ({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) => (
  <SheetPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />
);

/** Side panel on the overlay layer (`--layer-overlay`), portalled into the provider's container. */
export const SheetContent = ({ className, children, ...props }: ComponentProps<typeof SheetPrimitive.Content>) => {
  const container = usePortalContainer();
  return (
    <SheetPrimitive.Portal container={container}>
      <SheetPrimitive.Overlay className="fixed inset-0 z-(--layer-overlay) bg-black/50" />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'fixed inset-y-0 right-0 z-(--layer-overlay) flex h-full w-3/4 max-w-sm flex-col gap-4 border-l bg-background p-6 shadow-lg',
          className,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
};
