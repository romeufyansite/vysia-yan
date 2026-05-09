import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface DeletePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistName: string;
  usedByScreens: string[];
  onConfirm: () => void;
}

export function DeletePlaylistDialog({
  open,
  onOpenChange,
  playlistName,
  usedByScreens,
  onConfirm,
}: DeletePlaylistDialogProps) {
  const [confirmChecked, setConfirmChecked] = useState(false);
  const isUsed = usedByScreens.length > 0;

  useEffect(() => {
    if (!open) {
      setConfirmChecked(false);
    }
  }, [open]);

  const handleConfirm = () => {
    if (isUsed && !confirmChecked) return;
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Supprimer la playlist
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Êtes-vous sûr de vouloir supprimer la playlist{' '}
            <span className="font-semibold text-gray-900">{playlistName}</span> ?
          </DialogDescription>
        </DialogHeader>

        {isUsed && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <p className="text-sm text-amber-900 font-medium">
              Cette playlist est actuellement utilisée sur {usedByScreens.length}{' '}
              écran{usedByScreens.length > 1 ? 's' : ''} :
            </p>
            <ul className="text-sm text-amber-800 space-y-1 ml-4">
              {usedByScreens.map((screenName, index) => (
                <li key={index} className="list-disc">
                  {screenName}
                </li>
              ))}
            </ul>
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="confirm"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
                className="mt-0.5"
              />
              <Label
                htmlFor="confirm"
                className="text-sm text-amber-900 font-normal cursor-pointer leading-tight"
              >
                Je comprends que cette playlist sera supprimée et ne sera plus disponible
                sur ces écrans
              </Label>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isUsed && !confirmChecked}
            className="rounded-xl bg-red-600 hover:bg-red-700"
          >
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
