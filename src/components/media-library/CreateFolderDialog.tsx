import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateFolderDialogProps) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="mb-4">
          <DialogTitle className="text-xl font-medium">Nouveau dossier</DialogTitle>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Nom</Label>
            <Input
              id="folderName"
              placeholder="Mon dossier"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreate();
                }
              }}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            Créer le dossier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
