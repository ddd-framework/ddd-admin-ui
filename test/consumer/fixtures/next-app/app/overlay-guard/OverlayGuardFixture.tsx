'use client';

// The navigation guard against overlays a host keeps mounted while closed (0.3.11): a controlled dialog and a sheet
// whose content components stay in the tree with open={false}. Only an open one may count as an open overlay.
import { useState } from 'react';
import { canNavigate } from '@mgamadeus/ddd-admin-ui/logic';
import { Button, Dialog, DialogContent, DialogTitle, Sheet, SheetContent, SheetTitle } from '@mgamadeus/ddd-admin-ui/primitives';

export function OverlayGuardFixture() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [guardAnswer, setGuardAnswer] = useState('');
  const readGuard = () => {
    const decision = canNavigate();
    setGuardAnswer(`${decision.allowed ? 'allowed' : `refused:${decision.reason}`}|${decision.openOverlays.length}`);
  };
  return (
    <main className="p-6">
      <Button id="open-dialog" onClick={() => setDialogOpen(true)}>Open dialog</Button>
      <Button id="open-sheet" onClick={() => setSheetOpen(true)}>Open sheet</Button>
      <Button id="read-guard" onClick={readGuard}>Read guard</Button>
      <output id="guard-answer">{guardAnswer}</output>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Kept-mounted dialog</DialogTitle>
          <Button id="dialog-read-guard" onClick={readGuard}>Read guard in dialog</Button>
          <output id="dialog-guard-answer">{guardAnswer}</output>
        </DialogContent>
      </Dialog>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetTitle>Kept-mounted sheet</SheetTitle>
        </SheetContent>
      </Sheet>
    </main>
  );
}
