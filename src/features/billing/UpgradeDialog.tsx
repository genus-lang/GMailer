import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Pricing } from './Pricing';
import { useStore } from '../../store/useStore';

export const UpgradeDialog = () => {
  const { isUpgradeDialogOpen, setUpgradeDialogOpen } = useStore();

  return (
    <Dialog open={isUpgradeDialogOpen} onOpenChange={(isOpen) => setUpgradeDialogOpen(isOpen, null)}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <DialogHeader className="sr-only">
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>Unlock premium features by upgrading to GMailer+</DialogDescription>
        </DialogHeader>
        <Pricing />
      </DialogContent>
    </Dialog>
  );
};
