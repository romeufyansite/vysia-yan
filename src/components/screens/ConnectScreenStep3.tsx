import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { Playlist, ScreenGroup } from '@/types';

interface ConnectScreenStep3Props {
  name: string;
  playlistId: string;
  groupId: string;
  playlists: Playlist[];
  groups: ScreenGroup[];
  onNameChange: (name: string) => void;
  onPlaylistChange: (id: string) => void;
  onGroupChange: (id: string) => void;
  onCreatePlaylist: () => void;
  onCreateGroup: () => void;
}

export function ConnectScreenStep3({
  name,
  playlistId,
  groupId,
  playlists,
  groups,
  onNameChange,
  onPlaylistChange,
  onGroupChange,
  onCreatePlaylist,
  onCreateGroup,
}: ConnectScreenStep3Props) {
  return (
    <div className="space-y-6">
      <h3 className="text-blue-600 text-center text-lg font-medium">
        3 - Configuration de l'écran
      </h3>

      <div className="space-y-4 mt-8">
        <div className="space-y-2">
          <Label htmlFor="screen-name" className="text-base font-medium">
            Nom de l'écran
          </Label>
          <Input
            id="screen-name"
            placeholder="Entrez un nom descriptif"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-12 rounded-xl border-gray-300 text-base focus-visible:ring-blue-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="playlist" className="text-base font-medium">
            Playlist
          </Label>
          <Select value={playlistId} onValueChange={onPlaylistChange}>
            <SelectTrigger id="playlist" className="h-12 rounded-xl border-gray-300 text-base">
              <SelectValue placeholder="Sélectionner une playlist" />
            </SelectTrigger>
            <SelectContent>
              {playlists.map((playlist) => (
                <SelectItem key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </SelectItem>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start text-sm text-gray-600 mt-1 hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault();
                  onCreatePlaylist();
                }}
              >
                + Créer une playlist
              </Button>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="group" className="text-base font-medium">
            Groupe d'écrans
          </Label>
          <Select value={groupId} onValueChange={onGroupChange}>
            <SelectTrigger id="group" className="h-12 rounded-xl border-gray-300 text-base">
              <SelectValue placeholder="Aucun groupe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun groupe</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-start text-sm text-gray-600 mt-1 hover:bg-gray-100"
                onClick={(e) => {
                  e.preventDefault();
                  onCreateGroup();
                }}
              >
                + Nouveau groupe
              </Button>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
