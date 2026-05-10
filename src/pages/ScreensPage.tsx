import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ListFilter as Filter, FolderOpen, ChevronDown, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScreenCard } from '@/components/screens/ScreenCard';
import { AddScreenCard } from '@/components/screens/AddScreenCard';
import { ConnectScreenModal } from '@/components/screens/ConnectScreenModal';
import { BuyScreensModal } from '@/components/screens/BuyScreensModal';
import { DeleteScreenDialog } from '@/components/screens/DeleteScreenDialog';
import { CreateGroupModal } from '@/components/screens/CreateGroupModal';
import { EditGroupModal } from '@/components/screens/EditGroupModal';
import { DeleteGroupDialog } from '@/components/screens/DeleteGroupDialog';
import { GroupSelectItem } from '@/components/screens/GroupSelectItem';
import { screenService } from '@/services/screen.service';
import { playlistService } from '@/services/playlist.service';
import { screenGroupService } from '@/services/screen-group.service';
import { useMembership } from '@/contexts/MembershipContext';
import type { Screen, Playlist, ScreenGroup } from '@/types';
import { toast } from 'sonner';

export function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [groups, setGroups] = useState<ScreenGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [screenToDelete, setScreenToDelete] = useState<Screen | null>(null);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<ScreenGroup | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<ScreenGroup | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const { can } = useMembership();
  const canManage = can('screens', 'manage');
  const denyManage = () => toast.error("Vous n'avez pas les droits pour gérer les écrans.");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[ScreensPage] Loading data...');
      const [screensData, playlistsData, groupsData] = await Promise.all([
        screenService.getAll(),
        playlistService.getAll(),
        screenGroupService.getAll(),
      ]);
      console.log('[ScreensPage] Data loaded:', { screens: screensData.length, playlists: playlistsData.length, groups: groupsData.length });
      setScreens(screensData);
      setPlaylists(playlistsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('[ScreensPage] Error loading data:', error);
      toast.error('Erreur lors du chargement des données');
    }
  };

  const handleConnect = () => {
    console.log('[ScreensPage] handleConnect called - reloading data');
    loadData();
  };

  const handleCreatePlaylist = () => {
    window.location.hash = '/playlists?create=true';
  };

  const handleStatusChange = async (screenId: string, status: 'online' | 'offline') => {
    try {
      await screenService.update(screenId, { status });
      toast.success('Statut mis à jour');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const openDeleteDialog = (screenId: string) => {
    const screen = screens.find(s => s.id === screenId);
    if (screen) {
      setScreenToDelete(screen);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteScreen = async () => {
    if (!screenToDelete) {
      console.log('[handleDeleteScreen] No screen to delete');
      return;
    }

    console.log('[handleDeleteScreen] Starting deletion for screen:', screenToDelete);

    try {
      await screenService.delete(screenToDelete.id);
      console.log('[handleDeleteScreen] Deletion successful');
      toast.success('Écran supprimé avec succès');
      setDeleteDialogOpen(false);
      setScreenToDelete(null);
      await loadData();
    } catch (error) {
      console.error('[handleDeleteScreen] Error deleting screen:', error);
      toast.error('Erreur lors de la suppression de l\'écran');
    }
  };

  const handleCreateGroup = async (name: string) => {
    try {
      await screenGroupService.create({ name });
      toast.success('Groupe créé avec succès');
      await loadData();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Erreur lors de la création du groupe');
      throw error;
    }
  };

  const handleEditGroup = async (name: string) => {
    if (!groupToEdit) return;
    try {
      await screenGroupService.update(groupToEdit.id, { name });
      toast.success('Groupe modifié avec succès');
      await loadData();
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Erreur lors de la modification du groupe');
      throw error;
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await screenGroupService.delete(groupToDelete.id);
      toast.success('Groupe supprimé avec succès');
      if (selectedGroup === groupToDelete.id) {
        setSelectedGroup('all');
      }
      setDeleteGroupDialogOpen(false);
      setGroupToDelete(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Erreur lors de la suppression du groupe');
    }
  };

  const openEditGroupModal = (group: ScreenGroup) => {
    setGroupToEdit(group);
    setSelectOpen(false);
    setEditGroupModalOpen(true);
  };

  const openDeleteGroupDialog = (group: ScreenGroup) => {
    setGroupToDelete(group);
    setSelectOpen(false);
    setDeleteGroupDialogOpen(true);
  };

  const filteredScreens = screens.filter((screen) => {
    const matchesGroup =
      selectedGroup === 'all' ||
      selectedGroup === 'recent' ||
      selectedGroup === 'my' ||
      screen.group_id === selectedGroup;
    const matchesSearch = screen.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="h-full">
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Écrans</h1>
          <div className="flex gap-3">
            
             <Button variant="outline" className="rounded-xl h-10">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>

            
            
            {canManage && (
              <Button
                variant="outline"
                onClick={() => setBuyModalOpen(true)}
                className="rounded-xl h-10 bg-gray-900 hover:bg-gray-800 text-white hover:text-white"
              >
                <Filter className="h-4 w-4 mr-2" />
                Acheter des écrans
              </Button>
            )}
           
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="mb-6 space-y-4">
          <Select value={selectedGroup} onValueChange={setSelectedGroup} open={selectOpen} onOpenChange={setSelectOpen}>
            <SelectTrigger className="w-64 rounded-xl h-12 bg-white">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-gray-500" />
                <SelectValue placeholder="Sélectionner un groupe" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 mb-1 mt-1" />
                  <Input
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 rounded-lg border-0 bg-gray-50"
                  />
                </div>
              </div>
              <SelectItem value="all" className="rounded-lg">
                <div className="flex items-center justify-between w-full mb-1 mt-1">
                  <span>Tous</span>
                  <span className="text-xs text-gray-400 ml-2">{screens.length}</span>
                </div>
              </SelectItem>
            



{groups.map((group) => (
                <GroupSelectItem
                  key={group.id}
                  group={group}
                  isSelected={selectedGroup === group.id}
                  onEdit={canManage ? openEditGroupModal : undefined}
                  onDelete={canManage ? openDeleteGroupDialog : undefined}
                />
              ))}

              
             
              <div className="border-t mt-2 mb-1" />
              
              
              {canManage && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-sm text-gray-600 rounded-lg mb-1 mt-1"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectOpen(false);
                    setCreateGroupModalOpen(true);
                  }}
                >
                  + Ajouter un groupe
                </Button>
              )}
              
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredScreens.map((screen) => (
            <ScreenCard
              key={screen.id}
              screen={screen}
              onStatusChange={(status) => handleStatusChange(screen.id, status)}
              onPreview={() => toast.info('Aperçu non implémenté')}
              onEdit={() => (window.location.hash = `/screens/${screen.id}`)}
              onDelete={canManage ? () => openDeleteDialog(screen.id) : () => denyManage()}
            />
          ))}
          {canManage && <AddScreenCard onClick={() => setConnectModalOpen(true)} />}
        </div>
      </div>

      <ConnectScreenModal
        open={connectModalOpen}
        onOpenChange={setConnectModalOpen}
        playlists={playlists}
        groups={groups}
        onConnect={handleConnect}
        onCreateGroup={() => setCreateGroupModalOpen(true)}
        onCreatePlaylist={handleCreatePlaylist}
      />

      <CreateGroupModal
        open={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
        onCreateGroup={handleCreateGroup}
      />

      <EditGroupModal
        open={editGroupModalOpen}
        onOpenChange={setEditGroupModalOpen}
        groupName={groupToEdit?.name || ''}
        onEditGroup={handleEditGroup}
      />

      <DeleteGroupDialog
        open={deleteGroupDialogOpen}
        onOpenChange={setDeleteGroupDialogOpen}
        groupName={groupToDelete?.name || ''}
        onConfirm={handleDeleteGroup}
      />

      <BuyScreensModal open={buyModalOpen} onOpenChange={setBuyModalOpen} />

      <DeleteScreenDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        screenName={screenToDelete?.name || ''}
        onConfirm={handleDeleteScreen}
      />

      {screens.length === 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-2xl shadow-lg px-6 py-4 flex items-center gap-4">
          <span className="text-sm">
            Configurez votre premier écran
          </span>
          <Button
            className="rounded-xl bg-gray-900 hover:bg-gray-800"
            onClick={() => window.open('/#/player', '_blank')}
          >
            Connecter un écran
            <ChevronDown className="ml-2 h-4 w-4 rotate-[-90deg]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {}}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}
