import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader as Loader2 } from 'lucide-react';
import { playlistGroupService } from '@/services/playlist-group.service';
import { toast } from 'sonner';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateGroupDialog({ open, onOpenChange, onCreated }: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      setSaving(true);
      await playlistGroupService.create(trimmed);
      toast.success('Groupe créé');
      onCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erreur lors de la création du groupe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-slate-900">
            Nouveau groupe
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Organisez vos playlists en les regroupant par thème, localisation ou usage.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="groupName" className="text-sm font-medium text-slate-700">
            Nom du groupe
          </Label>
          <Input
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Ex: Restaurant, Accueil, Promotions"
            autoFocus
            className="h-11 rounded-xl border-slate-200"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border-slate-200"
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
