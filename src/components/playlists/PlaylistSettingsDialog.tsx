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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderPlus, Loader as Loader2, Monitor, Smartphone } from 'lucide-react';
import type { PlaylistGroup, ScreenOrientation } from '@/types';
import { playlistGroupService } from '@/services/playlist-group.service';
import { toast } from 'sonner';

interface PlaylistSettings {
  name: string;
  orientation: ScreenOrientation;
  group_id: string | null;
}

interface PlaylistSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: PlaylistSettings) => void;
  initialSettings?: Partial<PlaylistSettings>;
}

const NEW_GROUP_VALUE = '__new__';
const NO_GROUP_VALUE = '__none__';

export function PlaylistSettingsDialog({
  open,
  onOpenChange,
  onSave,
  initialSettings,
}: PlaylistSettingsDialogProps) {
  const [name, setName] = useState('Nouvelle playlist');
  const [orientation, setOrientation] = useState<ScreenOrientation>('landscape');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<PlaylistGroup[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  useEffect(() => {
    if (open) loadGroups();
  }, [open]);

  useEffect(() => {
    if (initialSettings) {
      setName(initialSettings.name || 'Nouvelle playlist');
      setOrientation(initialSettings.orientation || 'landscape');
      setGroupId(initialSettings.group_id ?? null);
    } else {
      setName('Nouvelle playlist');
      setOrientation('landscape');
      setGroupId(null);
    }
    setCreatingGroup(false);
    setNewGroupName('');
  }, [initialSettings, open]);

  const loadGroups = async () => {
    try {
      const data = await playlistGroupService.getAll();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleSelectChange = (value: string) => {
    if (value === NEW_GROUP_VALUE) {
      setCreatingGroup(true);
      return;
    }
    setGroupId(value === NO_GROUP_VALUE ? null : value);
  };

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    try {
      setSavingGroup(true);
      const group = await playlistGroupService.create(trimmed);
      setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
      setGroupId(group.id);
      setCreatingGroup(false);
      setNewGroupName('');
      toast.success('Catégorie créée');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erreur lors de la création de la Catégorie');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleSave = () => {
    onSave({
      name: name.trim() || 'Nouvelle playlist',
      orientation,
      group_id: groupId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium text-slate-900">
            Paramètres de la playlist
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Nommez votre playlist, choisissez son orientation et assignez-la à une Catégorie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="playlistName" className="text-sm font-medium text-slate-700">
              Nom
            </Label>
            <Input
              id="playlistName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vitrine lobby"
              className="h-11 rounded-xl border-slate-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Orientation</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all text-left ${
                  orientation === 'landscape'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                    orientation === 'landscape' ? 'bg-white/15' : 'bg-slate-100'
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Paysage</div>
                  <div className={`text-xs ${orientation === 'landscape' ? 'text-white/60' : 'text-slate-400'}`}>
                    16:9
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all text-left ${
                  orientation === 'portrait'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 ${
                    orientation === 'portrait' ? 'bg-white/15' : 'bg-slate-100'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Portrait</div>
                  <div className={`text-xs ${orientation === 'portrait' ? 'text-white/60' : 'text-slate-400'}`}>
                    9:16
                  </div>
                </div>
              </button>
            </div>
            {initialSettings?.orientation && orientation !== initialSettings.orientation && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Changer l'orientation peut rendre cette playlist incompatible avec les écrans auxquels elle est déjà assignée.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Catégorie</Label>

            {creatingGroup ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateGroup();
                    }
                  }}
                  placeholder="Nom de la Catégorie"
                  autoFocus
                  className="h-11 rounded-xl border-slate-200"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-slate-200"
                  onClick={() => {
                    setCreatingGroup(false);
                    setNewGroupName('');
                  }}
                  disabled={savingGroup}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800"
                  onClick={handleCreateGroup}
                  disabled={savingGroup || !newGroupName.trim()}
                >
                  {savingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
                </Button>
              </div>
            ) : (
              <Select
                value={groupId ?? NO_GROUP_VALUE}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GROUP_VALUE}>
                    <span className="text-slate-500">Aucune Catégorie</span>
                  </SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_GROUP_VALUE}>
                    <span className="flex items-center gap-2 text-slate-900 font-medium">
                      <FolderPlus className="h-4 w-4" />
                      Créer une Catégorie
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 h-11 rounded-xl border-slate-200"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800"
          >
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
