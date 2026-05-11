import { useState } from 'react';
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
import { Plus, Pencil, Trash2, X, Check, Folder } from 'lucide-react';
import { playlistGroupService } from '@/services/playlist-group.service';
import type { PlaylistGroup } from '@/types';
import { toast } from 'sonner';

interface ManageGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PlaylistGroup[];
  onGroupsUpdated: () => void;
}

export function ManageGroupsDialog({
  open,
  onOpenChange,
  groups,
  onGroupsUpdated,
}: ManageGroupsDialogProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroup, setEditingGroup] = useState<PlaylistGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingGroup, setDeletingGroup] = useState<PlaylistGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;

    try {
      setSaving(true);
      await playlistGroupService.create(trimmed);
      toast.success('catégorie créée');
      setNewGroupName('');
      onGroupsUpdated();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erreur lors de la création de la catégorie');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (group: PlaylistGroup) => {
    setEditingGroup(group);
    setEditName(group.name);
  };

  const cancelEditing = () => {
    setEditingGroup(null);
    setEditName('');
  };

  const handleUpdate = async () => {
    if (!editingGroup || !editName.trim()) return;

    try {
      setSaving(true);
      await playlistGroupService.update(editingGroup.id, editName.trim());
      toast.success('catégorie mise à jour');
      setEditingGroup(null);
      setEditName('');
      onGroupsUpdated();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingGroup) return;

    try {
      setSaving(true);
      await playlistGroupService.delete(deletingGroup.id);
      toast.success('catégorie supprimée');
      setDeletingGroup(null);
      onGroupsUpdated();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-slate-900">
          Catégories
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Gérez vos catégories de playlists : créez, modifiez ou supprimez des catégories.
          </DialogDescription>
        </DialogHeader>

        {/* Create New Group */}
        <div className="space-y-3 py-4 border-b border-slate-100">
          <Label htmlFor="newGroupName" className="text-sm font-medium text-slate-700">
            Nouvelle catégorie
          </Label>
          <div className="flex gap-2">
            <Input
              id="newGroupName"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Ex: Restaurant, Accueil, Promotions"
              className="h-11 rounded-xl border-slate-200 flex-1"
            />
            <Button
              onClick={handleCreate}
              disabled={saving || !newGroupName.trim()}
              className="h-11 rounded-xl bg-slate-900 hover:bg-slate-800 px-4"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Existing Groups List */}
        <div className="flex-1 overflow-y-auto py-2 -mx-6 px-6">
          <Label className="text-sm font-medium text-slate-700 mb-3 block">
          catégories existantes ({groups.length})
          </Label>

          {groups.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Folder className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Aucune catégorie créé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all"
                >
                  {editingGroup?.id === group.id ? (
                    // Edit mode
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUpdate();
                          }
                          if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        className="h-10 rounded-lg border-slate-200 flex-1"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleUpdate}
                          disabled={saving || !editName.trim()}
                          className="h-9 w-9 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEditing}
                          className="h-9 w-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : deletingGroup?.id === group.id ? (
                    // Delete confirmation mode
                    <>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          Supprimer &quot;{group.name}&quot; ?
                        </p>
                        <p className="text-xs text-slate-500">
                          Les playlists seront déplacées dans &quot;Sans catégorie&quot;
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleDelete}
                          disabled={saving}
                          className="h-9 w-9 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingGroup(null)}
                          className="h-9 w-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    // View mode
                    <>
                      <Folder className="h-5 w-5 text-slate-400 flex-shrink-0" />
                      <span className="flex-1 font-medium text-slate-900 truncate">
                        {group.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(group)}
                          className="h-9 w-9 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingGroup(group)}
                          className="h-9 w-9 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 rounded-xl border-slate-200 px-6"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
