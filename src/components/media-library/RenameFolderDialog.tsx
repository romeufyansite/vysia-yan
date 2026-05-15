import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MediaFolder } from '@/types';

interface RenameFolderDialogProps {
  folder: MediaFolder | null;
  onOpenChange: (open: boolean) => void;
  onRename: (folderId: string, newName: string) => void;
}

export function RenameFolderDialog({
  folder,
  onOpenChange,
  onRename,
}: RenameFolderDialogProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (folder) {
      setName(folder.name);
    }
  }, [folder]);

  const handleRename = () => {
    if (folder && name.trim()) {
      onRename(folder.id, name.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={!!folder} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="mb-4">
          <DialogTitle className="text-xl font-medium">Renommer le dossier</DialogTitle>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Nom</Label>
            <Input
              id="folderName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>

          <Button
            onClick={handleRename}
            disabled={!name.trim()}
            className="w-full bg-black text-white hover:bg-gray-800"
          >
            Renommer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
