import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface EditGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  onEditGroup: (name: string) => Promise<void>;
}

export function EditGroupModal({
  open,
  onOpenChange,
  groupName,
  onEditGroup,
}: EditGroupModalProps) {
  const [newName, setNewName] = useState(groupName);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setNewName(groupName);
  }, [groupName]);

  const handleUpdate = async () => {
    if (!newName.trim()) return;

    setIsUpdating(true);
    try {
      await onEditGroup(newName.trim());
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newName.trim()) {
      handleUpdate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le groupe</DialogTitle>
          <DialogDescription>
            Modifiez le nom du groupe d'écrans
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nom du groupe</Label>
            <Input
              id="edit-name"
              placeholder="Ex: Magasin Paris, Bureau..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-xl"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleUpdate}
            disabled={!newName.trim() || isUpdating}
            className="rounded-xl bg-gray-900 hover:bg-gray-800"
          >
            {isUpdating ? 'Modification...' : 'Modifier'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
