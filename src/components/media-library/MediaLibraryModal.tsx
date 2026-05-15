import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FolderPlus, Plus, MoveVertical as MoreVertical, CreditCard as Edit2, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mediaLibraryService } from '@/services/media-library.service';
import { toast } from 'sonner';
import type { MediaAsset, MediaFolder } from '@/types';
import { CreateFolderDialog } from './CreateFolderDialog';
import { RenameFolderDialog } from './RenameFolderDialog';
import { UploadAssetsDialog } from './UploadAssetsDialog';
import { MediaAssetCard } from './MediaAssetCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMembership } from '@/contexts/MembershipContext';

interface MediaLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAsset?: (asset: MediaAsset) => void;
  selectionMode?: boolean;
}

export function MediaLibraryModal({
  open,
  onOpenChange,
  onSelectAsset,
  selectionMode = false,
}: MediaLibraryModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [renamingFolder, setRenamingFolder] = useState<MediaFolder | null>(null);
  const { can } = useMembership();
  const canManage = can('media_library', 'manage');

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, currentFolderId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assetsData, foldersData] = await Promise.all([
        mediaLibraryService.getAssets(currentFolderId),
        mediaLibraryService.getFolders(currentFolderId),
      ]);
      setAssets(assetsData);
      setFolders(foldersData);
      setPage(1);
    } catch (error) {
      console.error('Error loading media library:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await mediaLibraryService.createFolder(name, currentFolderId);
      toast.success('Dossier créé');
      setCreateFolderOpen(false);
      loadData();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Erreur lors de la création du dossier');
    }
  };

  const handleUpload = async (files: File[]) => {
    try {
      for (const file of files) {
        const fileUrl = await mediaLibraryService.uploadFile(file);

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        let width: number | undefined;
        let height: number | undefined;

        if (isImage) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = () => {
              width = img.width;
              height = img.height;
              resolve(null);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });
        }

        await mediaLibraryService.createAsset({
          name: file.name,
          file_url: fileUrl,
          file_type: isImage ? 'image' : isVideo ? 'video' : 'document',
          file_size: file.size,
          mime_type: file.type,
          folder_id: currentFolderId,
          width,
          height,
        });
      }

      toast.success(`${files.length} fichier(s) téléchargé(s)`);
      setUploadOpen(false);
      loadData();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      await mediaLibraryService.updateFolder(folderId, { name: newName });
      toast.success('Dossier renommé');
      loadData();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Erreur lors du renommage');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await mediaLibraryService.deleteFolder(folderId);
      toast.success('Dossier supprimé');
      loadData();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      await mediaLibraryService.deleteAsset(id);
      toast.success('Asset supprimé');
      loadData();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSelectAsset = (asset: MediaAsset) => {
    if (onSelectAsset) {
      onSelectAsset(asset);
      onOpenChange(false);
    }
  };

  const sortedAssets = useMemo(() => {
    const sorted = [...assets];
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
      return sorted;
    }
    if (sortBy === 'size') {
      sorted.sort((a, b) => b.file_size - a.file_size);
      return sorted;
    }
    sorted.sort((a, b) => {
      const aDate = new Date(a.created_at ?? 0).getTime();
      const bDate = new Date(b.created_at ?? 0).getTime();
      return bDate - aDate;
    });
    return sorted;
  }, [assets, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedAssets.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssets = sortedAssets.slice(startIndex, endIndex);
  const pageStart = sortedAssets.length === 0 ? 0 : startIndex + 1;
  const pageEnd = Math.min(endIndex, sortedAssets.length);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-hidden p-0">
          <div className="flex min-h-0 flex-col h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <DialogTitle className="text-xl font-medium">Médiathèque</DialogTitle>

              <div className="flex items-center gap-2">
                {canManage && (
                  <>
                    <Button
                      onClick={() => setUploadOpen(true)}
                      className="bg-black text-white hover:bg-gray-800"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Télécharger des fichiers
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCreateFolderOpen(true)}
                      size="sm"
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Nouveau dossier
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 px-6 pt-4">
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-lg font-medium">Fichiers</h2>

                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    {pageStart}-{pageEnd} sur {sortedAssets.length}
                  </div>
                  <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 / page</SelectItem>
                      <SelectItem value="24">24 / page</SelectItem>
                      <SelectItem value="48">48 / page</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={sortBy}
                    onValueChange={(value: 'date' | 'name' | 'size') => {
                      setSortBy(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="name">Nom</SelectItem>
                      <SelectItem value="size">Taille</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-8">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="relative group border rounded-lg hover:bg-gray-50"
                    >
                      <button
                        onClick={() => setCurrentFolderId(folder.id)}
                        className="w-full p-4 text-left"
                      >
                        <FolderPlus className="h-8 w-8 text-yellow-500 mb-2" />
                        <p className="font-medium truncate">{folder.name}</p>
                        <p className="text-xs text-gray-500">0 assets</p>
                      </button>
                      {canManage && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingFolder(folder);
                              }}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Renommer
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Voulez-vous vraiment supprimer ce dossier ?')) {
                                  handleDeleteFolder(folder.id);
                                }
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      )}
                    </div>
                  ))}

                  {currentAssets.map((asset) => (
                    <MediaAssetCard
                      key={asset.id}
                      asset={asset}
                      onDelete={canManage ? handleDeleteAsset : undefined}
                      onSelect={selectionMode ? handleSelectAsset : undefined}
                    />
                  ))}
                </div>
              )}

              {!loading && assets.length === 0 && folders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Aucun média dans ce dossier</p>
                  {canManage && (
                    <Button
                      onClick={() => setUploadOpen(true)}
                      className="mt-4"
                      variant="outline"
                    >
                      Télécharger des fichiers
                    </Button>
                  )}
                </div>
              )}
            </div>

            {!loading && sortedAssets.length > 0 && (
              <div className="shrink-0 border-t px-6 py-3">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreate={handleCreateFolder}
      />

      <RenameFolderDialog
        folder={renamingFolder}
        onOpenChange={(open) => !open && setRenamingFolder(null)}
        onRename={handleRenameFolder}
      />

      <UploadAssetsDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleUpload}
      />
    </>
  );
}
