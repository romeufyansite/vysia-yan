import { useState, useEffect } from 'react';
import { FolderPlus, Loader2, Monitor, Smartphone } from 'lucide-react';
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
import type { Playlist, PlaylistGroup, ScreenOrientation } from '@/types';
import { playlistGroupService } from '@/services/playlist-group.service';
import { toast } from 'sonner';
import { PlaylistScreenAssignmentsSection } from '@/components/playlist-editor/PlaylistScreenAssignmentsSection';

const NEW_GROUP_VALUE = '__new__';
const NO_GROUP_VALUE = '__none__';

interface PlaylistEditorSettingsSidebarProps {
  playlist: Playlist;
  name: string;
  orientation: ScreenOrientation;
  groupId: string | null;
  onNameChange: (name: string) => void;
  onOrientationChange: (orientation: ScreenOrientation) => void;
  onGroupIdChange: (groupId: string | null) => void;
  readOnly?: boolean;
  /** Désactivé lors d'un enregistrement global depuis l'en-tête */
  controlsDisabled?: boolean;
}

export function PlaylistEditorSettingsSidebar({
  playlist,
  name,
  orientation,
  groupId,
  onNameChange,
  onOrientationChange,
  onGroupIdChange,
  readOnly = false,
  controlsDisabled = false,
}: PlaylistEditorSettingsSidebarProps) {
  const [groups, setGroups] = useState<PlaylistGroup[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  const persistedOrientation = playlist.orientation ?? 'landscape';

  useEffect(() => {
    void loadGroups();
  }, [playlist.id]);

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
    onGroupIdChange(value === NO_GROUP_VALUE ? null : value);
  };

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    try {
      setSavingGroup(true);
      const group = await playlistGroupService.create(trimmed);
      setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
      onGroupIdChange(group.id);
      setCreatingGroup(false);
      setNewGroupName('');
      toast.success('Catégorie créée');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erreur lors de la création de la catégorie');
    } finally {
      setSavingGroup(false);
    }
  };

  const disabled = readOnly || controlsDisabled || savingGroup;

  return (
    <aside className="flex h-full min-h-0 w-full shrink-0 flex-col border-t border-slate-200 bg-white lg:w-[380px] lg:border-l lg:border-t-0 xl:w-[420px]">
      <div className="flex-1 space-y-6 overflow-y-auto p-5 lg:p-6">
       

        <section className="space-y-2">
          <Label htmlFor="playlistSidebarName" className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Nom de la playlist
          </Label>
          <Input
            id="playlistSidebarName"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex: Vitrine lobby"
            disabled={disabled}
            className="h-11 rounded-xl border-slate-200 focus-visible:ring-slate-900"
          />
        </section>

        <section className="space-y-3">
          <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">Orientation</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOrientationChange('landscape')}
              className={`group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all disabled:pointer-events-none disabled:opacity-50 ${
                orientation === 'landscape'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Monitor className="h-6 w-6" />
              <span className="text-sm font-medium">Paysage</span>
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOrientationChange('portrait')}
              className={`group flex flex-col items-center gap-2 rounded-xl border p-4 transition-all disabled:pointer-events-none disabled:opacity-50 ${
                orientation === 'portrait'
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="h-6 w-6" />
              <span className="text-sm font-medium">Portrait</span>
            </button>
          </div>
          {orientation !== persistedOrientation ? (
            <p className="text-xs rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              Changer l&apos;orientation peut rendre cette playlist incompatible avec les écrans qui
              l&apos;utilisent déjà.
            </p>
          ) : null}
        </section>

        <section className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wide text-slate-500">Catégorie</Label>
          {creatingGroup && !readOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleCreateGroup();
                  }
                }}
                placeholder="Nom de la catégorie"
                autoFocus
                disabled={disabled}
                className="min-w-[140px] flex-1 h-11 rounded-xl border-slate-200"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-slate-200"
                onClick={() => {
                  setCreatingGroup(false);
                  setNewGroupName('');
                }}
                disabled={savingGroup || controlsDisabled}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800"
                onClick={() => void handleCreateGroup()}
                disabled={savingGroup || controlsDisabled || !newGroupName.trim()}
              >
                {savingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
              </Button>
            </div>
          ) : (
            <Select value={groupId ?? NO_GROUP_VALUE} onValueChange={handleSelectChange} disabled={disabled}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GROUP_VALUE}>
                  <span className="text-slate-500">Sans catégorie</span>
                </SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
                {!readOnly && (
                  <SelectItem value={NEW_GROUP_VALUE}>
                    <span className="flex items-center gap-2 font-medium text-slate-900">
                      <FolderPlus className="h-4 w-4" />
                      Créer une catégorie
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </section>

        <PlaylistScreenAssignmentsSection
          playlistId={playlist.id}
          playlistName={(name.trim() || playlist.name).trim()}
          playlistOrientation={orientation}
          readOnly={readOnly}
        />
      </div>
    </aside>
  );
}
